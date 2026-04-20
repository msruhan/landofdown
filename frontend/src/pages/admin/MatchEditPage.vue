<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { matchesApi, playersApi, heroesApi, rolesApi, screenshotsApi } from '@/services/api'
import type { Player, Hero, Role, MatchPlayerPayload, GameMatch } from '@/types'

const route = useRoute()
const router = useRouter()
const matchId = computed(() => Number(route.params.id))

const players = ref<Player[]>([])
const heroes = ref<Hero[]>([])
const roles = ref<Role[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const matchDate = ref('')
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

function normalizeItem<T>(payload: T | { data?: T }): T {
  return (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>))
    ? ((payload as { data?: T }).data as T)
    : (payload as T)
}

const medals = [
  { value: null, label: 'None' },
  { value: 'mvp_win', label: 'MVP Win' },
  { value: 'mvp_lose', label: 'MVP Lose' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
]

function toStorageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `http://localhost:8000/api/matches/${matchId.value}/screenshot`
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

onMounted(async () => {
  try {
    const [mRes, pRes, hRes, rRes] = await Promise.all([
      matchesApi.getMatch(matchId.value),
      playersApi.getPlayers({ per_page: 200 }),
      heroesApi.getHeroes({ per_page: 200 }),
      rolesApi.getRoles({ per_page: 100 }),
    ])

    players.value = normalizeList<Player>(pRes.data as Player[] | { data?: Player[] })
    heroes.value = normalizeList<Hero>(hRes.data as Hero[] | { data?: Hero[] })
    roles.value = normalizeList<Role>(rRes.data as Role[] | { data?: Role[] })

    const m = normalizeItem<GameMatch>(mRes.data as GameMatch | { data?: GameMatch })
    matchDate.value = m.match_date
    duration.value = m.duration || ''
    teamAName.value = m.team_a_name
    teamBName.value = m.team_b_name
    winner.value = m.winner
    notes.value = m.notes || ''
    screenshotPath.value = m.screenshot_path || ''
    screenshotPreview.value = screenshotPath.value ? toStorageUrl(screenshotPath.value) : ''

    if (m.match_players) {
      const tA = m.match_players.filter(p => p.team === 'team_a')
      const tB = m.match_players.filter(p => p.team === 'team_b')
      tA.forEach((p, i) => {
        if (teamAPlayers.value[i]) {
          Object.assign(teamAPlayers.value[i], {
            player_id: p.player_id,
            hero_id: p.hero_id,
            role_id: p.role_id,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            rating: p.rating,
            medal: p.medal,
          })
        }
      })
      tB.forEach((p, i) => {
        if (teamBPlayers.value[i]) {
          Object.assign(teamBPlayers.value[i], {
            player_id: p.player_id,
            hero_id: p.hero_id,
            role_id: p.role_id,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            rating: p.rating,
            medal: p.medal,
          })
        }
      })
    }
  } catch {
    error.value = 'Failed to load match data'
  } finally {
    loading.value = false
  }
})

function buildPlayers(rows: PlayerRow[], team: 'team_a' | 'team_b'): MatchPlayerPayload[] {
  return rows.filter(r => r.player_id && r.hero_id && r.role_id).map(r => ({
    player_id: r.player_id!, hero_id: r.hero_id!, role_id: r.role_id!, team,
    kills: r.kills, deaths: r.deaths, assists: r.assists, rating: r.rating, medal: r.medal,
  }))
}

async function handleSubmit() {
  error.value = ''
  const allPlayers = [...buildPlayers(teamAPlayers.value, 'team_a'), ...buildPlayers(teamBPlayers.value, 'team_b')]
  if (allPlayers.length < 2) { error.value = 'Please add at least 1 player per team'; return }
  saving.value = true
  try {
    await matchesApi.updateMatch(matchId.value, {
      match_date: matchDate.value, duration: duration.value || undefined,
      team_a_name: teamAName.value, team_b_name: teamBName.value,
      winner: winner.value, notes: notes.value || undefined, screenshot_path: screenshotPath.value || undefined, players: allPlayers,
    })
    router.push('/admin/dashboard')
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update match'
  } finally { saving.value = false }
}

async function handleDelete() {
  if (!confirm('Are you sure you want to delete this match?')) return
  try {
    await matchesApi.deleteMatch(matchId.value)
    router.push('/admin/dashboard')
  } catch { error.value = 'Failed to delete match' }
}
</script>

<template>
  <div>
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: start;">
      <div>
        <h1 class="page-title">Edit Match #{{ matchId }}</h1>
        <p class="page-subtitle">Update match result details</p>
      </div>
      <button class="btn btn-danger" @click="handleDelete">Delete Match</button>
    </div>

    <div v-if="loading" class="card text-center" style="padding: 48px;">
      <p class="text-muted">Loading match data...</p>
    </div>

    <template v-else>
      <div v-if="error" class="error-banner mb-lg">{{ error }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="card mb-lg">
          <h3 class="mb-md">Match Information</h3>
          <div class="match-info-grid">
            <div class="form-group"><label class="form-label">Match Date</label><input v-model="matchDate" type="date" class="form-input" required></div>
            <div class="form-group"><label class="form-label">Duration</label><input v-model="duration" type="text" class="form-input" placeholder="e.g. 15:30"></div>
            <div class="form-group"><label class="form-label">Team A</label><input v-model="teamAName" type="text" class="form-input" required></div>
            <div class="form-group"><label class="form-label">Team B</label><input v-model="teamBName" type="text" class="form-input" required></div>
            <div class="form-group"><label class="form-label">Winner</label><select v-model="winner" class="form-select"><option value="team_a">{{ teamAName }}</option><option value="team_b">{{ teamBName }}</option></select></div>
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

        <div class="teams-input">
          <div v-for="(team, teamKey) in [{ name: teamAName, players: teamAPlayers, label: 'team_a' as const }, { name: teamBName, players: teamBPlayers, label: 'team_b' as const }]" :key="teamKey" class="card">
            <h3 class="mb-md" :class="winner === team.label ? 'text-green' : ''">{{ team.name }}</h3>
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
              <select v-model="row.player_id" class="form-select"><option :value="null">Player...</option><option v-for="p in players" :key="p.id" :value="p.id">{{ p.username }}</option></select>
              <select v-model="row.hero_id" class="form-select"><option :value="null">Hero...</option><option v-for="h in heroes" :key="h.id" :value="h.id">{{ h.name }}</option></select>
              <select v-model="row.role_id" class="form-select"><option :value="null">Role...</option><option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option></select>
              <div class="kda-inputs">
                <input v-model.number="row.kills" type="number" class="form-input kda-input" placeholder="K" min="0">
                <input v-model.number="row.deaths" type="number" class="form-input kda-input" placeholder="D" min="0">
                <input v-model.number="row.assists" type="number" class="form-input kda-input" placeholder="A" min="0">
              </div>
              <input v-model.number="row.rating" type="number" class="form-input rating-input" placeholder="Rating" step="0.1" min="0" max="20">
              <select v-model="row.medal" class="form-select medal-select"><option v-for="m in medals" :key="String(m.value)" :value="m.value">{{ m.label }}</option></select>
            </div>
          </div>
        </div>

        <div class="card mt-lg">
          <div class="form-group"><label class="form-label">Notes</label><textarea v-model="notes" class="form-textarea" placeholder="Notes..."></textarea></div>
        </div>

        <div class="mt-lg" style="display: flex; gap: 12px;">
          <button type="submit" class="btn btn-primary btn-lg" :disabled="saving">{{ saving ? 'Saving...' : 'Update Match' }}</button>
          <router-link to="/admin/dashboard" class="btn btn-secondary btn-lg">Cancel</router-link>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.error-banner { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: var(--danger); padding: 12px 20px; border-radius: var(--radius-md); }
.match-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.teams-input { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.player-row { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.player-row-head { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; padding: 0 0 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.player-row-head__num, .player-row-head__cell, .player-row-head__rating, .player-row-head__medal { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.player-row-head__num { width: 28px; flex-shrink: 0; }
.player-row-head__cell { flex: 1; min-width: 100px; }
.player-row-head__kda { max-width: 170px; text-align: center; }
.player-row-head__rating { width: 80px; text-align: center; }
.player-row-head__medal { min-width: 90px; max-width: 100px; text-align: center; }
.player-row__num { font-family: var(--font-heading); font-weight: 700; color: var(--text-muted); width: 28px; flex-shrink: 0; }
.player-row .form-select { flex: 1; min-width: 100px; }
.kda-inputs { display: flex; gap: 4px; }
.kda-input { width: 52px !important; min-width: 52px; text-align: center; padding: 8px 4px !important; }
.rating-input { width: 80px !important; min-width: 80px; }
.medal-select { min-width: 90px; max-width: 100px; }
.screenshot-preview { display: flex; gap: 12px; align-items: flex-start; flex-direction: column; }
.screenshot-preview__img { max-width: 340px; max-height: 200px; border-radius: var(--radius-md); border: 1px solid var(--border-color); object-fit: cover; }
@media (max-width: 1024px) { .teams-input { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .player-row-head { display: none; } }
</style>
