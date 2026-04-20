<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { battleApi, playersApi } from '@/services/api'
import type { BattleAiResponse, Player } from '@/types'
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

const selectedPlayers = computed(() => players.value.filter(p => selectedIds.value.has(p.id)))
const selectedCount = computed(() => selectedIds.value.size)
const canRandomize = computed(() => selectedCount.value >= 10 && !rolling.value)
const canAiRandomize = computed(() => selectedCount.value >= 10 && !rolling.value && !aiLoading.value && aiPrompt.value.trim().length > 0)
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

async function randomize() {
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

    const payload = {
      prompt: aiPrompt.value.trim(),
      team_a_name: teamAName.value,
      team_b_name: teamBName.value,
      players: selectedPlayers.value.map((p) => ({ id: p.id, username: p.username })),
      current_slots: currentSlots,
      instruction_history: aiInstructionHistory.value,
    }
    const res = await battleApi.aiRandomize(payload)
    const data = res.data as BattleAiResponse
    const nextSlots = buildSlotsFromAiResult(data)

    if (nextSlots.length !== 5) {
      throw new Error('AI result is incomplete')
    }

    teamAName.value = data.team_a_name || teamAName.value
    teamBName.value = data.team_b_name || teamBName.value
    slots.value = nextSlots
    revealed.value = true
    aiInstructionHistory.value = [...aiInstructionHistory.value, aiPrompt.value.trim()].slice(-20)
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
}

function resetAiMemory() {
  aiInstructionHistory.value = []
}

function avatarUrl(player: Player) {
  return player.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(player.username)}`
}
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

    <div v-else>
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
      <section v-if="slots.length" class="panel panel--battle" :class="{ 'panel--rolling': rolling, 'panel--revealed': revealed }">
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
            <button class="btn-primary" @click="randomize" :disabled="rolling">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 12a9 9 0 0 1 -15 6.7L3 16 M21 3v5h-5 M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Re-Roll
            </button>
          </div>
        </div>
      </section>

      <section v-if="slots.length" class="panel panel--map">
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
  max-width: 190px;
}

.map-marker--a {
  background: rgba(6, 182, 212, 0.22);
}

.map-marker--b {
  background: rgba(239, 68, 68, 0.22);
}

.map-marker__avatar {
  width: 24px;
  height: 24px;
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
  font-size: 0.75rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
}

.map-marker__lane {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.72rem;
  letter-spacing: 1.4px;
  color: #d1fae5;
}

/* Approx lane coordinates on basic map image */
/* Follow reference mapping:
   https://res.cloudinary.com/dkjkd4jt9/image/upload/v1776704502/basic_copy_urxxqb.jpg */
.map-marker--gold.map-marker--a { left: 12%; top: 26%; }
.map-marker--roam.map-marker--a { left: 11%; top: 38%; }
.map-marker--mid.map-marker--a { left: 26%; top: 49%; }
.map-marker--jungle.map-marker--a { left: 24%; top: 63%; }
.map-marker--exp.map-marker--a { left: 54%; top: 80%; }

.map-marker--gold.map-marker--b { right: 69%; top: 10%; }
.map-marker--roam.map-marker--b { right: 63%; top: 10%; }
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
    max-width: 140px;
    padding: 4px 6px;
    gap: 6px;
  }
  .map-marker__avatar {
    width: 20px;
    height: 20px;
  }
  .map-marker__name {
    font-size: 0.68rem;
  }
  .map-marker__lane {
    font-size: 0.65rem;
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
