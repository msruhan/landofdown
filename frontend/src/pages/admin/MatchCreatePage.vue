<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { playersApi, heroesApi, rolesApi, matchesApi, screenshotsApi } from '@/services/api'
import type { Player, Hero, Role, MatchPlayerPayload } from '@/types'

const router = useRouter()
const players = ref<Player[]>([])
const heroes = ref<Hero[]>([])
const roles = ref<Role[]>([])
const saving = ref(false)
const error = ref('')

const matchDate = ref(new Date().toISOString().slice(0, 10))
const duration = ref('')
const teamAName = ref('Team A')
const teamBName = ref('Team B')
const winner = ref<'team_a' | 'team_b'>('team_a')
const notes = ref('')
const screenshotPath = ref('')
const screenshotPreview = ref('')
const screenshotUploading = ref(false)

interface PlayerRow {
  player_id: number | null
  hero_id: number | null
  role_id: number | null
  kills: number
  deaths: number
  assists: number
  rating: number
  medal: 'mvp_win' | 'mvp_lose' | 'gold' | 'silver' | 'bronze' | null
}

function emptyRow(): PlayerRow {
  return { player_id: null, hero_id: null, role_id: null, kills: 0, deaths: 0, assists: 0, rating: 0, medal: null }
}

const teamAPlayers = ref<PlayerRow[]>(Array.from({ length: 5 }, emptyRow))
const teamBPlayers = ref<PlayerRow[]>(Array.from({ length: 5 }, emptyRow))

function normalizeList<T>(payload: T[] | { data?: T[] }): T[] {
  return Array.isArray(payload) ? payload : (payload.data ?? [])
}

onMounted(async () => {
  try {
    const [pRes, hRes, rRes] = await Promise.all([
      playersApi.getPlayers({ per_page: 200 }),
      heroesApi.getHeroes({ per_page: 200 }),
      rolesApi.getRoles({ per_page: 100 }),
    ])
    players.value = normalizeList<Player>(pRes.data as Player[] | { data?: Player[] })
    heroes.value = normalizeList<Hero>(hRes.data as Hero[] | { data?: Hero[] })
    roles.value = normalizeList<Role>(rRes.data as Role[] | { data?: Role[] })
  } catch {
    error.value = 'Failed to load form data'
  }
})

function toStorageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `http://localhost:8000/storage/${path.replace(/^\/+/, '')}`
}

function getUploadedPath(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const raw = payload as Record<string, unknown>
  const nested = (raw.data && typeof raw.data === 'object') ? (raw.data as Record<string, unknown>) : null
  const filePath = raw.file_path ?? nested?.file_path
  return typeof filePath === 'string' ? filePath : null
}

async function compressImageForUpload(file: File, maxBytes = 1_800_000): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size <= maxBytes) return file

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(image, 0, 0)

  let quality = 0.9
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  }

  if (!blob) return file
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
}

async function handleScreenshotChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selectedFile = input.files?.[0]
  if (!selectedFile) return

  screenshotUploading.value = true
  error.value = ''
  try {
    const uploadFile = await compressImageForUpload(selectedFile)
    const res = await screenshotsApi.upload(uploadFile)
    const uploadedPath = getUploadedPath(res.data)
    if (!uploadedPath) {
      throw new Error('Uploaded path not found in response')
    }
    screenshotPath.value = uploadedPath
    screenshotPreview.value = toStorageUrl(uploadedPath)
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string; ocr_message?: string } } })?.response?.data?.message
      || (e as { response?: { data?: { message?: string; ocr_message?: string } } })?.response?.data?.ocr_message
      || 'Failed to upload screenshot'
  } finally {
    screenshotUploading.value = false
    input.value = ''
  }
}

function clearScreenshot() {
  screenshotPath.value = ''
  screenshotPreview.value = ''
}

function buildPlayers(rows: PlayerRow[], team: 'team_a' | 'team_b'): MatchPlayerPayload[] {
  return rows
    .filter(r => r.player_id && r.hero_id && r.role_id)
    .map(r => ({
      player_id: r.player_id!,
      hero_id: r.hero_id!,
      role_id: r.role_id!,
      team,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      rating: r.rating,
      medal: r.medal,
    }))
}

async function handleSubmit() {
  error.value = ''
  const allPlayers = [...buildPlayers(teamAPlayers.value, 'team_a'), ...buildPlayers(teamBPlayers.value, 'team_b')]

  if (allPlayers.length < 2) {
    error.value = 'Please add at least 1 player per team'
    return
  }

  saving.value = true
  try {
    await matchesApi.createMatch({
      match_date: matchDate.value,
      duration: duration.value || undefined,
      team_a_name: teamAName.value,
      team_b_name: teamBName.value,
      winner: winner.value,
      notes: notes.value || undefined,
      screenshot_path: screenshotPath.value || undefined,
      players: allPlayers,
    })
    router.push('/admin/dashboard')
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create match'
  } finally {
    saving.value = false
  }
}

const medals = [
  { value: null, label: 'None' },
  { value: 'mvp_win', label: 'MVP Win' },
  { value: 'mvp_lose', label: 'MVP Lose' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
]
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Input Match Result</h1>
      <p class="page-subtitle">Manually enter a match result with all player details</p>
    </div>

    <div v-if="error" class="error-banner mb-lg">{{ error }}</div>

    <form @submit.prevent="handleSubmit">
      <!-- Match Info -->
      <div class="card mb-lg">
        <h3 class="mb-md">Match Information</h3>
        <div class="match-info-grid">
          <div class="form-group">
            <label class="form-label">Match Date</label>
            <input v-model="matchDate" type="date" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Duration</label>
            <input v-model="duration" type="text" class="form-input" placeholder="e.g. 15:30">
          </div>
          <div class="form-group">
            <label class="form-label">Team A Name</label>
            <input v-model="teamAName" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Team B Name</label>
            <input v-model="teamBName" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Winner</label>
            <select v-model="winner" class="form-select" required>
              <option value="team_a">{{ teamAName }}</option>
              <option value="team_b">{{ teamBName }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Screenshot</label>
            <input type="file" accept="image/*" class="form-input" @change="handleScreenshotChange">
            <small class="text-muted" v-if="screenshotUploading">Uploading screenshot...</small>
          </div>
        </div>
        <div v-if="screenshotPreview" class="screenshot-preview mt-md">
          <img :src="screenshotPreview" alt="Match screenshot preview" class="screenshot-preview__img">
          <button type="button" class="btn btn-secondary btn-sm" @click="clearScreenshot">Remove Screenshot</button>
        </div>
      </div>

      <!-- Team Inputs -->
      <div class="teams-input">
        <div v-for="(team, teamKey) in [{ name: teamAName, players: teamAPlayers, label: 'team_a', display: 'A' }, { name: teamBName, players: teamBPlayers, label: 'team_b', display: 'B' }]" :key="teamKey" class="team-input card">
          <h3 class="mb-md" :class="winner === team.label ? 'text-green' : ''">{{ team.name }} (Team {{ team.display }})</h3>
          <div class="player-row-head">
            <span class="player-row-head__num">#</span>
            <span class="player-row-head__cell">Player</span>
            <span class="player-row-head__cell">Hero</span>
            <span class="player-row-head__cell">Role</span>
            <span class="player-row-head__cell player-row-head__kda">Kill / Death / Assist</span>
            <span class="player-row-head__rating">Rating</span>
            <span class="player-row-head__medal">Medal</span>
          </div>
          <div v-for="(row, idx) in team.players" :key="idx" class="player-row">
            <span class="player-row__num">#{{ idx + 1 }}</span>
            <select v-model="row.player_id" class="form-select">
              <option :value="null">Player...</option>
              <option v-for="p in players" :key="p.id" :value="p.id">{{ p.username }}</option>
            </select>
            <select v-model="row.hero_id" class="form-select">
              <option :value="null">Hero...</option>
              <option v-for="h in heroes" :key="h.id" :value="h.id">{{ h.name }}</option>
            </select>
            <select v-model="row.role_id" class="form-select">
              <option :value="null">Role...</option>
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
            <div class="kda-inputs">
              <input v-model.number="row.kills" type="number" class="form-input kda-input" placeholder="K" min="0">
              <input v-model.number="row.deaths" type="number" class="form-input kda-input" placeholder="D" min="0">
              <input v-model.number="row.assists" type="number" class="form-input kda-input" placeholder="A" min="0">
            </div>
            <input v-model.number="row.rating" type="number" class="form-input rating-input" placeholder="Rating" step="0.1" min="0" max="20">
            <select v-model="row.medal" class="form-select medal-select">
              <option v-for="m in medals" :key="String(m.value)" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="card mt-lg">
        <div class="form-group">
          <label class="form-label">Notes (optional)</label>
          <textarea v-model="notes" class="form-textarea" placeholder="Any additional notes about this match..."></textarea>
        </div>
      </div>

      <!-- Submit -->
      <div class="mt-lg" style="display: flex; gap: 12px;">
        <button type="submit" class="btn btn-primary btn-lg" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Match' }}
        </button>
        <router-link to="/admin/dashboard" class="btn btn-secondary btn-lg">Cancel</router-link>
      </div>
    </form>
  </div>
</template>

<style scoped>
.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--danger);
  padding: 12px 20px;
  border-radius: var(--radius-md);
}

.match-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.teams-input {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.player-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.player-row-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 0 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.player-row-head__num,
.player-row-head__cell,
.player-row-head__rating,
.player-row-head__medal {
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.player-row-head__num {
  width: 28px;
  flex-shrink: 0;
}

.player-row-head__cell {
  flex: 1;
  min-width: 100px;
}

.player-row-head__kda {
  max-width: 170px;
  text-align: center;
}

.player-row-head__rating {
  width: 80px;
  text-align: center;
}

.player-row-head__medal {
  min-width: 90px;
  max-width: 100px;
  text-align: center;
}

.player-row__num {
  font-family: var(--font-heading);
  font-weight: 700;
  color: var(--text-muted);
  width: 28px;
  flex-shrink: 0;
}

.player-row .form-select {
  flex: 1;
  min-width: 100px;
}

.kda-inputs {
  display: flex;
  gap: 4px;
}

.kda-input {
  width: 52px !important;
  min-width: 52px;
  text-align: center;
  padding: 8px 4px !important;
}

.rating-input {
  width: 80px !important;
  min-width: 80px;
}

.medal-select {
  min-width: 90px;
  max-width: 100px;
}

.screenshot-preview {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-direction: column;
}

.screenshot-preview__img {
  max-width: 340px;
  max-height: 200px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  object-fit: cover;
}

@media (max-width: 1024px) {
  .teams-input {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .player-row {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: var(--radius-md);
  }

  .player-row-head {
    display: none;
  }

  .player-row .form-select,
  .rating-input,
  .medal-select {
    width: 100% !important;
    max-width: 100%;
  }

  .kda-inputs {
    width: 100%;
  }

  .kda-input {
    flex: 1;
    width: auto !important;
  }
}
</style>
