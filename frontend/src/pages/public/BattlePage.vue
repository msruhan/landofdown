<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import html2canvas from 'html2canvas'
import { battleApi, playersApi, predictionApi } from '@/services/api'
import type {
  BattleAiRequest,
  BattleAiResponse,
  Player,
  PredictionPlayerResult,
  PredictionReasoningResponse,
  PredictionResponse,
  PredictionSlot,
} from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'

type LaneKey = 'jungle' | 'exp' | 'mid' | 'gold' | 'roam'

interface Lane {
  key: LaneKey
  label: string
  short: string
  color: string
  icon: string
}

interface BattleSlot {
  lane: Lane
  playerA: Player
  playerB: Player
}

const LANES: Lane[] = [
  {
    key: 'jungle',
    label: 'Jungle',
    short: 'JGL',
    color: '#ef4444',
    icon: 'M4 21l3-7l5-3l5 3l3 7 M9 9a3 3 0 1 1 6 0a3 3 0 0 1 -6 0',
  },
  {
    key: 'exp',
    label: 'EXP Lane',
    short: 'EXP',
    color: '#f59e0b',
    icon: 'M14.5 17.5L3 6V3h3l11.5 11.5 M13 19l6-6 M16 16l4 4 M19 21l2-2',
  },
  {
    key: 'mid',
    label: 'Mid Lane',
    short: 'MID',
    color: '#06b6d4',
    icon: 'M4 12h16 M12 4v16 M6 6l12 12 M6 18l12-12',
  },
  {
    key: 'gold',
    label: 'Gold Lane',
    short: 'GLD',
    color: '#ffd700',
    icon: 'M12 2l2.5 6l6.5.5l-5 4.5l1.5 6.5l-5.5-3.5l-5.5 3.5l1.5-6.5l-5-4.5l6.5-.5z',
  },
  {
    key: 'roam',
    label: 'Roam',
    short: 'ROA',
    color: '#10b981',
    icon: 'M12 2l9 4v6c0 5-3.8 9.3-9 10c-5.2-.7-9-5-9-10V6z',
  },
]

const loading = ref(true)
const players = ref<Player[]>([])
const selectedIds = ref<Set<number>>(new Set())
const teamAName = ref('Team Alpha')
const teamBName = ref('Team Omega')

const slots = ref<BattleSlot[]>([])
const rolling = ref(false)
const revealed = ref(false)
const errorMessage = ref<string | null>(null)
const shuffleTick = ref(0)
const aiPrompt = ref('')
const aiLoading = ref(false)
const aiInstructionHistory = ref<string[]>([])
const mapImageUrl = 'https://res.cloudinary.com/dkjkd4jt9/image/upload/v1776703999/basic_qhhahf.webp'
const AI_DUPLICATE_PLAYER_ERROR = 'player id is duplicated across slots'
const AI_UNIQUENESS_GUARDRAIL = 'PENTING: gunakan tepat 10 player unik. Jangan ada player id yang dipakai lebih dari sekali di semua slot.'
const battleSectionRef = ref<HTMLElement | null>(null)
const mapSectionRef = ref<HTMLElement | null>(null)
const shareLoading = ref(false)
const shareStatus = ref<string | null>(null)
const predictionLoading = ref(false)
const predictionRequested = ref(false)
const predictionError = ref<string | null>(null)
const predictionResult = ref<PredictionResponse | null>(null)
const reasoningLoading = ref(false)
const reasoningError = ref<string | null>(null)
const reasoning = ref<PredictionReasoningResponse | null>(null)
const predictionSectionRef = ref<HTMLElement | null>(null)

const selectedPlayers = computed(() => players.value.filter(p => selectedIds.value.has(p.id)))
const selectedCount = computed(() => selectedIds.value.size)
const canRandomize = computed(() => selectedCount.value >= 10 && !rolling.value)
const canAiRandomize = computed(() => selectedCount.value >= 10 && !rolling.value && !aiLoading.value && aiPrompt.value.trim().length > 0)
const canPredict = computed(() => slots.value.length === 5 && !rolling.value && !aiLoading.value)
const hasAiMemory = computed(() => aiInstructionHistory.value.length > 0)
const slotByLane = computed(() => {
  const byLane = new Map<LaneKey, BattleSlot>()
  for (const slot of slots.value) {
    byLane.set(slot.lane.key, slot)
  }
  return byLane
})

onMounted(async () => {
  try {
    const response = await playersApi.getPlayers({ per_page: 100 })
    const rawData = (response.data as unknown as { data?: Player[] })?.data
    players.value = Array.isArray(rawData) ? rawData : []
    // default: select all (up to 10)
    const defaults = players.value.slice(0, Math.min(10, players.value.length))
    selectedIds.value = new Set(defaults.map(p => p.id))
  } catch {
    players.value = []
  } finally {
    loading.value = false
  }
})

function togglePlayer(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function selectAll() {
  selectedIds.value = new Set(players.value.map(p => p.id))
}

function clearAll() {
  selectedIds.value = new Set()
}

function pickRandomTen() {
  const shuffled = [...players.value].sort(() => Math.random() - 0.5)
  selectedIds.value = new Set(shuffled.slice(0, 10).map(p => p.id))
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

function buildBaselineMemoryFromSlots(draftSlots: BattleSlot[]): string {
  const laneOrder: LaneKey[] = ['jungle', 'exp', 'mid', 'gold', 'roam']
  const laneLabelMap = new Map(LANES.map((lane) => [lane.key, lane.short]))
  const byLane = new Map(draftSlots.map((slot) => [slot.lane.key, slot]))
  const laneSummary = laneOrder
    .map((laneKey) => {
      const slot = byLane.get(laneKey)
      if (!slot) return null
      const laneLabel = laneLabelMap.get(laneKey) || laneKey.toUpperCase()
      return `${laneLabel}: ${slot.playerA.username} (Team A) vs ${slot.playerB.username} (Team B)`
    })
    .filter((line): line is string => Boolean(line))
    .join(' | ')

  return `Baseline draft dari randomize battle. Pertahankan susunan ini kecuali diubah prompt user: ${laneSummary}`
}

function shouldLockTeamsForPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  const teamSwapPattern = /(pindah|tukar|swap|ganti|move).{0,20}(team|tim)|(team|tim).{0,20}(pindah|tukar|swap|ganti|move)/
  return !teamSwapPattern.test(lower)
}

function buildTeamLockGuardrail(currentSlots?: Array<{ lane: LaneKey, team_a_player_id: number, team_b_player_id: number }>): string {
  if (!currentSlots || currentSlots.length !== 5) return ''

  const byId = new Map(players.value.map((p) => [p.id, p.username]))
  const teamAPlayers = currentSlots
    .map((slot) => byId.get(slot.team_a_player_id))
    .filter((name): name is string => Boolean(name))
  const teamBPlayers = currentSlots
    .map((slot) => byId.get(slot.team_b_player_id))
    .filter((name): name is string => Boolean(name))

  if (teamAPlayers.length !== 5 || teamBPlayers.length !== 5) return ''

  return [
    'PENTING: ubah role/lane saja, JANGAN ubah komposisi anggota tim.',
    `Team A harus tetap berisi: ${teamAPlayers.join(', ')}.`,
    `Team B harus tetap berisi: ${teamBPlayers.join(', ')}.`,
    'Hanya posisi lane yang boleh ditukar antar anggota dalam tim masing-masing.',
  ].join(' ')
}

async function randomize() {
  resetPredictionState()
  errorMessage.value = null
  if (selectedCount.value < 10) {
    errorMessage.value = 'Pilih minimal 10 player untuk memulai battle'
    return
  }

  rolling.value = true
  revealed.value = false

  // animation: shuffle ticks
  const ticks = 14
  for (let i = 0; i < ticks; i++) {
    shuffleTick.value++
    const shuffled = shuffleArray(selectedPlayers.value).slice(0, 10)
    slots.value = LANES.map((lane, idx) => ({
      lane,
      playerA: shuffled[idx]!,
      playerB: shuffled[idx + 5]!,
    }))
    await new Promise(resolve => setTimeout(resolve, 80 + i * 15))
  }

  // final pick
  const finalPool = shuffleArray(selectedPlayers.value).slice(0, 10)
  const teamA = finalPool.slice(0, 5)
  const teamB = finalPool.slice(5, 10)
  const lanesOrder = shuffleArray(LANES)

  slots.value = lanesOrder.map((lane, idx) => ({
    lane,
    playerA: teamA[idx]!,
    playerB: teamB[idx]!,
  }))

  // Keep a concrete baseline memory from randomize result to stabilize first AI refine.
  aiInstructionHistory.value = [buildBaselineMemoryFromSlots(slots.value)]

  rolling.value = false
  revealed.value = true
}

function buildSlotsFromAiResult(aiResult: BattleAiResponse) {
  const playerMap = new Map(players.value.map((p) => [p.id, p]))
  const laneMap = new Map(LANES.map((l) => [l.key, l]))

  const mapped = aiResult.slots
    .map((slot) => {
      const lane = laneMap.get(slot.lane)
      const playerA = playerMap.get(slot.team_a_player_id)
      const playerB = playerMap.get(slot.team_b_player_id)
      if (!lane || !playerA || !playerB) return null
      return { lane, playerA, playerB }
    })
    .filter((slot): slot is BattleSlot => slot !== null)

  return mapped
}

async function randomizeWithAi() {
  resetPredictionState()
  errorMessage.value = null
  if (selectedCount.value < 10) {
    errorMessage.value = 'Pilih minimal 10 player untuk menggunakan AI battle'
    return
  }
  if (!aiPrompt.value.trim()) {
    errorMessage.value = 'Tulis instruksi AI terlebih dahulu'
    return
  }

  aiLoading.value = true
  revealed.value = false
  try {
    const currentSlots = slots.value.length === 5
      ? slots.value.map((s) => ({
          lane: s.lane.key,
          team_a_player_id: s.playerA.id,
          team_b_player_id: s.playerB.id,
        }))
      : undefined

    const basePrompt = aiPrompt.value.trim()
    const buildPayload = (prompt: string): BattleAiRequest => {
      const teamLockGuardrail = shouldLockTeamsForPrompt(prompt)
        ? buildTeamLockGuardrail(currentSlots)
        : ''
      const finalPrompt = teamLockGuardrail ? `${prompt}\n\n${teamLockGuardrail}` : prompt

      return {
      prompt: finalPrompt,
      team_a_name: teamAName.value,
      team_b_name: teamBName.value,
      players: selectedPlayers.value.map((p) => ({ id: p.id, username: p.username })),
      current_slots: currentSlots,
      instruction_history: aiInstructionHistory.value,
      }
    }

    const requestDraft = async (prompt: string) => {
      const res = await battleApi.aiRandomize(buildPayload(prompt))
      return res.data as BattleAiResponse
    }

    const extractApiMessage = (err: unknown) =>
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message || null

    let data: BattleAiResponse
    try {
      data = await requestDraft(basePrompt)
    } catch (firstError: unknown) {
      const firstMessage = extractApiMessage(firstError)
      const shouldRetryWithGuardrail = typeof firstMessage === 'string'
        && firstMessage.toLowerCase().includes(AI_DUPLICATE_PLAYER_ERROR)

      if (!shouldRetryWithGuardrail) throw firstError

      data = await requestDraft(`${basePrompt}\n\n${AI_UNIQUENESS_GUARDRAIL}`)
    }

    const nextSlots = buildSlotsFromAiResult(data)

    if (nextSlots.length !== 5) {
      throw new Error('AI result is incomplete')
    }

    teamAName.value = data.team_a_name || teamAName.value
    teamBName.value = data.team_b_name || teamBName.value
    slots.value = nextSlots
    revealed.value = true
    aiInstructionHistory.value = [...aiInstructionHistory.value, basePrompt].slice(-20)
    aiPrompt.value = ''
  } catch (e: unknown) {
    errorMessage.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'AI battle gagal diproses'
  } finally {
    aiLoading.value = false
  }
}

function resetBattle() {
  slots.value = []
  revealed.value = false
  errorMessage.value = null
  aiInstructionHistory.value = []
  resetPredictionState()
}

function resetAiMemory() {
  aiInstructionHistory.value = []
}

function avatarUrl(player: Player) {
  return player.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(player.username)}`
}

function resetPredictionState() {
  predictionLoading.value = false
  predictionRequested.value = false
  predictionError.value = null
  predictionResult.value = null
  reasoningLoading.value = false
  reasoningError.value = null
  reasoning.value = null
}

function buildPredictionSlots(): { teamA: PredictionSlot[], teamB: PredictionSlot[] } {
  const teamA: PredictionSlot[] = slots.value.map((slot) => ({ player_id: slot.playerA.id }))
  const teamB: PredictionSlot[] = slots.value.map((slot) => ({ player_id: slot.playerB.id }))
  return { teamA, teamB }
}

const predictionWinner = computed<'team_a' | 'team_b' | 'draw'>(() => {
  const r = predictionResult.value
  if (!r) return 'draw'
  if (Math.abs(r.team_a.win_probability - r.team_b.win_probability) < 1) return 'draw'
  return r.team_a.win_probability > r.team_b.win_probability ? 'team_a' : 'team_b'
})

const predictionWinnerName = computed(() => {
  if (predictionWinner.value === 'team_a') return teamAName.value
  if (predictionWinner.value === 'team_b') return teamBName.value
  return 'Seri'
})

const confidenceTier = computed(() => {
  const c = predictionResult.value?.confidence ?? 0
  if (c >= 60) return { label: 'Sangat yakin', tone: 'high' as const }
  if (c >= 30) return { label: 'Cukup yakin', tone: 'mid' as const }
  if (c >= 10) return { label: 'Tipis', tone: 'low' as const }
  return { label: 'Hampir seimbang', tone: 'draw' as const }
})

function formatPct(rate: number | null | undefined, digits = 0) {
  if (rate === null || rate === undefined) return '—'
  return `${(rate * 100).toFixed(digits)}%`
}

function formStreak(p: PredictionPlayerResult): Array<'W' | 'L' | '-'> {
  const streak = p.recent_form.streak ?? []
  const out: Array<'W' | 'L' | '-'> = []
  for (let i = 0; i < 5; i++) {
    const v = streak[i]
    if (v === 'win') out.push('W')
    else if (v === 'loss') out.push('L')
    else out.push('-')
  }
  return out
}

function findPlayer(team: 'team_a' | 'team_b', id: number): Player | null {
  const slot = slots.value.find(s => (team === 'team_a' ? s.playerA.id : s.playerB.id) === id)
  return slot ? (team === 'team_a' ? slot.playerA : slot.playerB) : null
}

function playerAvatar(team: 'team_a' | 'team_b', p: PredictionPlayerResult): string {
  const pl = findPlayer(team, p.player_id)
  if (pl) return avatarUrl(pl)
  return p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.username ?? String(p.player_id))}`
}

function factorTypeLabel(t: string): string {
  const map: Record<string, string> = {
    form: 'Recent Form',
    hero_mastery: 'Hero Mastery',
    role_mastery: 'Role Mastery',
    overall_winrate: 'Overall Winrate',
    matchup: 'Matchup',
    synergy: 'Synergy',
  }
  return map[t] ?? t
}

function factorTypeIcon(t: string): string {
  const map: Record<string, string> = {
    form: 'M3 17l6-6 4 4 8-8',
    hero_mastery: 'M12 2l3 6 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.9 3 1.1-6.5L2.5 8.9 9 8z',
    role_mastery: 'M12 2l9 4v6c0 5-3.8 9.3-9 10c-5.2-.7-9-5-9-10V6z',
    overall_winrate: 'M4 20h16 M6 16l4-6 3 3 5-7',
    matchup: 'M5 12h14 M5 6h14 M5 18h10',
    synergy: 'M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z',
  }
  return map[t] ?? 'M4 4h16v16H4z'
}

async function fetchReasoning() {
  if (!predictionResult.value) return
  reasoningLoading.value = true
  reasoningError.value = null
  reasoning.value = null
  try {
    const payload = buildPredictionSlots()
    const response = await predictionApi.reasoning(
      { name: teamAName.value, players: payload.teamA },
      { name: teamBName.value, players: payload.teamB },
      predictionResult.value,
    )
    reasoning.value = response.data
  } catch (e: unknown) {
    reasoningError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Analisis AI gagal dimuat'
  } finally {
    reasoningLoading.value = false
  }
}

async function predictBattle() {
  if (slots.value.length !== 5) return
  predictionRequested.value = true
  predictionLoading.value = true
  predictionError.value = null
  predictionResult.value = null
  reasoning.value = null
  reasoningError.value = null

  try {
    const payload = buildPredictionSlots()
    const response = await predictionApi.predict(payload.teamA, payload.teamB)
    predictionResult.value = response.data
  } catch (e: unknown) {
    predictionError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Predict gagal diproses'
    predictionLoading.value = false
    return
  } finally {
    predictionLoading.value = false
  }

  // Scroll prediction panel into view for quick inspection.
  setTimeout(() => {
    predictionSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 120)

  // Kick off AI reasoning in background; numeric prediction already shown.
  fetchReasoning()
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca data gambar'))
    reader.readAsDataURL(blob)
  })
}

async function inlineImagesAsDataUrl(root: HTMLElement): Promise<() => void> {
  const images = Array.from(root.querySelectorAll('img'))
  const originals: Array<{ img: HTMLImageElement, src: string }> = []

  for (const img of images) {
    const src = img.currentSrc || img.src
    if (!src || src.startsWith('data:')) continue

    originals.push({ img, src })
    try {
      const response = await fetch(src, { mode: 'cors', credentials: 'omit' })
      if (!response.ok) continue
      const blob = await response.blob()
      const dataUrl = await blobToDataUrl(blob)
      img.src = dataUrl
      await img.decode().catch(() => {})
    } catch {
      // Keep original src when remote image cannot be inlined.
    }
  }

  return () => {
    for (const { img, src } of originals) {
      img.src = src
    }
  }
}

async function captureSectionImage(section: HTMLElement, filename: string): Promise<File> {
  const baseOptions = {
    backgroundColor: '#06121a',
    scale: Math.min(window.devicePixelRatio || 1.5, 2),
    useCORS: true,
    logging: false,
    imageTimeout: 15000,
  }

  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(section, baseOptions)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const isUnsupportedColorFn = message.includes('unsupported color function') || message.includes('"color"')
    if (!isUnsupportedColorFn) throw error

    const restoreImages = await inlineImagesAsDataUrl(section)
    try {
      canvas = await html2canvas(section, {
        ...baseOptions,
        foreignObjectRendering: true,
      })
    } finally {
      restoreImages()
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {
    throw new Error('Gagal membuat gambar screenshot')
  }

  return new File([blob], filename, { type: 'image/png' })
}

function downloadFallback(files: File[]) {
  for (const file of files) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(file)
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }
}

async function shareToWhatsApp() {
  shareStatus.value = null
  if (!battleSectionRef.value || !mapSectionRef.value) {
    shareStatus.value = 'Panel battle/map belum siap untuk di-capture'
    return
  }

  shareLoading.value = true
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const [battleImage, mapImage] = await Promise.all([
      captureSectionImage(battleSectionRef.value, `battle-${timestamp}.png`),
      captureSectionImage(mapSectionRef.value, `map-${timestamp}.png`),
    ])

    const files = [battleImage, mapImage]
    const shareData: ShareData = {
      files,
      title: 'MLBB Battle Result',
      text: 'Hasil battle dan map mapping MLBB',
    }

    if (navigator.canShare && navigator.canShare({ files })) {
      await navigator.share(shareData)
      shareStatus.value = 'Screenshot berhasil dibagikan'
      return
    }

    downloadFallback(files)
    window.open(
      'https://wa.me/?text=' + encodeURIComponent('Screenshot battle sudah diunduh. Silakan attach 2 gambar ke chat WhatsApp.'),
      '_blank',
      'noopener,noreferrer',
    )
    shareStatus.value = 'Browser belum support share file langsung. Gambar diunduh, lalu WhatsApp dibuka.'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Gagal membagikan screenshot'
    shareStatus.value = message
  } finally {
    shareLoading.value = false
  }
}

void shareToWhatsApp
</script>

<template>
  <div class="battle-page animate-fade-in">
    <!-- HERO -->
    <section class="battle-hero">
      <div class="battle-hero__grid" aria-hidden="true"></div>
      <div class="battle-hero__scan" aria-hidden="true"></div>
      <div class="battle-hero__content">
        <span class="battle-hero__eyebrow">⚔ MLBB BATTLE SIMULATOR</span>
        <h1 class="battle-hero__title">
          RANDOM <span class="gradient-text">BATTLE ARENA</span>
        </h1>
        <p class="battle-hero__subtitle">
          Bangkitkan pertandingan 5v5 secara acak. Sistem akan memetakan player ke dalam <strong>Team A</strong> & <strong>Team B</strong> lengkap dengan role <strong>Jungle</strong>, <strong>EXP</strong>, <strong>Mid</strong>, <strong>Gold</strong>, dan <strong>Roam</strong>.
        </p>
      </div>
    </section>

    <LoadingSpinner v-if="loading" />

    <div v-else class="battle-content">
      <!-- SELECTION PANEL -->
      <section class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">1. Pick Your Warriors</h2>
            <p class="panel__subtitle">Minimal 10 player aktif untuk memulai simulasi battle 5v5</p>
          </div>
          <div class="panel__actions">
            <span class="counter" :class="{ 'counter--ok': selectedCount >= 10 }">
              <span class="counter__num">{{ selectedCount }}</span>
              <span class="counter__label">selected</span>
            </span>
            <button class="btn-ghost" @click="selectAll">Select All</button>
            <button class="btn-ghost" @click="pickRandomTen">Random 10</button>
            <button class="btn-ghost btn-ghost--danger" @click="clearAll">Clear</button>
          </div>
        </div>

        <EmptyState v-if="!players.length" icon="👤" title="No Players" message="Register players first to start a battle." />

        <div v-else class="player-grid">
          <button
            v-for="p in players"
            :key="p.id"
            type="button"
            class="player-chip"
            :class="{ 'player-chip--active': selectedIds.has(p.id) }"
            @click="togglePlayer(p.id)"
          >
            <img :src="avatarUrl(p)" :alt="p.username" class="player-chip__avatar">
            <span class="player-chip__name">{{ p.username }}</span>
            <span class="player-chip__badge" aria-hidden="true">
              <svg v-if="selectedIds.has(p.id)" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
        </div>
      </section>

      <!-- TEAM NAMES + CTA -->
      <section class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">2. Forge The Battle</h2>
            <p class="panel__subtitle">Atur nama team lalu putar simulator untuk memetakan matchup</p>
          </div>
        </div>
        <div class="cta-row">
          <div class="team-input team-input--a">
            <span class="team-input__tag">TEAM A</span>
            <input v-model="teamAName" class="team-input__field" type="text" placeholder="Team Alpha">
          </div>

          <button
            class="randomize-btn"
            :class="{ 'randomize-btn--rolling': rolling }"
            :disabled="!canRandomize"
            @click="randomize"
          >
            <span class="randomize-btn__ring"></span>
            <span class="randomize-btn__ring randomize-btn__ring--2"></span>
            <span class="randomize-btn__content">
              <svg v-if="!rolling" class="randomize-btn__icon" viewBox="0 0 24 24" fill="none">
                <path d="M16 3h5v5 M4 20L21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="randomize-btn__label">{{ rolling ? 'Forging...' : 'Randomize Battle' }}</span>
            </span>
          </button>

          <div class="team-input team-input--b">
            <span class="team-input__tag">TEAM B</span>
            <input v-model="teamBName" class="team-input__field" type="text" placeholder="Team Omega">
          </div>
        </div>
        <div class="ai-prompt">
          <label class="ai-prompt__label">AI Prompt (Opsional)</label>
          <p v-if="hasAiMemory" class="ai-prompt__memory-note">
            Memory aktif ({{ aiInstructionHistory.length }} instruksi). Prompt berikutnya akan refine hasil saat ini.
          </p>
          <textarea
            v-model="aiPrompt"
            class="ai-prompt__field"
            rows="3"
            placeholder="Contoh: pindahkan G.O.Y ke mid, pertahankan Nuas di exp, jangan ubah Team B kecuali roam."
          />
          <div class="ai-prompt__actions">
            <button v-if="hasAiMemory" class="btn-ghost" @click="resetAiMemory">
              Reset AI Memory
            </button>
            <button class="btn-primary" :disabled="!canAiRandomize" @click="randomizeWithAi">
              {{ aiLoading ? 'Generating with AI...' : hasAiMemory ? 'Refine with AI' : 'Generate with AI' }}
            </button>
          </div>
        </div>
        <p v-if="errorMessage" class="error-msg">⚠ {{ errorMessage }}</p>
      </section>

      <!-- BATTLE MAP -->
      <section v-if="slots.length" ref="battleSectionRef" class="panel panel--battle" :class="{ 'panel--rolling': rolling, 'panel--revealed': revealed }">
        <div class="battle-map">
          <!-- Team headers -->
          <div class="battle-map__header battle-map__header--a">
            <span class="battle-map__flag battle-map__flag--a">◆</span>
            <span class="battle-map__team-name">{{ teamAName || 'Team A' }}</span>
            <span class="battle-map__team-sub">BLUE SIDE</span>
          </div>
          <div class="battle-map__vs-main">
            <span class="battle-map__vs-text">VS</span>
          </div>
          <div class="battle-map__header battle-map__header--b">
            <span class="battle-map__team-sub">RED SIDE</span>
            <span class="battle-map__team-name">{{ teamBName || 'Team B' }}</span>
            <span class="battle-map__flag battle-map__flag--b">◆</span>
          </div>

          <!-- Lanes -->
          <div
            v-for="(slot, idx) in slots"
            :key="`${slot.lane.key}-${idx}`"
            class="lane-row"
            :style="{ '--lane-color': slot.lane.color, '--lane-delay': `${idx * 90}ms` }"
          >
            <!-- Team A slot -->
            <div class="slot slot--a">
              <div class="slot__card">
                <img :src="avatarUrl(slot.playerA)" :alt="slot.playerA.username" class="slot__avatar">
                <div class="slot__info">
                  <span class="slot__name">{{ slot.playerA.username }}</span>
                  <span class="slot__role" :style="{ color: slot.lane.color }">{{ slot.lane.short }}</span>
                </div>
              </div>
              <span class="slot__arrow slot__arrow--a" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14 M13 5l7 7l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </div>

            <!-- Lane node (center) -->
            <div class="lane-node">
              <span class="lane-node__line lane-node__line--left"></span>
              <div class="lane-node__core">
                <svg class="lane-node__icon" viewBox="0 0 24 24" fill="none">
                  <path :d="slot.lane.icon" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="lane-node__label">{{ slot.lane.label }}</span>
              </div>
              <span class="lane-node__line lane-node__line--right"></span>
            </div>

            <!-- Team B slot -->
            <div class="slot slot--b">
              <span class="slot__arrow slot__arrow--b" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5 M11 5l-7 7l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <div class="slot__card slot__card--b">
                <div class="slot__info slot__info--b">
                  <span class="slot__name">{{ slot.playerB.username }}</span>
                  <span class="slot__role" :style="{ color: slot.lane.color }">{{ slot.lane.short }}</span>
                </div>
                <img :src="avatarUrl(slot.playerB)" :alt="slot.playerB.username" class="slot__avatar">
              </div>
            </div>
          </div>
        </div>

        <!-- Battle summary + actions -->
        <div class="battle-footer">
          <div class="battle-footer__summary">
            <div class="mini-team mini-team--a">
              <span class="mini-team__label">{{ teamAName }}</span>
              <div class="mini-team__avatars">
                <img v-for="s in slots" :key="`ma-${s.playerA.id}`" :src="avatarUrl(s.playerA)" :alt="s.playerA.username" class="mini-team__av">
              </div>
            </div>
            <span class="battle-footer__vs">VS</span>
            <div class="mini-team mini-team--b">
              <div class="mini-team__avatars">
                <img v-for="s in slots" :key="`mb-${s.playerB.id}`" :src="avatarUrl(s.playerB)" :alt="s.playerB.username" class="mini-team__av">
              </div>
              <span class="mini-team__label">{{ teamBName }}</span>
            </div>
          </div>
          <div class="battle-footer__actions">
            <button class="btn-ghost" @click="resetBattle">Reset</button>
            <!-- <button class="btn-ghost" :disabled="shareLoading" @click="shareToWhatsApp">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M20 12a8 8 0 1 1-1.2-4.2L21 5.6V11h-5.2l1.8-1.8A5.8 5.8 0 1 0 17.8 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ shareLoading ? 'Capturing...' : 'Share to WhatsApp' }}
            </button> -->
            <button
              type="button"
              class="btn-predict"
              :class="{ 'btn-predict--loading': predictionLoading }"
              :disabled="!canPredict || predictionLoading"
              @click="predictBattle"
            >
              <span class="btn-predict__pulse" aria-hidden="true"></span>
              <svg class="btn-predict__icon" viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/>
              </svg>
              <span class="btn-predict__label">
                {{ predictionLoading ? 'Predicting...' : 'Predict Winner' }}
              </span>
            </button>
            <button class="btn-primary" @click="randomize" :disabled="rolling">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 12a9 9 0 0 1 -15 6.7L3 16 M21 3v5h-5 M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Re-Roll
            </button>
          </div>
        </div>
        <p v-if="shareStatus" class="share-status">{{ shareStatus }}</p>

        <div v-if="predictionRequested" ref="predictionSectionRef" class="prediction-panel">
          <header class="prediction-panel__header">
            <div class="prediction-panel__title-wrap">
              <span class="prediction-panel__eyebrow">AI-Powered Analysis</span>
              <h3 class="prediction-panel__title">
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="currentColor" fill-opacity="0.25"/>
                </svg>
                Battle Prediction
              </h3>
              <p class="prediction-panel__subtitle">Peluang menang dihitung dari recent form, hero &amp; role mastery, serta overall winrate.</p>
            </div>
            <button
              v-if="predictionResult && !predictionLoading"
              type="button"
              class="prediction-panel__refresh"
              :disabled="reasoningLoading"
              @click="fetchReasoning"
            >
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 12a9 9 0 0 1 -15 6.7L3 16 M21 3v5h-5 M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ reasoningLoading ? 'Menulis ulang...' : 'Ulangi analisis AI' }}
            </button>
          </header>

          <!-- Loading skeleton for numeric prediction -->
          <div v-if="predictionLoading" class="prediction-skeleton">
            <div class="prediction-skeleton__bar"></div>
            <div class="prediction-skeleton__grid">
              <div class="prediction-skeleton__box"></div>
              <div class="prediction-skeleton__box"></div>
            </div>
            <p class="prediction-panel__loading">Menghitung peluang menang berdasarkan histori match...</p>
          </div>

          <div v-else-if="predictionError" class="prediction-panel__error">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true"><path d="M12 9v4 M12 17h.01 M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            {{ predictionError }}
          </div>

          <div v-else-if="predictionResult" class="prediction-result">
            <!-- Hero verdict banner -->
            <div
              class="prediction-verdict"
              :class="{
                'prediction-verdict--a': predictionWinner === 'team_a',
                'prediction-verdict--b': predictionWinner === 'team_b',
                'prediction-verdict--draw': predictionWinner === 'draw',
              }"
            >
              <div class="prediction-verdict__team prediction-verdict__team--a">
                <span class="prediction-verdict__label">Team A</span>
                <span class="prediction-verdict__name">{{ teamAName }}</span>
                <span class="prediction-verdict__prob">{{ predictionResult.team_a.win_probability }}%</span>
                <span class="prediction-verdict__score">Score: {{ predictionResult.team_a.score.toFixed(3) }}</span>
              </div>

              <div class="prediction-verdict__center">
                <span class="prediction-verdict__badge">
                  <svg v-if="predictionWinner !== 'draw'" viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {{ predictionWinner === 'draw' ? 'Peluang Imbang' : 'Prediksi Pemenang' }}
                </span>
                <span class="prediction-verdict__winner">
                  <span v-if="predictionWinner === 'draw'">{{ teamAName }} vs {{ teamBName }}</span>
                  <span v-else>{{ predictionWinnerName }}</span>
                </span>
                <span
                  class="prediction-verdict__confidence"
                  :class="`prediction-verdict__confidence--${confidenceTier.tone}`"
                >
                  {{ confidenceTier.label }} · {{ predictionResult.confidence }}%
                </span>
              </div>

              <div class="prediction-verdict__team prediction-verdict__team--b">
                <span class="prediction-verdict__label">Team B</span>
                <span class="prediction-verdict__name">{{ teamBName }}</span>
                <span class="prediction-verdict__prob">{{ predictionResult.team_b.win_probability }}%</span>
                <span class="prediction-verdict__score">Score: {{ predictionResult.team_b.score.toFixed(3) }}</span>
              </div>
            </div>

            <!-- Probability gauge -->
            <div class="prediction-gauge" :aria-label="`Probability bar: ${predictionResult.team_a.win_probability}% vs ${predictionResult.team_b.win_probability}%`">
              <div class="prediction-gauge__track">
                <div class="prediction-gauge__fill prediction-gauge__fill--a" :style="{ width: predictionResult.team_a.win_probability + '%' }">
                  <span class="prediction-gauge__value">{{ predictionResult.team_a.win_probability }}%</span>
                </div>
                <div class="prediction-gauge__fill prediction-gauge__fill--b" :style="{ width: predictionResult.team_b.win_probability + '%' }">
                  <span class="prediction-gauge__value">{{ predictionResult.team_b.win_probability }}%</span>
                </div>
                <div class="prediction-gauge__center" aria-hidden="true"></div>
              </div>
              <div class="prediction-gauge__axis">
                <span>0%</span>
                <span>50/50</span>
                <span>100%</span>
              </div>
            </div>

            <!-- AI reasoning card -->
            <div class="prediction-reasoning">
              <div class="prediction-reasoning__head">
                <span class="prediction-reasoning__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <div class="prediction-reasoning__head-text">
                  <h4 class="prediction-reasoning__title">Analisis AI</h4>
                  <p class="prediction-reasoning__hint">
                    <span v-if="reasoningLoading">OpenRouter sedang menulis alasan prediksi...</span>
                    <span v-else-if="reasoning?.model">Diberdayakan oleh {{ reasoning.model }}</span>
                    <span v-else-if="reasoningError">Narasi AI tidak tersedia, menggunakan ringkasan data.</span>
                    <span v-else>Kenapa salah satu tim diprediksi menang?</span>
                  </p>
                </div>
              </div>

              <div v-if="reasoningLoading" class="prediction-reasoning__skeleton">
                <span></span><span></span><span></span>
              </div>

              <div v-else-if="reasoning">
                <p class="prediction-reasoning__summary">“{{ reasoning.summary }}”</p>
                <div v-if="reasoning.key_factors?.length" class="prediction-factors">
                  <div
                    v-for="(f, idx) in reasoning.key_factors"
                    :key="`factor-${idx}`"
                    class="prediction-factor"
                    :class="`prediction-factor--${f.team}`"
                  >
                    <span class="prediction-factor__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path :d="factorTypeIcon(f.type)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <div class="prediction-factor__body">
                      <div class="prediction-factor__title-row">
                        <span class="prediction-factor__title">{{ f.title }}</span>
                        <span class="prediction-factor__type">{{ factorTypeLabel(f.type) }}</span>
                      </div>
                      <p class="prediction-factor__desc">{{ f.description }}</p>
                    </div>
                    <span
                      class="prediction-factor__tag"
                      :class="`prediction-factor__tag--${f.team}`"
                      v-if="f.team !== 'neutral'"
                    >
                      {{ f.team === 'team_a' ? teamAName : teamBName }}
                    </span>
                  </div>
                </div>
                <p v-if="reasoning.warning" class="prediction-reasoning__warning">⚠ {{ reasoning.warning }}</p>
              </div>

              <div v-else-if="reasoningError" class="prediction-reasoning__error">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden="true"><path d="M12 9v4 M12 17h.01 M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ reasoningError }}
                <button type="button" class="prediction-reasoning__retry" @click="fetchReasoning" :disabled="reasoningLoading">Coba lagi</button>
              </div>
            </div>

            <!-- Detailed player breakdown -->
            <div class="prediction-detail-grid">
              <div class="prediction-team prediction-team--a">
                <header class="prediction-team__header">
                  <div>
                    <span class="prediction-team__tag">Team A</span>
                    <h4 class="prediction-team__title">{{ teamAName }}</h4>
                  </div>
                  <div class="prediction-team__stat">
                    <span class="prediction-team__stat-num">{{ predictionResult.team_a.win_probability }}%</span>
                    <span class="prediction-team__stat-lbl">Win prob</span>
                  </div>
                </header>
                <ul class="prediction-player-list">
                  <li
                    v-for="p in predictionResult.team_a.players"
                    :key="`pa-${p.player_id}`"
                    class="prediction-player-row"
                  >
                    <img :src="playerAvatar('team_a', p)" :alt="p.username ?? 'player'" class="prediction-player-row__avatar">
                    <div class="prediction-player-row__info">
                      <div class="prediction-player-row__name-row">
                        <span class="prediction-player-row__name">{{ p.username ?? `#${p.player_id}` }}</span>
                        <span class="prediction-player-row__score">Score {{ p.score.toFixed(2) }}</span>
                      </div>
                      <div class="prediction-player-row__streak" aria-label="Recent form">
                        <span
                          v-for="(s, i) in formStreak(p)"
                          :key="`pas-${p.player_id}-${i}`"
                          class="form-dot"
                          :class="{ 'form-dot--w': s === 'W', 'form-dot--l': s === 'L', 'form-dot--n': s === '-' }"
                        >{{ s }}</span>
                        <span class="prediction-player-row__form-pct">{{ formatPct(p.recent_form.rate) }}</span>
                      </div>
                      <div class="prediction-player-row__stats">
                        <span class="stat-chip">Overall {{ formatPct(p.overall.rate) }} · {{ p.overall.matches }}m</span>
                        <span v-if="p.hero_mastery" class="stat-chip stat-chip--hero">Hero {{ formatPct(p.hero_mastery.rate) }} · {{ p.hero_mastery.matches }}m</span>
                        <span v-if="p.role_mastery" class="stat-chip stat-chip--role">Role {{ formatPct(p.role_mastery.rate) }} · {{ p.role_mastery.matches }}m</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              <div class="prediction-team prediction-team--b">
                <header class="prediction-team__header">
                  <div>
                    <span class="prediction-team__tag">Team B</span>
                    <h4 class="prediction-team__title">{{ teamBName }}</h4>
                  </div>
                  <div class="prediction-team__stat">
                    <span class="prediction-team__stat-num">{{ predictionResult.team_b.win_probability }}%</span>
                    <span class="prediction-team__stat-lbl">Win prob</span>
                  </div>
                </header>
                <ul class="prediction-player-list">
                  <li
                    v-for="p in predictionResult.team_b.players"
                    :key="`pb-${p.player_id}`"
                    class="prediction-player-row"
                  >
                    <img :src="playerAvatar('team_b', p)" :alt="p.username ?? 'player'" class="prediction-player-row__avatar">
                    <div class="prediction-player-row__info">
                      <div class="prediction-player-row__name-row">
                        <span class="prediction-player-row__name">{{ p.username ?? `#${p.player_id}` }}</span>
                        <span class="prediction-player-row__score">Score {{ p.score.toFixed(2) }}</span>
                      </div>
                      <div class="prediction-player-row__streak" aria-label="Recent form">
                        <span
                          v-for="(s, i) in formStreak(p)"
                          :key="`pbs-${p.player_id}-${i}`"
                          class="form-dot"
                          :class="{ 'form-dot--w': s === 'W', 'form-dot--l': s === 'L', 'form-dot--n': s === '-' }"
                        >{{ s }}</span>
                        <span class="prediction-player-row__form-pct">{{ formatPct(p.recent_form.rate) }}</span>
                      </div>
                      <div class="prediction-player-row__stats">
                        <span class="stat-chip">Overall {{ formatPct(p.overall.rate) }} · {{ p.overall.matches }}m</span>
                        <span v-if="p.hero_mastery" class="stat-chip stat-chip--hero">Hero {{ formatPct(p.hero_mastery.rate) }} · {{ p.hero_mastery.matches }}m</span>
                        <span v-if="p.role_mastery" class="stat-chip stat-chip--role">Role {{ formatPct(p.role_mastery.rate) }} · {{ p.role_mastery.matches }}m</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Weights footer -->
            <div class="prediction-weights">
              <span class="prediction-weights__label">Model weights:</span>
              <span
                v-for="(w, key) in predictionResult.weights"
                :key="`w-${key}`"
                class="weight-chip"
              >
                {{ String(key).replace('_', ' ') }}
                <strong>{{ Math.round(w * 100) }}%</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="slots.length" ref="mapSectionRef" class="panel panel--map">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">3. MLBB Map Mapping</h2>
            <p class="panel__subtitle">Visualisasi hasil random battle di atas map Mobile Legends</p>
          </div>
        </div>
        <div class="mlbb-map">
          <img :src="mapImageUrl" alt="Mobile Legends map" class="mlbb-map__image">

          <template v-for="lane in LANES" :key="`map-a-${lane.key}`">
            <div
              v-if="slotByLane.get(lane.key)"
              class="map-marker map-marker--a"
              :class="`map-marker--${lane.key}`"
            >
              <img :src="avatarUrl(slotByLane.get(lane.key)!.playerA)" :alt="slotByLane.get(lane.key)!.playerA.username" class="map-marker__avatar">
              <div class="map-marker__text">
                <span class="map-marker__name">{{ slotByLane.get(lane.key)!.playerA.username }}</span>
                <span class="map-marker__lane">{{ lane.short }}</span>
              </div>
            </div>
          </template>

          <template v-for="lane in LANES" :key="`map-b-${lane.key}`">
            <div
              v-if="slotByLane.get(lane.key)"
              class="map-marker map-marker--b"
              :class="`map-marker--${lane.key}`"
            >
              <div class="map-marker__text map-marker__text--b">
                <span class="map-marker__name">{{ slotByLane.get(lane.key)!.playerB.username }}</span>
                <span class="map-marker__lane">{{ lane.short }}</span>
              </div>
              <img :src="avatarUrl(slotByLane.get(lane.key)!.playerB)" :alt="slotByLane.get(lane.key)!.playerB.username" class="map-marker__avatar">
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.battle-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.battle-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ============ HERO ============ */
.battle-hero {
  position: relative;
  overflow: hidden;
  padding: 48px 32px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  background:
    radial-gradient(circle at 15% 20%, rgba(239, 68, 68, 0.12), transparent 55%),
    radial-gradient(circle at 85% 80%, rgba(0, 255, 135, 0.15), transparent 55%),
    linear-gradient(135deg, #0a1612 0%, #0d1f17 45%, #0a0a0a 100%);
  box-shadow: var(--shadow-glow-strong);
}

.battle-hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 255, 135, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 135, 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.9), transparent 70%);
}

.battle-hero__scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0, 255, 135, 0.08) 50%, transparent 60%);
  animation: scan-move 4s linear infinite;
  pointer-events: none;
}

@keyframes scan-move {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.battle-hero__content {
  position: relative;
  max-width: 820px;
  margin: 0 auto;
  text-align: center;
}

.battle-hero__eyebrow {
  display: inline-block;
  padding: 6px 14px;
  font-family: 'Teko', var(--font-heading);
  letter-spacing: 2.5px;
  font-size: 0.95rem;
  color: var(--green-neon);
  background: rgba(0, 255, 135, 0.08);
  border: 1px solid rgba(0, 255, 135, 0.3);
  border-radius: 99px;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.battle-hero__title {
  font-family: 'Teko', var(--font-heading);
  font-size: clamp(2.5rem, 6vw, 4.25rem);
  line-height: 1;
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.battle-hero__subtitle {
  font-size: 1.02rem;
  color: var(--text-secondary);
  max-width: 680px;
  margin: 0 auto;
}
.battle-hero__subtitle strong {
  color: var(--green-neon);
  font-weight: 600;
}

/* ============ PANEL ============ */
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.panel__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.9rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.panel__subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.panel__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.counter {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  font-family: 'Teko', var(--font-heading);
}
.counter--ok {
  background: rgba(0, 255, 135, 0.08);
  border-color: rgba(0, 255, 135, 0.4);
}
.counter__num {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--green-neon);
  line-height: 1;
}
.counter__label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* ============ PLAYER CHIPS ============ */
.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.player-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 99px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all var(--transition);
  position: relative;
  text-align: left;
}
.player-chip:hover {
  border-color: rgba(0, 255, 135, 0.4);
  background: rgba(0, 255, 135, 0.04);
  transform: translateY(-1px);
}
.player-chip--active {
  border-color: var(--green-neon);
  background: rgba(0, 255, 135, 0.1);
  box-shadow: 0 0 12px rgba(0, 255, 135, 0.25), inset 0 0 0 1px rgba(0, 255, 135, 0.2);
}
.player-chip__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
}
.player-chip--active .player-chip__avatar {
  border-color: var(--green-neon);
}
.player-chip__name {
  flex: 1;
  font-size: 0.92rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player-chip__badge {
  width: 18px;
  height: 18px;
  color: var(--green-neon);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition);
}
.player-chip--active .player-chip__badge {
  opacity: 1;
}
.player-chip__badge svg {
  width: 18px;
  height: 18px;
}

/* ============ BUTTONS ============ */
.btn-ghost, .btn-primary {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.02rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 7px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.btn-ghost:hover {
  color: var(--text-white);
  border-color: var(--green-neon);
  background: rgba(0, 255, 135, 0.05);
}
.btn-ghost--danger:hover {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(239, 68, 68, 0.05);
}
.btn-primary {
  background: var(--green-neon);
  color: #0a0a0a;
  border: 1px solid var(--green-neon);
  font-weight: 700;
}
.btn-primary:hover:not(:disabled) {
  background: var(--green-emerald);
  box-shadow: 0 0 15px rgba(0, 255, 135, 0.4);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============ CTA ROW ============ */
.cta-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
}

.team-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.team-input--b {
  align-items: flex-end;
}
.team-input__tag {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.9rem;
  letter-spacing: 2.5px;
  padding: 2px 10px;
  border-radius: 4px;
}
.team-input--a .team-input__tag {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.4);
}
.team-input--b .team-input__tag {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}
.team-input__field {
  width: 100%;
  padding: 12px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-white);
  font-family: 'Rajdhani', var(--font-heading);
  font-weight: 600;
  font-size: 1.15rem;
  letter-spacing: 0.5px;
  outline: none;
  transition: border-color var(--transition);
}
.team-input--a .team-input__field { text-align: left; }
.team-input--b .team-input__field { text-align: right; }
.team-input__field:focus {
  border-color: var(--green-neon);
  box-shadow: 0 0 0 2px rgba(0, 255, 135, 0.15);
}

.randomize-btn {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, #0f1f18 0%, #0a0a0a 100%);
  border: 2px solid var(--green-neon);
  color: var(--green-neon);
  cursor: pointer;
  transition: all var(--transition);
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 255, 135, 0.25), inset 0 0 20px rgba(0, 255, 135, 0.1);
}
.randomize-btn:hover:not(:disabled) {
  transform: scale(1.04);
  box-shadow: 0 0 40px rgba(0, 255, 135, 0.5), inset 0 0 30px rgba(0, 255, 135, 0.15);
}
.randomize-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--border-color);
  color: var(--text-secondary);
  box-shadow: none;
}
.randomize-btn__ring, .randomize-btn__ring--2 {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 1px dashed rgba(0, 255, 135, 0.4);
  animation: spin 10s linear infinite;
}
.randomize-btn__ring--2 {
  inset: 18px;
  border-style: dotted;
  border-color: rgba(0, 255, 135, 0.2);
  animation: spin 16s linear infinite reverse;
}
.randomize-btn__content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.randomize-btn__icon {
  width: 36px;
  height: 36px;
  stroke: currentColor;
}
.randomize-btn__label {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.25rem;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  font-weight: 600;
  max-width: 140px;
  text-align: center;
  line-height: 1.1;
}
.randomize-btn--rolling {
  animation: shake 0.3s ease-in-out infinite;
}
.randomize-btn--rolling .randomize-btn__ring {
  animation-duration: 0.5s;
  border-color: var(--green-neon);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-2px, 1px) rotate(-1deg); }
  75% { transform: translate(2px, -1px) rotate(1deg); }
}

.error-msg {
  margin-top: 14px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: var(--radius-md);
  color: #fca5a5;
  font-size: 0.9rem;
}

.ai-prompt {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-prompt__label {
  font-family: 'Teko', var(--font-heading);
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--green-neon);
  font-size: 1rem;
}

.ai-prompt__memory-note {
  font-size: 0.85rem;
  color: #86efac;
  background: rgba(22, 163, 74, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  border-radius: 8px;
  padding: 8px 10px;
}

.ai-prompt__field {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-white);
  resize: vertical;
  min-height: 92px;
}

.ai-prompt__field:focus {
  outline: none;
  border-color: var(--green-neon);
  box-shadow: 0 0 0 2px rgba(0, 255, 135, 0.14);
}

.ai-prompt__actions {
  display: flex;
  justify-content: flex-end;
}

/* ============ BATTLE MAP ============ */
.panel--battle {
  padding: 32px 32px 24px;
  background:
    radial-gradient(circle at 50% 50%, rgba(0, 255, 135, 0.05), transparent 60%),
    var(--bg-card);
  overflow: hidden;
  position: relative;
}
.panel--battle::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 255, 135, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 135, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  opacity: 0.6;
}

.panel--map {
  overflow: hidden;
}

.mlbb-map {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: #06121a;
}

.mlbb-map__image {
  display: block;
  width: 100%;
  height: auto;
  min-height: 360px;
  object-fit: cover;
  filter: saturate(1.05) contrast(1.03);
}

.map-marker {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 10px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  max-width: 200px;
}

.map-marker--a {
  background: rgba(6, 182, 212, 0.22);
}

.map-marker--b {
  background: rgba(239, 68, 68, 0.22);
}

.map-marker__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.65);
  flex-shrink: 0;
}

.map-marker__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.map-marker__text--b {
  text-align: right;
  align-items: flex-end;
}

.map-marker__name {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.map-marker__lane {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: #d1fae5;
}

/* Approx lane coordinates on basic map image */
/* Follow reference mapping:
   https://res.cloudinary.com/dkjkd4jt9/image/upload/v1776704502/basic_copy_urxxqb.jpg */
.map-marker--gold.map-marker--a { left: 21%; top: 24%; }
.map-marker--roam.map-marker--a { left: 18%; top: 42%; }
/* Mid & Jungle A: geser kanan + maju ke arah pusat / lane (lawan) */
.map-marker--mid.map-marker--a { left: 42%; top: 34%; }
.map-marker--jungle.map-marker--a { left: 48%; top: 45%; }
.map-marker--exp.map-marker--a { left: 54%; top: 80%; }

.map-marker--gold.map-marker--b { right: 69%; top: 10%; }
.map-marker--roam.map-marker--b { right: 52%; top: 4%; }
.map-marker--mid.map-marker--b { right: 42%; top: 30%; }
.map-marker--jungle.map-marker--b { right: 32%; top: 38%; }
.map-marker--exp.map-marker--b { right: 15%; top: 44%; }

.battle-map {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 14px 24px;
  z-index: 1;
}

.battle-map__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-radius: var(--radius-lg);
  margin-bottom: 10px;
}
.battle-map__header--a {
  justify-content: flex-start;
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.18), rgba(6, 182, 212, 0.02));
  border: 1px solid rgba(6, 182, 212, 0.35);
}
.battle-map__header--b {
  justify-content: flex-end;
  background: linear-gradient(270deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.02));
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.battle-map__flag {
  font-size: 1.4rem;
  animation: pulse-scale 2s ease-in-out infinite;
}
.battle-map__flag--a { color: #22d3ee; text-shadow: 0 0 8px rgba(34, 211, 238, 0.6); }
.battle-map__flag--b { color: #f87171; text-shadow: 0 0 8px rgba(248, 113, 113, 0.6); }

.battle-map__team-name {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.75rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-white);
  line-height: 1;
}
.battle-map__team-sub {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.85rem;
  letter-spacing: 2.5px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.battle-map__vs-main {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  padding: 0 10px;
}
.battle-map__vs-text {
  font-family: 'Teko', var(--font-heading);
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--green-neon);
  letter-spacing: 2px;
  text-shadow: 0 0 15px rgba(0, 255, 135, 0.6);
  animation: pulse-scale 2.5s ease-in-out infinite;
}

@keyframes pulse-scale {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}

/* Lane row */
.lane-row {
  display: contents;
}

.panel--revealed .slot,
.panel--revealed .lane-node {
  animation: slot-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  animation-delay: var(--lane-delay, 0ms);
}
.panel--revealed .slot--b {
  animation-name: slot-reveal-right;
}
@keyframes slot-reveal {
  0% { opacity: 0; transform: translateX(-40px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes slot-reveal-right {
  0% { opacity: 0; transform: translateX(40px); }
  100% { opacity: 1; transform: translateX(0); }
}

.slot {
  display: flex;
  align-items: center;
  gap: 12px;
}
.slot--a { justify-content: flex-end; }
.slot--b { justify-content: flex-start; }

.slot__card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--lane-color);
  border-radius: var(--radius-md);
  min-width: 220px;
  transition: all var(--transition);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}
.slot__card--b {
  border-left: 1px solid var(--border-color);
  border-right: 3px solid var(--lane-color);
}
.slot__card:hover {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 14px color-mix(in srgb, var(--lane-color) 25%, transparent);
}
.slot__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--bg-input);
  border: 2px solid var(--lane-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--lane-color) 40%, transparent);
  flex-shrink: 0;
}
.slot__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.slot__info--b { align-items: flex-end; text-align: right; }
.slot__name {
  font-family: 'Rajdhani', var(--font-heading);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-white);
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.slot__role {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.85rem;
  letter-spacing: 2px;
  font-weight: 600;
}

.slot__arrow {
  width: 18px;
  height: 18px;
  color: var(--lane-color);
  opacity: 0.7;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--lane-color) 60%, transparent));
}
.slot__arrow svg { width: 18px; height: 18px; }

/* Lane node (center) */
.lane-node {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 140px;
  position: relative;
}
.lane-node__line {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--lane-color), transparent);
  opacity: 0.65;
  position: relative;
}
.lane-node__line::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  transform: translateY(-50%);
  background: color-mix(in srgb, var(--lane-color) 30%, transparent);
  filter: blur(1px);
}
.lane-node__core {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  background: radial-gradient(circle, color-mix(in srgb, var(--lane-color) 20%, transparent), transparent 80%), var(--bg-card);
  border: 1px solid color-mix(in srgb, var(--lane-color) 45%, transparent);
  border-radius: var(--radius-md);
  box-shadow: 0 0 16px color-mix(in srgb, var(--lane-color) 30%, transparent);
  min-width: 110px;
}
.lane-node__icon {
  width: 22px;
  height: 22px;
  stroke: var(--lane-color);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--lane-color) 70%, transparent));
}
.lane-node__label {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.95rem;
  letter-spacing: 2px;
  color: var(--lane-color);
  text-transform: uppercase;
  font-weight: 600;
  line-height: 1;
}

/* rolling state */
.panel--rolling .slot__card,
.panel--rolling .lane-node__core {
  animation: flicker 0.15s linear infinite alternate;
}
@keyframes flicker {
  from { opacity: 0.5; filter: blur(0.5px); }
  to { opacity: 1; filter: blur(0); }
}

/* ============ BATTLE FOOTER ============ */
.battle-footer {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px dashed var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.battle-footer__summary {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.mini-team {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mini-team__label {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.05rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-white);
}
.mini-team__avatars {
  display: flex;
}
.mini-team__av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--bg-card);
  background: var(--bg-input);
  margin-left: -8px;
}
.mini-team__av:first-child { margin-left: 0; }
.mini-team--a .mini-team__av { border-color: rgba(6, 182, 212, 0.5); }
.mini-team--b .mini-team__av { border-color: rgba(239, 68, 68, 0.5); }

.battle-footer__vs {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.25rem;
  color: var(--green-neon);
  letter-spacing: 2px;
  padding: 0 8px;
}

.battle-footer__actions {
  display: flex;
  gap: 10px;
}

.share-status {
  margin-top: 14px;
  font-size: 0.88rem;
  color: #86efac;
}

/* ============ PREDICT BUTTON ============ */
.btn-predict {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(124, 92, 255, 0.45);
  background: linear-gradient(135deg, #7c5cff 0%, #22d3ee 55%, #10b981 100%);
  background-size: 180% 180%;
  color: #0b0416;
  font-family: 'Teko', var(--font-heading);
  font-size: 1rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 10px 28px -10px rgba(124, 92, 255, 0.75),
    0 0 24px -4px rgba(34, 211, 238, 0.5);
  animation: predictSheen 4s ease-in-out infinite;
  transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.btn-predict:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.02);
  filter: brightness(1.08);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 14px 32px -10px rgba(124, 92, 255, 0.9),
    0 0 32px -2px rgba(34, 211, 238, 0.7);
}

.btn-predict:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}

.btn-predict:disabled {
  cursor: not-allowed;
  filter: grayscale(0.4) brightness(0.75);
  animation: none;
  box-shadow: none;
  opacity: 0.75;
}

.btn-predict__pulse {
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.35), transparent 45%),
              radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.25), transparent 50%);
  opacity: 0.6;
  pointer-events: none;
  mix-blend-mode: screen;
}

.btn-predict:not(:disabled)::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(124, 92, 255, 0.55) 60deg, transparent 140deg);
  filter: blur(8px);
  opacity: 0.7;
  z-index: -1;
  animation: predictHalo 4s linear infinite;
}

.btn-predict__icon {
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));
}

.btn-predict__label { position: relative; }

.btn-predict--loading {
  animation: predictSheen 2s ease-in-out infinite, predictPulse 1.2s ease-in-out infinite;
}

@keyframes predictSheen {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes predictHalo {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes predictPulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 10px 28px -10px rgba(124, 92, 255, 0.75); }
  50% { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 14px 36px -6px rgba(124, 92, 255, 1); }
}

/* ============ PREDICTION PANEL ============ */
.prediction-panel {
  margin-top: 18px;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(124, 92, 255, 0.25);
  background:
    radial-gradient(800px 300px at 10% -10%, rgba(124, 92, 255, 0.12), transparent 60%),
    radial-gradient(800px 300px at 110% 120%, rgba(34, 211, 238, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(10, 20, 30, 0.85), rgba(6, 18, 26, 0.95));
  position: relative;
  z-index: 1;
  overflow: hidden;
  box-shadow: 0 20px 48px -24px rgba(0, 0, 0, 0.9);
}

.prediction-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(124, 92, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(124, 92, 255, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
  pointer-events: none;
  opacity: 0.4;
}

.prediction-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  position: relative;
}

.prediction-panel__title-wrap { display: flex; flex-direction: column; gap: 4px; }

.prediction-panel__eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #c4b5fd;
  opacity: 0.85;
}

.prediction-panel__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Teko', var(--font-heading);
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #e9d5ff;
  font-size: 1.7rem;
  line-height: 1;
  text-shadow: 0 0 18px rgba(124, 92, 255, 0.35);
}

.prediction-panel__subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 54ch;
}

.prediction-panel__refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(196, 181, 253, 0.25);
  background: rgba(124, 92, 255, 0.08);
  color: #c4b5fd;
  font-size: 0.78rem;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.prediction-panel__refresh:hover:not(:disabled) {
  background: rgba(124, 92, 255, 0.18);
  border-color: rgba(196, 181, 253, 0.5);
}
.prediction-panel__refresh:disabled { cursor: not-allowed; opacity: 0.6; }

.prediction-panel__loading {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 8px;
}

.prediction-panel__error {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fca5a5;
  font-size: 0.9rem;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
}

.prediction-skeleton {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.prediction-skeleton__bar {
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  background-size: 200% 100%;
  animation: skeleton 1.3s ease-in-out infinite;
}
.prediction-skeleton__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.prediction-skeleton__box {
  height: 120px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
  background-size: 200% 100%;
  animation: skeleton 1.5s ease-in-out infinite;
}
@keyframes skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.prediction-result {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
}

/* Verdict banner */
.prediction-verdict {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(239, 68, 68, 0.08));
  position: relative;
  overflow: hidden;
}
.prediction-verdict--a::before,
.prediction-verdict--b::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
}
.prediction-verdict--a::before {
  background: radial-gradient(400px 160px at 0% 50%, rgba(34, 211, 238, 0.18), transparent 70%);
}
.prediction-verdict--b::before {
  background: radial-gradient(400px 160px at 100% 50%, rgba(239, 68, 68, 0.18), transparent 70%);
}

.prediction-verdict__team {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
}
.prediction-verdict__team--b { text-align: right; align-items: flex-end; }
.prediction-verdict__label {
  font-size: 0.65rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.prediction-verdict__team--a .prediction-verdict__label { color: #67e8f9; }
.prediction-verdict__team--b .prediction-verdict__label { color: #fca5a5; }

.prediction-verdict__name {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.3rem;
  letter-spacing: 1.2px;
  color: var(--text-white);
  line-height: 1;
  text-transform: uppercase;
}
.prediction-verdict__prob {
  font-family: 'Teko', var(--font-heading);
  font-size: 2.8rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 1px;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
.prediction-verdict__team--a .prediction-verdict__prob {
  background-image: linear-gradient(135deg, #22d3ee, #06b6d4);
}
.prediction-verdict__team--b .prediction-verdict__prob {
  background-image: linear-gradient(135deg, #f87171, #ef4444);
}
.prediction-verdict__score {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

.prediction-verdict__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  text-align: center;
  min-width: 150px;
  position: relative;
}
.prediction-verdict__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.62rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #c4b5fd;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(196, 181, 253, 0.3);
  background: rgba(124, 92, 255, 0.12);
}
.prediction-verdict__winner {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.55rem;
  letter-spacing: 1px;
  color: var(--text-white);
  line-height: 1.05;
  text-transform: uppercase;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.15);
}
.prediction-verdict__confidence {
  font-size: 0.75rem;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.4px;
}
.prediction-verdict__confidence--high {
  color: #bbf7d0;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.prediction-verdict__confidence--mid {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
}
.prediction-verdict__confidence--low {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.prediction-verdict__confidence--draw {
  color: #d1d5db;
  background: rgba(156, 163, 175, 0.15);
  border: 1px solid rgba(156, 163, 175, 0.35);
}

/* Gauge */
.prediction-gauge { display: flex; flex-direction: column; gap: 6px; }
.prediction-gauge__track {
  position: relative;
  display: flex;
  height: 42px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
}
.prediction-gauge__fill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Teko', var(--font-heading);
  font-size: 1.15rem;
  letter-spacing: 1.2px;
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
}
.prediction-gauge__fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 60%);
  pointer-events: none;
}
.prediction-gauge__fill--a {
  background: linear-gradient(90deg, #0891b2 0%, #22d3ee 100%);
  color: #041216;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);
}
.prediction-gauge__fill--b {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
.prediction-gauge__center {
  position: absolute;
  left: 50%;
  top: -4px;
  bottom: -4px;
  width: 2px;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.35);
  pointer-events: none;
}
.prediction-gauge__axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  padding: 0 4px;
}

/* AI reasoning card */
.prediction-reasoning {
  border-radius: 14px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.08), rgba(34, 211, 238, 0.04));
  border: 1px solid rgba(124, 92, 255, 0.25);
  position: relative;
  overflow: hidden;
}
.prediction-reasoning::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(500px 160px at 100% 0%, rgba(124, 92, 255, 0.18), transparent 70%);
  pointer-events: none;
}
.prediction-reasoning__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.prediction-reasoning__icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(124, 92, 255, 0.18);
  color: #c4b5fd;
  flex-shrink: 0;
  border: 1px solid rgba(196, 181, 253, 0.3);
}
.prediction-reasoning__head-text { display: flex; flex-direction: column; gap: 2px; }
.prediction-reasoning__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.25rem;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  color: #e9d5ff;
  line-height: 1;
}
.prediction-reasoning__hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.prediction-reasoning__summary {
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--text-primary);
  font-style: italic;
  border-left: 3px solid rgba(196, 181, 253, 0.5);
  padding-left: 12px;
  margin-bottom: 12px;
}
.prediction-reasoning__warning {
  margin-top: 10px;
  font-size: 0.78rem;
  color: #fcd34d;
}
.prediction-reasoning__error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fca5a5;
  font-size: 0.85rem;
}
.prediction-reasoning__retry {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
  color: #fecaca;
  cursor: pointer;
  font-size: 0.75rem;
}
.prediction-reasoning__retry:disabled { opacity: 0.5; cursor: not-allowed; }

.prediction-reasoning__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.prediction-reasoning__skeleton span {
  height: 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
  background-size: 200% 100%;
  animation: skeleton 1.3s ease-in-out infinite;
}
.prediction-reasoning__skeleton span:nth-child(2) { width: 92%; }
.prediction-reasoning__skeleton span:nth-child(3) { width: 74%; }

.prediction-factors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.prediction-factor {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.prediction-factor--team_a { border-left: 3px solid rgba(34, 211, 238, 0.6); }
.prediction-factor--team_b { border-left: 3px solid rgba(239, 68, 68, 0.6); }
.prediction-factor--neutral { border-left: 3px solid rgba(196, 181, 253, 0.4); }
.prediction-factor__icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}
.prediction-factor--team_a .prediction-factor__icon { color: #67e8f9; background: rgba(34, 211, 238, 0.12); }
.prediction-factor--team_b .prediction-factor__icon { color: #fca5a5; background: rgba(239, 68, 68, 0.12); }
.prediction-factor__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.prediction-factor__title-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
}
.prediction-factor__title {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-white);
}
.prediction-factor__type {
  font-size: 0.63rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--text-secondary);
  opacity: 0.85;
}
.prediction-factor__desc {
  font-size: 0.78rem;
  color: var(--text-primary);
  line-height: 1.4;
}
.prediction-factor__tag {
  font-size: 0.62rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
  align-self: center;
}
.prediction-factor__tag--team_a {
  color: #041216;
  background: linear-gradient(135deg, #22d3ee, #06b6d4);
}
.prediction-factor__tag--team_b {
  color: #fff;
  background: linear-gradient(135deg, #f87171, #ef4444);
}

/* Detail grid */
.prediction-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.prediction-team {
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.02);
}
.prediction-team--a {
  border-color: rgba(6, 182, 212, 0.35);
  background: linear-gradient(180deg, rgba(6, 182, 212, 0.06), rgba(6, 182, 212, 0.02));
}
.prediction-team--b {
  border-color: rgba(239, 68, 68, 0.35);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.06), rgba(239, 68, 68, 0.02));
}

.prediction-team__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
}
.prediction-team__tag {
  font-size: 0.62rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.prediction-team--a .prediction-team__tag { color: #67e8f9; }
.prediction-team--b .prediction-team__tag { color: #fca5a5; }

.prediction-team__title {
  font-family: 'Teko', var(--font-heading);
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--text-white);
  font-size: 1.25rem;
  line-height: 1;
  margin-top: 2px;
}
.prediction-team__stat { display: flex; flex-direction: column; align-items: flex-end; }
.prediction-team__stat-num {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.8rem;
  line-height: 1;
}
.prediction-team--a .prediction-team__stat-num { color: #22d3ee; }
.prediction-team--b .prediction-team__stat-num { color: #ef4444; }
.prediction-team__stat-lbl {
  font-size: 0.62rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.prediction-player-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.prediction-player-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.prediction-player-row__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
}
.prediction-team--a .prediction-player-row__avatar { border-color: rgba(34, 211, 238, 0.5); }
.prediction-team--b .prediction-player-row__avatar { border-color: rgba(239, 68, 68, 0.5); }
.prediction-player-row__info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.prediction-player-row__name-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.prediction-player-row__name {
  font-weight: 600;
  color: var(--text-white);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prediction-player-row__score {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.prediction-player-row__streak {
  display: flex;
  gap: 3px;
  align-items: center;
}
.prediction-player-row__form-pct {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  margin-left: 4px;
}
.form-dot {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  border: 1px solid transparent;
}
.form-dot--w {
  color: #bbf7d0;
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.45);
}
.form-dot--l {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.4);
}
.form-dot--n {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.prediction-player-row__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.stat-chip {
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  white-space: nowrap;
}
.stat-chip--hero {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
}
.stat-chip--role {
  color: #c4b5fd;
  background: rgba(124, 92, 255, 0.08);
  border-color: rgba(124, 92, 255, 0.25);
}

/* Weights footer */
.prediction-weights {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--text-secondary);
  padding-top: 6px;
}
.prediction-weights__label {
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-size: 0.62rem;
  opacity: 0.8;
}
.weight-chip {
  display: inline-flex;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  text-transform: capitalize;
}
.weight-chip strong { color: var(--text-white); }

@media (max-width: 900px) {
  .prediction-verdict {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .prediction-verdict__team--b { align-items: center; text-align: center; }
  .prediction-detail-grid { grid-template-columns: 1fr; }
}

/* ============ RESPONSIVE ============ */
@media (max-width: 900px) {
  .cta-row {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .team-input--b { align-items: stretch; }
  .team-input--b .team-input__field { text-align: left; }
  .randomize-btn {
    margin: 0 auto;
  }

  .battle-map {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .battle-map__vs-main,
  .battle-map__header--a,
  .battle-map__header--b {
    justify-content: center;
    text-align: center;
  }
  .lane-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid var(--border-subtle);
  }
  .slot, .slot--a, .slot--b {
    justify-content: center;
  }
  .slot__arrow { display: none; }
  .lane-node {
    min-width: unset;
    justify-content: center;
  }
  .lane-node__line { display: none; }

  .map-marker {
    max-width: 150px;
    padding: 5px 6px;
    gap: 6px;
  }
  .map-marker__avatar {
    width: 22px;
    height: 22px;
  }
  .map-marker__name {
    font-size: 0.72rem;
    font-weight: 700;
  }
  .map-marker__lane {
    font-size: 0.6rem;
  }

  .prediction-result__detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .battle-hero { padding: 32px 18px; }
  .panel { padding: 18px; }
  .panel__header { flex-direction: column; align-items: stretch; }
  .slot__card { min-width: unset; width: 100%; }
  .slot__name { max-width: none; }
}
</style>
