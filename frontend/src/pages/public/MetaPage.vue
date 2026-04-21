<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { patchesApi } from '@/services/api'
import type { MetaOverview, Patch } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const patches = ref<Patch[]>([])
const selectedPatchId = ref<number | undefined>(undefined)
const meta = ref<MetaOverview | null>(null)
const loading = ref(true)

async function loadPatches() {
  const response = await patchesApi.list()
  patches.value = response.data.data
  if (patches.value.length && !selectedPatchId.value) {
    selectedPatchId.value = patches.value[0]!.id
  }
}

async function loadMeta() {
  loading.value = true
  try {
    const response = await patchesApi.meta(selectedPatchId.value)
    meta.value = response.data
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadPatches()
  await loadMeta()
})

function onPatchChange() {
  loadMeta()
}

const heroTopRisers = computed(() =>
  (meta.value?.hero_performance ?? [])
    .filter(h => h.delta_win_rate !== null)
    .sort((a, b) => (b.delta_win_rate ?? 0) - (a.delta_win_rate ?? 0))
    .slice(0, 5),
)

const heroTopFallers = computed(() =>
  (meta.value?.hero_performance ?? [])
    .filter(h => h.delta_win_rate !== null)
    .sort((a, b) => (a.delta_win_rate ?? 0) - (b.delta_win_rate ?? 0))
    .slice(0, 5),
)

function deltaClass(delta: number | null) {
  if (delta === null) return 'badge-gray'
  if (delta > 0) return 'badge-green'
  if (delta < 0) return 'badge-red'
  return 'badge-gray'
}

function deltaSign(delta: number | null, unit = '%') {
  if (delta === null) return '—'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}${unit}`
}
</script>

<template>
  <div class="meta-page">
    <div class="page-header">
      <h1 class="page-title">Meta <span class="gradient-text">Tracker</span></h1>
      <p class="page-subtitle">Bandingkan performa hero, role, dan player antar patch.</p>
    </div>

    <div class="meta-toolbar">
      <label class="form-label" for="patch-select">Patch</label>
      <select id="patch-select" v-model="selectedPatchId" class="form-select" @change="onPatchChange">
        <option v-for="p in patches" :key="p.id" :value="p.id">
          {{ p.version }} — {{ p.name || p.release_date }} ({{ p.match_count ?? 0 }} match)
        </option>
      </select>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="meta" class="meta-body">
      <div class="meta-versus">
        <div class="patch-card">
          <span class="patch-card__label">Current</span>
          <span class="patch-card__version">{{ meta.current_patch?.version ?? '—' }}</span>
          <span class="patch-card__name">{{ meta.current_patch?.name ?? '—' }}</span>
          <span class="patch-card__date">{{ meta.current_patch?.release_date ?? '' }}</span>
        </div>
        <div class="patch-card patch-card--prev">
          <span class="patch-card__label">Previous</span>
          <span class="patch-card__version">{{ meta.previous_patch?.version ?? '—' }}</span>
          <span class="patch-card__name">{{ meta.previous_patch?.name ?? '—' }}</span>
          <span class="patch-card__date">{{ meta.previous_patch?.release_date ?? '' }}</span>
        </div>
      </div>

      <div class="meta-grid">
        <section class="card">
          <h3 class="meta-section-title">Hero Rising ↑</h3>
          <ul v-if="heroTopRisers.length" class="list">
            <li v-for="h in heroTopRisers" :key="h.hero_id">
              <strong>{{ h.hero_name }}</strong>
              <span class="list__meta">
                <span>{{ h.win_rate }}%</span>
                <span class="badge" :class="deltaClass(h.delta_win_rate)">{{ deltaSign(h.delta_win_rate) }}</span>
              </span>
            </li>
          </ul>
          <div v-else class="empty">Belum ada pergerakan.</div>
        </section>

        <section class="card">
          <h3 class="meta-section-title">Hero Falling ↓</h3>
          <ul v-if="heroTopFallers.length" class="list">
            <li v-for="h in heroTopFallers" :key="h.hero_id">
              <strong>{{ h.hero_name }}</strong>
              <span class="list__meta">
                <span>{{ h.win_rate }}%</span>
                <span class="badge" :class="deltaClass(h.delta_win_rate)">{{ deltaSign(h.delta_win_rate) }}</span>
              </span>
            </li>
          </ul>
          <div v-else class="empty">Belum ada pergerakan.</div>
        </section>

        <section class="card meta-section-wide">
          <h3 class="meta-section-title">Role Performance</h3>
          <div class="role-grid">
            <div v-for="role in meta.role_performance" :key="role.role_id" class="role-row">
              <span class="role-row__name">{{ role.role_name }}</span>
              <span>{{ role.usage }} pick</span>
              <span>{{ role.win_rate }}%</span>
              <span class="badge" :class="deltaClass(role.delta_win_rate)">{{ deltaSign(role.delta_win_rate) }}</span>
            </div>
            <div v-if="!meta.role_performance.length" class="empty">Belum ada data role.</div>
          </div>
        </section>

        <section class="card meta-section-wide">
          <h3 class="meta-section-title">Player Movement</h3>
          <div class="player-table">
            <div class="player-row player-row--head">
              <span>Player</span>
              <span>Match</span>
              <span>Win Rate</span>
              <span>Δ Win Rate</span>
              <span>Avg Rating</span>
              <span>Δ Rating</span>
            </div>
            <div v-for="p in meta.player_performance" :key="p.player_id" class="player-row">
              <span>{{ p.username }}</span>
              <span>{{ p.matches_played }}</span>
              <span>{{ p.win_rate }}%</span>
              <span class="badge" :class="deltaClass(p.delta_win_rate)">{{ deltaSign(p.delta_win_rate) }}</span>
              <span>{{ p.avg_rating ?? '—' }}</span>
              <span class="badge" :class="deltaClass(p.delta_avg_rating)">{{ deltaSign(p.delta_avg_rating, '') }}</span>
            </div>
            <div v-if="!meta.player_performance.length" class="empty">Belum ada player di patch ini.</div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meta-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.meta-toolbar .form-select {
  max-width: 420px;
}

.meta-versus {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.patch-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patch-card--prev {
  opacity: 0.85;
}

.patch-card__label {
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--green-neon);
  font-size: 0.8rem;
  font-family: var(--font-heading);
}

.patch-card--prev .patch-card__label {
  color: var(--text-secondary);
}

.patch-card__version {
  font-size: 1.6rem;
  font-family: var(--font-heading);
  color: var(--text-white);
  letter-spacing: 0.5px;
}

.patch-card__name {
  color: var(--text-primary);
}

.patch-card__date {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.meta-section-wide {
  grid-column: span 2;
}

.meta-section-title {
  font-family: var(--font-heading);
  color: var(--text-white);
  margin-bottom: 16px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-size: 1rem;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(13, 31, 23, 0.35);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.list__meta {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--text-secondary);
}

.role-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: rgba(13, 31, 23, 0.35);
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.role-row__name {
  color: var(--text-primary);
  font-weight: 600;
}

.player-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: rgba(13, 31, 23, 0.35);
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.player-row--head {
  background: transparent;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.72rem;
}

.player-row > span:first-child {
  color: var(--text-primary);
  font-weight: 600;
}

.empty {
  padding: 12px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

@media (max-width: 960px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .meta-section-wide {
    grid-column: span 1;
  }

  .meta-versus {
    grid-template-columns: 1fr;
  }

  .player-row,
  .role-row {
    grid-template-columns: 1fr 1fr;
  }

  .player-row--head {
    display: none;
  }
}
</style>
