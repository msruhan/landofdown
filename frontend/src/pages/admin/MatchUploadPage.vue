<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { screenshotsApi, playersApi, heroesApi, rolesApi, matchesApi } from '@/services/api'
import type { Player, Hero, Role, MatchPlayerPayload } from '@/types'

const router = useRouter()
const players = ref<Player[]>([])
const heroes = ref<Hero[]>([])
const roles = ref<Role[]>([])

const file = ref<File | null>(null)
const preview = ref<string | null>(null)
const uploading = ref(false)
const saving = ref(false)
const error = ref('')
const parsed = ref(false)
const ocrMessage = ref('')

const matchDate = ref(new Date().toISOString().slice(0, 10))
const duration = ref('')
const teamAName = ref('Team A')
const teamBName = ref('Team B')
const winner = ref<'team_a' | 'team_b'>('team_a')
const notes = ref('')
const isDragOver = ref(false)

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

interface ParsedPlayerRow {
  team?: 'team_a' | 'team_b'
  player_name?: string
  player_id?: number | null
  hero_id?: number | null
  role_id?: number | null
  kills?: number
  deaths?: number
  assists?: number
  rating?: number | null
  medal?: 'mvp_win' | 'mvp_lose' | 'gold' | 'silver' | 'bronze' | null
}

const teamAPlayers = ref<PlayerRow[]>(Array.from({ length: 5 }, emptyRow))
const teamBPlayers = ref<PlayerRow[]>(Array.from({ length: 5 }, emptyRow))

function normalizeList<T>(payload: T[] | { data?: T[] }): T[] {
  return Array.isArray(payload) ? payload : (payload.data ?? [])
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0))

  for (let i = 0; i <= m; i += 1) dp[i]![0] = i
  for (let j = 0; j <= n; j += 1) dp[0]![j] = j

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      )
    }
  }

  return dp[m]![n]!
}

function findPlayerIdByName(name?: string): number | null {
  if (!name) return null
  const target = normalizeKey(name)
  if (!target) return null

  const exact = players.value.find((p) => normalizeKey(p.username) === target)
  if (exact) return exact.id

  const partial = players.value.find((p) => {
    const username = normalizeKey(p.username)
    return username.includes(target) || target.includes(username)
  })
  if (partial) return partial.id

  let bestId: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const player of players.value) {
    const username = normalizeKey(player.username)
    if (!username) continue
    const distance = levenshtein(target, username)
    if (distance < bestDistance) {
      bestDistance = distance
      bestId = player.id
    }
  }

  return bestDistance <= 2 ? bestId : null
}

function applyParsedRows(parsedRows: ParsedPlayerRow[]) {
  const teamARows = parsedRows.filter((p) => p.team === 'team_a').slice(0, 5)
  const teamBRows = parsedRows.filter((p) => p.team === 'team_b').slice(0, 5)

  const assign = (targetRows: PlayerRow[], sourceRows: ParsedPlayerRow[]) => {
    sourceRows.forEach((source, idx) => {
      const target = targetRows[idx]
      if (!target) return
      if (source.player_id != null) target.player_id = source.player_id
      else if (source.player_name) target.player_id = findPlayerIdByName(source.player_name)
      if (source.hero_id != null) target.hero_id = source.hero_id
      if (source.role_id != null) target.role_id = source.role_id
      if (typeof source.kills === 'number') target.kills = source.kills
      if (typeof source.deaths === 'number') target.deaths = source.deaths
      if (typeof source.assists === 'number') target.assists = source.assists
      if (typeof source.rating === 'number') target.rating = source.rating
      if (source.medal !== undefined) target.medal = source.medal
    })
  }

  assign(teamAPlayers.value, teamARows)
  assign(teamBPlayers.value, teamBRows)
}

const medals = [
  { value: null, label: 'None' },
  { value: 'mvp_win', label: 'MVP Win' },
  { value: 'mvp_lose', label: 'MVP Lose' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
]

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
  } catch { /* empty */ }
})

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) setFile(input.files[0])
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false
  const f = e.dataTransfer?.files[0]
  if (f) setFile(f)
}

function setFile(f: File) {
  file.value = f
  preview.value = URL.createObjectURL(f)
}

async function compressImageForUpload(inputFile: File, maxBytes = 1_800_000): Promise<File> {
  if (!inputFile.type.startsWith('image/')) return inputFile
  if (inputFile.size <= maxBytes) return inputFile

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(inputFile)
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
  if (!ctx) return inputFile
  ctx.drawImage(image, 0, 0)

  let quality = 0.9
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  }

  if (!blob) return inputFile
  return new File([blob], inputFile.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
}

async function handleUpload() {
  if (!file.value) return
  uploading.value = true
  error.value = ''
  try {
    const uploadFile = await compressImageForUpload(file.value)
    const res = await screenshotsApi.upload(uploadFile)
    const data = res.data.data
    ocrMessage.value = res.data.ocr_message || ''
    if (data.match_date) matchDate.value = data.match_date
    if (data.team_a_name) teamAName.value = data.team_a_name
    if (data.team_b_name) teamBName.value = data.team_b_name
    if (data.winner) winner.value = data.winner
    if (data.duration) duration.value = data.duration
    if (Array.isArray(data.players)) {
      applyParsedRows(data.players as ParsedPlayerRow[])
    }
    parsed.value = true
  } catch {
    error.value = 'Failed to parse screenshot. Please fill in the data manually.'
    parsed.value = true
  } finally {
    uploading.value = false
  }
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

async function handleSave() {
  error.value = ''
  const allPlayers = [...buildPlayers(teamAPlayers.value, 'team_a'), ...buildPlayers(teamBPlayers.value, 'team_b')]
  if (allPlayers.length < 2) { error.value = 'Please add at least 1 player per team'; return }
  saving.value = true
  try {
    await matchesApi.createMatch({
      match_date: matchDate.value,
      duration: duration.value || undefined,
      team_a_name: teamAName.value,
      team_b_name: teamBName.value,
      winner: winner.value,
      notes: notes.value || undefined,
      players: allPlayers,
    })
    router.push('/admin/dashboard')
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save match'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Upload Screenshot</h1>
      <p class="page-subtitle">Upload a match screenshot to auto-parse results</p>
    </div>

    <div v-if="error" class="error-banner mb-lg">{{ error }}</div>
    <div v-if="ocrMessage" class="ocr-banner mb-lg">{{ ocrMessage }}</div>

    <!-- Upload Area -->
    <div v-if="!parsed" class="card mb-lg">
      <div
        class="drop-zone"
        :class="{ 'drag-over': isDragOver, 'has-file': !!preview }"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop.prevent="handleDrop"
        @click="($refs.fileInput as HTMLInputElement).click()"
      >
        <template v-if="preview">
          <img :src="preview" alt="Screenshot preview" class="drop-zone__preview">
          <p class="drop-zone__name">{{ file?.name }}</p>
        </template>
        <template v-else>
          <span class="drop-zone__icon">📸</span>
          <p class="drop-zone__text">Drop screenshot here or click to browse</p>
          <p class="drop-zone__hint">Supports JPG, PNG</p>
        </template>
      </div>
      <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="handleFileSelect">

      <div class="mt-md" style="text-align: center;">
        <button class="btn btn-primary btn-lg" :disabled="!file || uploading" @click="handleUpload">
          {{ uploading ? 'Uploading & Parsing...' : 'Upload & Parse' }}
        </button>
      </div>
    </div>

    <!-- Parsed Form -->
    <template v-if="parsed">
      <div v-if="preview" class="card mb-lg">
        <h3 class="mb-md">Uploaded Screenshot</h3>
        <img :src="preview" alt="Screenshot" style="max-height: 300px; border-radius: var(--radius-md);">
      </div>

      <form @submit.prevent="handleSave">
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
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea v-model="notes" class="form-textarea" placeholder="Additional notes..."></textarea>
          </div>
        </div>

        <div class="mt-lg" style="display: flex; gap: 12px;">
          <button type="submit" class="btn btn-primary btn-lg" :disabled="saving">{{ saving ? 'Saving...' : 'Confirm & Save' }}</button>
          <router-link to="/admin/dashboard" class="btn btn-secondary btn-lg">Cancel</router-link>
        </div>
      </form>
    </template>
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

.ocr-banner {
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.2);
  color: #67e8f9;
  padding: 12px 20px;
  border-radius: var(--radius-md);
}

.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 48px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition);
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--green-neon);
  background: rgba(0, 255, 135, 0.03);
}

.drop-zone.has-file {
  border-style: solid;
}

.drop-zone__icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
}

.drop-zone__text {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.drop-zone__hint {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-top: 4px;
}

.drop-zone__preview {
  max-height: 200px;
  margin: 0 auto;
  border-radius: var(--radius-md);
}

.drop-zone__name {
  color: var(--text-secondary);
  margin-top: 8px;
  font-size: 0.85rem;
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

@media (max-width: 1024px) {
  .teams-input { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .player-row-head { display: none; }
}
</style>
