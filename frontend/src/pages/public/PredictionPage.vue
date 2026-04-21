<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { predictionApi, playersApi, heroesApi, rolesApi } from '@/services/api'
import type { Hero, Player, PredictionResponse, PredictionSlot, Role } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface SlotState {
  player_id: number | null
  hero_id: number | null
  role_id: number | null
}

const players = ref<Player[]>([])
const heroes = ref<Hero[]>([])
const roles = ref<Role[]>([])

const teamA = ref<SlotState[]>(Array.from({ length: 5 }, () => ({ player_id: null, hero_id: null, role_id: null })))
const teamB = ref<SlotState[]>(Array.from({ length: 5 }, () => ({ player_id: null, hero_id: null, role_id: null })))

const result = ref<PredictionResponse | null>(null)
const loading = ref(false)
const errorMsg = ref<string | null>(null)

async function loadOptions() {
  const [playersResp, heroesResp, rolesResp] = await Promise.all([
    playersApi.getPlayers({ per_page: 200 }),
    heroesApi.getHeroes({ per_page: 500 }),
    rolesApi.getRoles({}),
  ])
  const pData = (playersResp.data as unknown as { data?: Player[] }).data
  const hData = (heroesResp.data as unknown as { data?: Hero[] }).data
  const rData = (rolesResp.data as unknown as { data?: Role[] }).data
  players.value = Array.isArray(pData) ? pData : []
  heroes.value = Array.isArray(hData) ? hData : []
  roles.value = Array.isArray(rData) ? rData : []
}

function sanitizeSlots(slots: SlotState[]): PredictionSlot[] {
  return slots
    .filter(slot => slot.player_id)
    .map(slot => ({
      player_id: slot.player_id as number,
      hero_id: slot.hero_id ?? null,
      role_id: slot.role_id ?? null,
    }))
}

async function predict() {
  errorMsg.value = null
  const slotsA = sanitizeSlots(teamA.value)
  const slotsB = sanitizeSlots(teamB.value)
  if (!slotsA.length || !slotsB.length) {
    errorMsg.value = 'Minimal satu player di tiap tim.'
    return
  }

  loading.value = true
  try {
    const response = await predictionApi.predict(slotsA, slotsB)
    result.value = response.data
  } catch {
    errorMsg.value = 'Gagal memproses prediksi.'
    result.value = null
  } finally {
    loading.value = false
  }
}

function fillAutoRoles() {
  if (!roles.value.length) return
  for (let i = 0; i < 5; i++) {
    if (!teamA.value[i]!.role_id) teamA.value[i]!.role_id = roles.value[i]?.id ?? null
    if (!teamB.value[i]!.role_id) teamB.value[i]!.role_id = roles.value[i]?.id ?? null
  }
}

onMounted(loadOptions)

const probA = computed(() => result.value?.team_a.win_probability ?? 0)
const probB = computed(() => result.value?.team_b.win_probability ?? 0)

function favor(result: PredictionResponse | null) {
  if (!result) return ''
  if (result.team_a.win_probability > result.team_b.win_probability) return 'team_a'
  if (result.team_b.win_probability > result.team_a.win_probability) return 'team_b'
  return 'draw'
}
</script>

<template>
  <div class="prediction-page">
    <div class="page-header">
      <h1 class="page-title">Win <span class="gradient-text">Prediction</span></h1>
      <p class="page-subtitle">Susun lineup dua tim, kami hitung peluang menang berdasarkan form, hero pool, dan role.</p>
    </div>

    <div class="prediction-toolbar card">
      <div class="toolbar-actions">
        <button class="btn btn-secondary btn-sm" @click="fillAutoRoles">Auto-fill role</button>
        <button class="btn btn-primary" :disabled="loading" @click="predict">
          {{ loading ? 'Menghitung...' : 'Prediksi Peluang Menang' }}
        </button>
      </div>
      <div v-if="errorMsg" class="text-muted">{{ errorMsg }}</div>
    </div>

    <div class="teams-grid">
      <section class="card team-card">
        <h3 class="team-title">Team A</h3>
        <div v-for="(slot, idx) in teamA" :key="`a-${idx}`" class="slot-row">
          <select v-model="slot.player_id" class="form-select form-select-sm">
            <option :value="null">Player {{ idx + 1 }}</option>
            <option v-for="p in players" :key="p.id" :value="p.id">{{ p.username }}</option>
          </select>
          <select v-model="slot.hero_id" class="form-select form-select-sm">
            <option :value="null">Hero</option>
            <option v-for="h in heroes" :key="h.id" :value="h.id">{{ h.name }}</option>
          </select>
          <select v-model="slot.role_id" class="form-select form-select-sm">
            <option :value="null">Role</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </section>

      <section class="card team-card">
        <h3 class="team-title team-title--b">Team B</h3>
        <div v-for="(slot, idx) in teamB" :key="`b-${idx}`" class="slot-row">
          <select v-model="slot.player_id" class="form-select form-select-sm">
            <option :value="null">Player {{ idx + 1 }}</option>
            <option v-for="p in players" :key="p.id" :value="p.id">{{ p.username }}</option>
          </select>
          <select v-model="slot.hero_id" class="form-select form-select-sm">
            <option :value="null">Hero</option>
            <option v-for="h in heroes" :key="h.id" :value="h.id">{{ h.name }}</option>
          </select>
          <select v-model="slot.role_id" class="form-select form-select-sm">
            <option :value="null">Role</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </section>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="result" class="prediction-result">
      <div class="probability-bar">
        <div
          class="probability-bar__a"
          :style="{ width: probA + '%' }"
        >
          <span>{{ probA }}%</span>
        </div>
        <div
          class="probability-bar__b"
          :style="{ width: probB + '%' }"
        >
          <span>{{ probB }}%</span>
        </div>
      </div>
      <div class="favored">
        <span v-if="favor(result) === 'team_a'" class="badge badge-green">Team A diunggulkan</span>
        <span v-else-if="favor(result) === 'team_b'" class="badge badge-red">Team B diunggulkan</span>
        <span v-else class="badge badge-gray">Imbang</span>
        <span class="confidence">Confidence: <strong>{{ result.confidence }}%</strong></span>
      </div>

      <div class="breakdown-grid">
        <div class="card breakdown-card">
          <h4 class="breakdown-title">Team A Breakdown</h4>
          <div v-for="p in result.team_a.players" :key="p.player_id" class="player-breakdown">
            <div class="player-breakdown__head">
              <strong>{{ p.username }}</strong>
              <span class="badge badge-green">Score {{ p.score }}</span>
            </div>
            <div class="player-breakdown__meta">
              <span>Form: {{ p.recent_form.wins }}/{{ p.recent_form.matches }} ({{ Math.round(p.recent_form.rate * 100) }}%)</span>
              <span v-if="p.hero_mastery">Hero: {{ p.hero_mastery.wins }}/{{ p.hero_mastery.matches }}</span>
              <span v-if="p.role_mastery">Role: {{ p.role_mastery.wins }}/{{ p.role_mastery.matches }}</span>
            </div>
          </div>
        </div>

        <div class="card breakdown-card">
          <h4 class="breakdown-title breakdown-title--b">Team B Breakdown</h4>
          <div v-for="p in result.team_b.players" :key="p.player_id" class="player-breakdown">
            <div class="player-breakdown__head">
              <strong>{{ p.username }}</strong>
              <span class="badge badge-red">Score {{ p.score }}</span>
            </div>
            <div class="player-breakdown__meta">
              <span>Form: {{ p.recent_form.wins }}/{{ p.recent_form.matches }} ({{ Math.round(p.recent_form.rate * 100) }}%)</span>
              <span v-if="p.hero_mastery">Hero: {{ p.hero_mastery.wins }}/{{ p.hero_mastery.matches }}</span>
              <span v-if="p.role_mastery">Role: {{ p.role_mastery.wins }}/{{ p.role_mastery.matches }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="weight-hint">
        <span>Bobot model →</span>
        <span v-for="(w, name) in result.weights" :key="name">{{ name }}: {{ Math.round(w * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prediction-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.team-title {
  font-family: var(--font-heading);
  color: var(--green-neon);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.team-title--b {
  color: var(--danger);
}

.slot-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1.5fr;
  gap: 8px;
  margin-bottom: 8px;
}

.form-select-sm {
  padding: 8px 10px;
  font-size: 0.85rem;
}

.probability-bar {
  display: flex;
  height: 42px;
  border-radius: 21px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.probability-bar__a,
.probability-bar__b {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-family: var(--font-heading);
  font-weight: 700;
  transition: width 0.5s ease;
  min-width: 24px;
}

.probability-bar__a {
  background: linear-gradient(90deg, var(--green-neon), var(--green-emerald));
}

.probability-bar__b {
  background: linear-gradient(90deg, #f87171, var(--danger));
  color: #fff;
}

.favored {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
}

.confidence {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.breakdown-title {
  font-family: var(--font-heading);
  color: var(--green-neon);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 12px;
}

.breakdown-title--b {
  color: var(--danger);
}

.player-breakdown {
  background: rgba(13, 31, 23, 0.35);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  margin-bottom: 10px;
}

.player-breakdown__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.player-breakdown__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.weight-hint {
  display: inline-flex;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: capitalize;
}

@media (max-width: 960px) {
  .teams-grid,
  .breakdown-grid {
    grid-template-columns: 1fr;
  }

  .slot-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
