<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { statisticsApi, playersApi, matchesApi } from '@/services/api'
import type { Player, HeroStats, RoleStats, GameMatch, Column } from '@/types'
import DataTable from '@/components/DataTable.vue'
import WinRateBar from '@/components/WinRateBar.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'
import MatchResultCard from '@/components/MatchResultCard.vue'
import PlayerDetailView from '@/components/PlayerDetailView.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref('player')
const tabs = [
  { key: 'player', label: 'Player Stats' },
  { key: 'hero', label: 'Hero Stats' },
  { key: 'role', label: 'Role Stats' },
  { key: 'matches', label: 'Match History' },
]

// Player filter + detail view
const players = ref<Player[]>([])
const selectedPlayerId = ref<number | null>(null)

// Hero Stats
const heroStats = ref<HeroStats[]>([])
const heroLoading = ref(false)
const heroSortBy = ref('usage_count')
const heroSortDir = ref<'asc' | 'desc'>('desc')

// Role Stats
const roleStats = ref<RoleStats[]>([])
const roleLoading = ref(false)

// Match History
const matches = ref<GameMatch[]>([])
const matchLoading = ref(false)
const matchPage = ref(1)
const matchLastPage = ref(1)

const heroColumns: Column[] = [
  { key: 'name', label: 'Hero', sortable: true },
  { key: 'usage_count', label: 'Used', sortable: true, align: 'center' },
  { key: 'win_rate', label: 'Win Rate', sortable: true, width: '160px' },
  { key: 'avg_rating', label: 'Avg Rating', sortable: true, align: 'center' },
  { key: 'mvp_count', label: 'MVPs', sortable: true, align: 'center' },
  { key: 'best_player', label: 'Best Player' },
]

onMounted(async () => {
  try {
    const res = await playersApi.getPlayers({ per_page: 200 })
    players.value = res.data.data
    const queryPlayer = Number(route.query.player)
    if (queryPlayer && players.value.some((p) => p.id === queryPlayer)) {
      selectedPlayerId.value = queryPlayer
      activeTab.value = 'player'
    }
  } catch { /* empty */ }
})

watch(
  () => route.query.player,
  (raw) => {
    if (!raw) return
    const queryPlayer = Number(raw)
    if (queryPlayer && selectedPlayerId.value !== queryPlayer) {
      selectedPlayerId.value = queryPlayer
      activeTab.value = 'player'
    }
  }
)

watch(selectedPlayerId, (id) => {
  if (activeTab.value !== 'player') return
  const nextQuery = { ...route.query }
  if (id) nextQuery.player = String(id)
  else delete nextQuery.player
  router.replace({ query: nextQuery })
})

watch(activeTab, (tab) => {
  if (tab === 'hero' && !heroStats.value.length) fetchHeroStats()
  if (tab === 'role' && !roleStats.value.length) fetchRoleStats()
  if (tab === 'matches' && !matches.value.length) fetchMatches()
}, { immediate: true })

async function fetchHeroStats() {
  heroLoading.value = true
  try {
    const res = await statisticsApi.getHeroStats({ sort_by: heroSortBy.value, sort_dir: heroSortDir.value })
    heroStats.value = res.data
  } catch { heroStats.value = [] } finally { heroLoading.value = false }
}

async function fetchRoleStats() {
  roleLoading.value = true
  try {
    const res = await statisticsApi.getRoleStats()
    roleStats.value = res.data
  } catch { roleStats.value = [] } finally { roleLoading.value = false }
}

async function fetchMatches(page = 1) {
  matchLoading.value = true
  try {
    const res = await matchesApi.getMatches({ page, per_page: 12 })
    matches.value = res.data.data
    matchPage.value = res.data.current_page
    matchLastPage.value = res.data.last_page
  } catch { matches.value = [] } finally { matchLoading.value = false }
}

function handleHeroSort(key: string) {
  if (heroSortBy.value === key) heroSortDir.value = heroSortDir.value === 'asc' ? 'desc' : 'asc'
  else { heroSortBy.value = key; heroSortDir.value = 'desc' }
  fetchHeroStats()
}
</script>

<template>
  <div>
    <div class="stats-header">
      <div class="stats-header__bg"></div>
      <div class="stats-header__content">
        <h1 class="stats-header__title">STATISTICS</h1>
        <p class="stats-header__subtitle">Detailed performance analytics</p>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- Player Stats Tab -->
    <div v-if="activeTab === 'player'" class="animate-fade-in">
      <div class="form-group" style="max-width: 400px; margin-bottom: 32px;">
        <label class="form-label">Select Player</label>
        <select v-model="selectedPlayerId" class="form-select">
          <option :value="null">Choose a player...</option>
          <option v-for="p in players" :key="p.id" :value="p.id">{{ p.username }}</option>
        </select>
      </div>
      <PlayerDetailView v-if="selectedPlayerId" :player-id="selectedPlayerId" />
      <EmptyState v-else icon="👤" title="Select a Player" message="Choose a player from the dropdown to view detailed statistics." />
    </div>

    <!-- Hero Stats Tab -->
    <div v-if="activeTab === 'hero'" class="animate-fade-in">
      <DataTable
        :columns="heroColumns"
        :data="(heroStats as unknown as Record<string, unknown>[])"
        :loading="heroLoading"
        :sort-by="heroSortBy"
        :sort-dir="heroSortDir"
        @sort="handleHeroSort"
      >
        <template #cell-win_rate="{ row }">
          <WinRateBar :win-rate="(row as unknown as HeroStats).win_rate" />
        </template>
        <template #cell-avg_rating="{ row }">
          <span class="text-green" style="font-weight: 700;">{{ ((row as unknown as HeroStats).avg_rating ?? 0).toFixed(1) }}</span>
        </template>
        <template #cell-mvp_count="{ value }">
          <span v-if="(value as number) > 0" class="badge badge-gold">{{ value }}</span>
          <span v-else class="text-muted">0</span>
        </template>
        <template #cell-best_player="{ row }">
          <span v-if="(row as unknown as HeroStats).best_player">{{ (row as unknown as HeroStats).best_player!.username }}</span>
          <span v-else class="text-muted">—</span>
        </template>
      </DataTable>
    </div>

    <!-- Role Stats Tab -->
    <div v-if="activeTab === 'role'" class="animate-fade-in">
      <LoadingSpinner v-if="roleLoading" />
      <div v-else class="role-list">
        <div v-for="role in roleStats" :key="role.id" class="card role-card">
          <div class="role-card__header">
            <h4>{{ role.name }}</h4>
            <div class="flex gap-lg items-center">
              <div class="role-stat-item">
                <span class="text-muted">Played</span>
                <span class="text-green" style="font-weight: 700;">{{ role.usage_count }}</span>
              </div>
              <div class="role-stat-item">
                <span class="text-muted">Win Rate</span>
                <span class="text-green" style="font-weight: 700;">{{ role.win_rate.toFixed(1) }}%</span>
              </div>
              <div class="role-stat-item">
                <span class="text-muted">Avg Rating</span>
                <span class="text-cyan" style="font-weight: 700;">{{ (role.avg_rating ?? 0).toFixed(1) }}</span>
              </div>
              <div v-if="role.best_player" class="role-stat-item">
                <span class="text-muted">Best Player</span>
                <span style="font-weight: 600;">{{ role.best_player.username }}</span>
              </div>
            </div>
          </div>
        </div>
        <EmptyState v-if="!roleStats.length" icon="🎭" title="No Role Data" message="No role statistics available yet." />
      </div>
    </div>

    <!-- Match History Tab -->
    <div v-if="activeTab === 'matches'" class="animate-fade-in">
      <LoadingSpinner v-if="matchLoading" />
      <template v-else>
        <div class="grid-3">
          <MatchResultCard v-for="match in matches" :key="match.id" :match="match" />
        </div>
        <EmptyState v-if="!matches.length" icon="⚔" title="No Matches" message="No matches recorded yet." />
        <div v-if="matchLastPage > 1" class="pagination">
          <button :disabled="matchPage <= 1" @click="fetchMatches(matchPage - 1)">‹ Prev</button>
          <span class="text-muted">Page {{ matchPage }} of {{ matchLastPage }}</span>
          <button :disabled="matchPage >= matchLastPage" @click="fetchMatches(matchPage + 1)">Next ›</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.stats-header {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 32px;
  padding: 40px;
  background: linear-gradient(160deg, #0d1f17 0%, #0a0a0a 40%, #0d1f17 100%);
  border: 1px solid var(--border-color);
}
.stats-header__bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 1px 1px, rgba(0, 255, 135, 0.06) 1px, transparent 0);
  background-size: 40px 40px;
}
.stats-header__content {
  position: relative;
  z-index: 1;
  text-align: center;
}
.stats-header__title {
  font-size: 2.5rem;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #00ff87, #06b6d4, #00ff87);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: text-shimmer 3s linear infinite;
  margin-bottom: 8px;
}
@keyframes text-shimmer {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}
.stats-header__subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

.tabs .tab-btn.active {
  box-shadow: 0 0 12px rgba(0, 255, 135, 0.2), inset 0 -2px 0 var(--green-neon);
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-card {
  cursor: pointer;
}

.role-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.role-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.85rem;
}
</style>
