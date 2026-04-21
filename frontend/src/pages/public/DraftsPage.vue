<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { draftApi, patchesApi, heroesApi } from '@/services/api'
import type { DraftOverview, DraftRecommendation, Hero, Patch } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const loading = ref(true)
const patches = ref<Patch[]>([])
const selectedPatchId = ref<number | undefined>(undefined)
const overview = ref<DraftOverview | null>(null)

const heroes = ref<Hero[]>([])
const allyIds = ref<number[]>([])
const enemyIds = ref<number[]>([])
const recommendations = ref<DraftRecommendation[]>([])
const recommending = ref(false)
const recommendationError = ref<string | null>(null)

async function loadOverview() {
  loading.value = true
  try {
    const response = await draftApi.getOverview(selectedPatchId.value)
    overview.value = response.data
  } finally {
    loading.value = false
  }
}

async function loadHeroes() {
  const response = await heroesApi.getHeroes({ per_page: 500 })
  const data = (response.data as unknown as { data: Hero[] }).data ?? (response.data as unknown as Hero[])
  heroes.value = Array.isArray(data) ? data : []
}

async function loadPatches() {
  const response = await patchesApi.list()
  patches.value = response.data.data
}

function toggleAlly(id: number) {
  if (allyIds.value.includes(id)) {
    allyIds.value = allyIds.value.filter(h => h !== id)
  } else if (enemyIds.value.includes(id)) {
    return
  } else if (allyIds.value.length < 5) {
    allyIds.value = [...allyIds.value, id]
  }
}

function toggleEnemy(id: number) {
  if (enemyIds.value.includes(id)) {
    enemyIds.value = enemyIds.value.filter(h => h !== id)
  } else if (allyIds.value.includes(id)) {
    return
  } else if (enemyIds.value.length < 5) {
    enemyIds.value = [...enemyIds.value, id]
  }
}

async function runRecommendation() {
  recommending.value = true
  recommendationError.value = null
  try {
    const response = await draftApi.recommend(allyIds.value, enemyIds.value, 8)
    recommendations.value = response.data.data
    if (!recommendations.value.length) {
      recommendationError.value = 'Belum ada data yang cukup untuk rekomendasi.'
    }
  } catch {
    recommendationError.value = 'Gagal memuat rekomendasi'
  } finally {
    recommending.value = false
  }
}

function reset() {
  allyIds.value = []
  enemyIds.value = []
  recommendations.value = []
}

const heroMap = computed(() => {
  const map = new Map<number, Hero>()
  heroes.value.forEach(h => map.set(h.id, h))
  return map
})

function heroName(id: number) {
  return heroMap.value.get(id)?.name ?? `#${id}`
}

onMounted(async () => {
  await Promise.all([loadPatches(), loadHeroes()])
  await loadOverview()
})

function onPatchChange() {
  loadOverview()
}
</script>

<template>
  <div class="drafts-page">
    <div class="page-header">
      <h1 class="page-title">Draft <span class="gradient-text">Analysis</span></h1>
      <p class="page-subtitle">Pick & ban trends, sinergi hero, counter matrix, dan rekomendasi pick.</p>
    </div>

    <div class="drafts-toolbar">
      <label class="form-label" for="patch-select">Patch</label>
      <select id="patch-select" v-model="selectedPatchId" class="form-select" @change="onPatchChange">
        <option :value="undefined">Semua patch</option>
        <option v-for="p in patches" :key="p.id" :value="p.id">
          {{ p.version }} — {{ p.name || p.release_date }}
        </option>
      </select>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="overview" class="drafts-grid">
      <section class="card drafts-section">
        <h3 class="drafts-section__title">Top Picks</h3>
        <div v-if="!overview.top_picks.length" class="empty">Belum ada data pick.</div>
        <ul v-else class="pick-list">
          <li v-for="hero in overview.top_picks" :key="hero.hero_id">
            <span class="pick-list__name">{{ hero.hero_name }}</span>
            <span class="pick-list__meta">
              <span class="badge badge-cyan">{{ hero.picks }}x</span>
              <span class="badge" :class="hero.win_rate >= 50 ? 'badge-green' : 'badge-red'">{{ hero.win_rate }}%</span>
            </span>
          </li>
        </ul>
      </section>

      <section class="card drafts-section">
        <h3 class="drafts-section__title">Top Bans</h3>
        <div v-if="!overview.top_bans.length" class="empty">Belum ada data ban.</div>
        <ul v-else class="pick-list">
          <li v-for="hero in overview.top_bans" :key="hero.hero_id">
            <span class="pick-list__name">{{ hero.hero_name }}</span>
            <span class="badge badge-red">{{ hero.bans }} ban</span>
          </li>
        </ul>
      </section>

      <section class="card drafts-section drafts-section--wide">
        <h3 class="drafts-section__title">Pair Synergy (Teman Setim)</h3>
        <div v-if="!overview.hero_pair_synergy.length" class="empty">Butuh minimal 2 match untuk muncul.</div>
        <div v-else class="pair-grid">
          <div v-for="(pair, idx) in overview.hero_pair_synergy" :key="idx" class="pair-card">
            <div class="pair-card__heroes">
              <strong>{{ pair.hero_a.name }}</strong>
              <span class="pair-card__plus">+</span>
              <strong>{{ pair.hero_b.name }}</strong>
            </div>
            <div class="pair-card__stats">
              <span>{{ pair.matches }} match</span>
              <span class="badge" :class="pair.win_rate >= 50 ? 'badge-green' : 'badge-red'">{{ pair.win_rate }}%</span>
            </div>
          </div>
        </div>
      </section>

      <section class="card drafts-section drafts-section--wide">
        <h3 class="drafts-section__title">Counter Matrix</h3>
        <div v-if="!overview.hero_counters.length" class="empty">Butuh minimal 2 match untuk muncul.</div>
        <div v-else class="counter-grid">
          <div v-for="(c, idx) in overview.hero_counters" :key="idx" class="counter-card">
            <div class="counter-card__row">
              <span class="counter-card__hero">{{ c.hero.name }}</span>
              <span class="counter-card__vs">VS</span>
              <span class="counter-card__hero counter-card__hero--enemy">{{ c.enemy.name }}</span>
            </div>
            <div class="counter-card__stats">
              <span>{{ c.matches }} match</span>
              <span class="badge" :class="c.win_rate >= 50 ? 'badge-green' : 'badge-red'">{{ c.win_rate }}%</span>
            </div>
          </div>
        </div>
      </section>

      <section class="card drafts-section drafts-section--full">
        <h3 class="drafts-section__title">Rekomendasi Pick Berikutnya</h3>
        <p class="drafts-section__desc">Pilih hero di tim sendiri (ally) dan musuh (enemy) lalu tekan Rekomendasikan.</p>

        <div class="selected-row">
          <div>
            <div class="selected-label">Ally ({{ allyIds.length }}/5)</div>
            <div class="selected-chips">
              <span v-for="id in allyIds" :key="`a-${id}`" class="chip chip-ally" @click="toggleAlly(id)">
                {{ heroName(id) }} ×
              </span>
              <span v-if="!allyIds.length" class="text-muted">Belum ada</span>
            </div>
          </div>
          <div>
            <div class="selected-label">Enemy ({{ enemyIds.length }}/5)</div>
            <div class="selected-chips">
              <span v-for="id in enemyIds" :key="`e-${id}`" class="chip chip-enemy" @click="toggleEnemy(id)">
                {{ heroName(id) }} ×
              </span>
              <span v-if="!enemyIds.length" class="text-muted">Belum ada</span>
            </div>
          </div>
        </div>

        <div class="action-row">
          <button class="btn btn-primary" :disabled="recommending || (!allyIds.length && !enemyIds.length)" @click="runRecommendation">
            {{ recommending ? 'Menghitung...' : 'Rekomendasikan' }}
          </button>
          <button class="btn btn-secondary" @click="reset">Reset</button>
        </div>

        <div v-if="recommendationError" class="text-muted">{{ recommendationError }}</div>

        <div v-if="recommendations.length" class="recommendations">
          <div v-for="r in recommendations" :key="r.hero.id" class="reco-card">
            <div class="reco-card__name">{{ r.hero.name }}</div>
            <div class="reco-card__stats">
              <div>
                <span class="label">Synergy</span>
                <span class="value">{{ r.synergy_rate }}%</span>
              </div>
              <div>
                <span class="label">Counter</span>
                <span class="value">{{ r.counter_rate }}%</span>
              </div>
              <div>
                <span class="label">Score</span>
                <span class="value value--score">{{ r.score }}</span>
              </div>
            </div>
          </div>
        </div>

        <h4 class="drafts-section__subtitle">Pilih Hero</h4>
        <div class="hero-picker">
          <div v-for="hero in heroes" :key="hero.id" class="hero-option">
            <span class="hero-option__name">{{ hero.name }}</span>
            <div class="hero-option__actions">
              <button
                class="hero-btn hero-btn--ally"
                :class="{ active: allyIds.includes(hero.id) }"
                :disabled="enemyIds.includes(hero.id)"
                @click="toggleAlly(hero.id)"
              >Ally</button>
              <button
                class="hero-btn hero-btn--enemy"
                :class="{ active: enemyIds.includes(hero.id) }"
                :disabled="allyIds.includes(hero.id)"
                @click="toggleEnemy(hero.id)"
              >Enemy</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.drafts-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.drafts-toolbar .form-select {
  max-width: 360px;
}

.drafts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.drafts-section--wide {
  grid-column: span 2;
}

.drafts-section--full {
  grid-column: span 2;
}

.drafts-section__title {
  font-family: var(--font-heading);
  color: var(--text-white);
  margin-bottom: 16px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-size: 1rem;
}

.drafts-section__subtitle {
  font-family: var(--font-heading);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 24px 0 12px;
  font-size: 0.85rem;
}

.drafts-section__desc {
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.pick-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pick-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: rgba(13, 31, 23, 0.4);
}

.pick-list__name {
  font-weight: 600;
  color: var(--text-primary);
}

.pick-list__meta {
  display: inline-flex;
  gap: 6px;
}

.pair-grid,
.counter-grid,
.recommendations {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.pair-card,
.counter-card,
.reco-card {
  background: rgba(13, 31, 23, 0.4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 12px;
  transition: border-color var(--transition);
}

.pair-card:hover,
.counter-card:hover,
.reco-card:hover {
  border-color: rgba(0, 255, 135, 0.3);
}

.pair-card__heroes,
.counter-card__row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.pair-card__plus {
  color: var(--green-neon);
}

.counter-card__vs {
  color: var(--danger);
  font-weight: 700;
  font-size: 0.8rem;
}

.counter-card__hero--enemy {
  color: var(--danger);
}

.pair-card__stats,
.counter-card__stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.selected-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
}

.selected-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 6px;
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
}

.chip {
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid transparent;
}

.chip-ally {
  background: rgba(0, 255, 135, 0.12);
  color: var(--green-neon);
  border-color: rgba(0, 255, 135, 0.3);
}

.chip-enemy {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

.action-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.reco-card__name {
  font-weight: 700;
  color: var(--text-white);
  margin-bottom: 8px;
}

.reco-card__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.reco-card__stats .label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.reco-card__stats .value {
  font-weight: 700;
  color: var(--text-primary);
}

.reco-card__stats .value--score {
  color: var(--green-neon);
}

.hero-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
  padding: 4px;
}

.hero-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(13, 31, 23, 0.35);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.hero-option__name {
  color: var(--text-primary);
}

.hero-option__actions {
  display: flex;
  gap: 4px;
}

.hero-btn {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.7rem;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hero-btn--ally.active {
  background: rgba(0, 255, 135, 0.12);
  color: var(--green-neon);
  border-color: rgba(0, 255, 135, 0.3);
}

.hero-btn--enemy.active {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

.hero-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.empty {
  padding: 12px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

@media (max-width: 960px) {
  .drafts-grid {
    grid-template-columns: 1fr;
  }

  .drafts-section--wide,
  .drafts-section--full {
    grid-column: span 1;
  }

  .selected-row {
    grid-template-columns: 1fr;
  }
}
</style>
