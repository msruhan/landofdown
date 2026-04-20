<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
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
const selectedRole = ref<'mid' | 'exp' | 'gold' | 'jungle' | 'roam'>('mid')
const roleOptions: { value: 'mid' | 'exp' | 'gold' | 'jungle' | 'roam'; label: string }[] = [
  { value: 'mid', label: 'Mid' },
  { value: 'exp', label: 'EXP' },
  { value: 'gold', label: 'Gold' },
  { value: 'jungle', label: 'Jungle' },
  { value: 'roam', label: 'Roam' },
]

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

const heroFavorites = computed(() => {
  return heroStats.value
    .slice()
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5)
})

const selectedRoleStats = computed(() => {
  return roleStats.value.find((r) => r.name.toLowerCase() === selectedRole.value) ?? null
})

type RolePodiumItem = { id: number; username: string; matches: number; wins: number; win_rate: number; rank: number }

const topRoleUsage = computed<RolePodiumItem[]>(() => {
  const rows = selectedRoleStats.value?.top_used_players ?? []
  return rows.slice(0, 5).map((row, idx) => ({
    id: row.id,
    username: row.username,
    matches: row.matches,
    wins: row.wins,
    win_rate: row.win_rate,
    rank: idx + 1,
  }))
})

const topWinningRole = computed<RolePodiumItem[]>(() => {
  const rows = selectedRoleStats.value?.top_winning_players ?? []
  return rows.slice(0, 5).map((row, idx) => ({
    id: row.id,
    username: row.username,
    matches: row.matches,
    wins: row.wins,
    win_rate: row.win_rate,
    rank: idx + 1,
  }))
})

function podiumOrder(rows: RolePodiumItem[]): RolePodiumItem[] {
  if (rows.length < 3) return rows
  const ordered = [rows[1]!, rows[0]!, rows[2]!]
  if (rows.length > 3) ordered.push(rows[3]!)
  if (rows.length > 4) ordered.push(rows[4]!)
  return ordered
}

function podiumBarHeight(rank: number): string {
  const heights = [0, 100, 80, 64, 48, 36]
  return `${heights[rank] ?? 30}%`
}

function podiumBarColor(rank: number): string {
  if (rank === 1) return 'linear-gradient(180deg, #ffd700, #b8860b)'
  if (rank === 2) return 'linear-gradient(180deg, #d4d4d8, #71717a)'
  if (rank === 3) return 'linear-gradient(180deg, #cd7f32, #8b4513)'
  if (rank === 4) return 'linear-gradient(180deg, #00ff87, #064e3b)'
  return 'linear-gradient(180deg, #06b6d4, #0e4a5c)'
}

function rankLabel(rank: number): string {
  if (rank === 1) return '1ST'
  if (rank === 2) return '2ND'
  if (rank === 3) return '3RD'
  if (rank === 4) return '4TH'
  return '5TH'
}

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
    const available = new Set(roleStats.value.map((r) => r.name.toLowerCase()))
    if (!available.has(selectedRole.value)) {
      const fallback = roleOptions.find((opt) => available.has(opt.value))
      if (fallback) selectedRole.value = fallback.value
    }
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

function openPlayerStats(playerId: number) {
  selectedPlayerId.value = playerId
  activeTab.value = 'player'
  router.push({
    path: '/statistics',
    query: {
      ...route.query,
      player: String(playerId),
    },
  })
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
      <section v-if="!heroLoading && heroFavorites.length" class="hero-favorite-section">
        <h2 class="hero-favorite-section__heading">
          <span class="hero-favorite-section__icon">⚔</span>
          HERO FAVOURITE SUMMARY
        </h2>
        <div class="hero-favorite-grid">
          <article
            v-for="(hero, idx) in heroFavorites"
            :key="hero.id"
            class="hero-favorite-card"
            :class="`hero-favorite-card--rank-${idx + 1}`"
          >
            <div class="hero-favorite-card__top">
              <span class="hero-favorite-card__rank">#{{ idx + 1 }}</span>
              <div>
                <h3 class="hero-favorite-card__name">{{ hero.name }}</h3>
                <p class="hero-favorite-card__meta">
                  {{ hero.usage_count }}x used · {{ hero.win_rate.toFixed(1) }}% WR
                </p>
              </div>
            </div>
            <div class="hero-favorite-card__players">
              <p class="hero-favorite-card__players-title">Used by players</p>
              <div v-if="hero.top_players?.length" class="hero-favorite-card__chips">
                <span
                  v-for="player in hero.top_players"
                  :key="`${hero.id}-${player.id}`"
                  class="hero-favorite-card__chip"
                >
                  {{ player.username }} · {{ player.matches }}x
                </span>
              </div>
              <span v-else class="text-muted">No player usage yet</span>
            </div>
          </article>
        </div>
      </section>

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
      <div v-else class="role-summary">
        <div class="role-summary__toolbar">
          <h2 class="role-summary__heading">
            <span class="role-summary__icon">🛡</span>
            ROLE SUMMARY PODIUM
          </h2>
          <div class="form-group role-summary__select">
            <label class="form-label">Select Role</label>
            <select v-model="selectedRole" class="form-select">
              <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>

        <section v-if="selectedRoleStats" class="role-podium-section">
          <h3 class="role-podium-section__title">Top Role - Most Used Players</h3>
          <div v-if="topRoleUsage.length >= 1" class="role-podium">
            <div
              v-for="item in podiumOrder(topRoleUsage)"
              :key="`used-${selectedRole}-${item.id}`"
              class="role-podium__col"
              :class="`role-podium__col--rank-${item.rank}`"
            >
              <button type="button" class="role-podium__player role-podium__player--link" @click="openPlayerStats(item.id)">
                <div class="role-podium__avatar-wrap" :class="`role-podium__avatar-wrap--rank-${item.rank}`">
                  <img :src="`https://api.dicebear.com/7.x/adventurer/svg?seed=${item.username}`" :alt="item.username" class="role-podium__avatar">
                  <span class="role-podium__rank-badge">{{ item.rank }}</span>
                </div>
                <span class="role-podium__name">{{ item.username }}</span>
                <div class="role-podium__stats">
                  <span class="role-podium__stat-main">{{ item.matches }}x</span>
                  <span class="role-podium__stat-sub">{{ item.win_rate.toFixed(0) }}%</span>
                </div>
              </button>
              <div class="role-podium__bar-wrap">
                <div class="role-podium__bar" :style="{ height: podiumBarHeight(item.rank), background: podiumBarColor(item.rank) }">
                  <span class="role-podium__bar-label">{{ rankLabel(item.rank) }}</span>
                </div>
              </div>
            </div>
          </div>
          <EmptyState v-else icon="🎭" title="No Usage Data" message="No usage data for this role yet." />
        </section>

        <section v-if="selectedRoleStats" class="role-podium-section">
          <h3 class="role-podium-section__title">Top Winning Role - Most Winning Players</h3>
          <div v-if="topWinningRole.length >= 1" class="role-podium">
            <div
              v-for="item in podiumOrder(topWinningRole)"
              :key="`win-${selectedRole}-${item.id}`"
              class="role-podium__col"
              :class="`role-podium__col--rank-${item.rank}`"
            >
              <button type="button" class="role-podium__player role-podium__player--link" @click="openPlayerStats(item.id)">
                <div class="role-podium__avatar-wrap" :class="`role-podium__avatar-wrap--rank-${item.rank}`">
                  <img :src="`https://api.dicebear.com/7.x/adventurer/svg?seed=${item.username}`" :alt="item.username" class="role-podium__avatar">
                  <span class="role-podium__rank-badge">{{ item.rank }}</span>
                </div>
                <span class="role-podium__name">{{ item.username }}</span>
                <div class="role-podium__stats">
                  <span class="role-podium__stat-main">{{ item.wins }}W</span>
                  <span class="role-podium__stat-sub">{{ item.win_rate.toFixed(0) }}%</span>
                </div>
              </button>
              <div class="role-podium__bar-wrap">
                <div class="role-podium__bar" :style="{ height: podiumBarHeight(item.rank), background: podiumBarColor(item.rank) }">
                  <span class="role-podium__bar-label">{{ rankLabel(item.rank) }}</span>
                </div>
              </div>
            </div>
          </div>
          <EmptyState v-else icon="🏆" title="No Winning Data" message="No winning data for this role yet." />
        </section>

        <EmptyState v-if="!roleStats.length" icon="🎭" title="No Role Data" message="No role statistics available yet." />
      </div>
    </div>

    <!-- Match History Tab -->
    <div v-if="activeTab === 'matches'" class="animate-fade-in">
      <LoadingSpinner v-if="matchLoading" />
      <template v-else>
        <div class="grid-3">
          <MatchResultCard v-for="match in matches" :key="match.id" :match="match" :show-screenshot="true" />
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

.role-summary__heading {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.3rem;
  letter-spacing: 2px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.role-summary__icon {
  color: var(--gold);
}

.role-summary__toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.role-summary__select {
  min-width: 220px;
}

.role-podium-section {
  margin-bottom: 18px;
}

.role-podium-section__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.05rem;
  letter-spacing: 1.2px;
  color: var(--text-secondary);
  margin: 0 0 8px;
}

.role-podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  padding: 18px 14px;
  min-height: 290px;
  background: linear-gradient(150deg, rgba(12, 30, 24, 0.95), rgba(7, 10, 9, 0.96));
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}

.role-podium::after {
  content: '';
  position: absolute;
  inset: auto -30% -60% -30%;
  height: 120px;
  background: radial-gradient(circle, rgba(0, 255, 135, 0.12), transparent 70%);
}

.role-podium__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 132px;
  gap: 8px;
  z-index: 1;
}

.role-podium__player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.role-podium__player--link {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.role-podium__player--link:hover {
  transform: translateY(-2px);
}

.role-podium__avatar-wrap {
  position: relative;
}

.role-podium__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  padding: 2px;
}

.role-podium__avatar-wrap--rank-1 .role-podium__avatar {
  width: 60px;
  height: 60px;
  border-color: var(--gold);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
}

.role-podium__avatar-wrap--rank-2 .role-podium__avatar {
  width: 52px;
  height: 52px;
  border-color: var(--silver);
  box-shadow: 0 0 12px rgba(192, 192, 192, 0.2);
}

.role-podium__avatar-wrap--rank-3 .role-podium__avatar {
  width: 52px;
  height: 52px;
  border-color: var(--bronze);
  box-shadow: 0 0 12px rgba(205, 127, 50, 0.2);
}

.role-podium__rank-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--green-neon);
  color: #000;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.8rem;
  font-weight: 800;
  border: 2px solid var(--bg-card);
}

.role-podium__name {
  font-family: 'Teko', var(--font-heading);
  font-size: 1rem;
  color: var(--text-white);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-podium__stats {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.role-podium__stat-main {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--green-neon);
}

.role-podium__stat-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.role-podium__bar-wrap {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.role-podium__bar {
  width: 100%;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.role-podium__bar-label {
  font-family: 'Teko', var(--font-heading);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 1px;
  color: rgba(0, 0, 0, 0.68);
}

@media (max-width: 980px) {
  .role-summary__toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .role-podium {
    gap: 8px;
    min-height: 250px;
  }

  .role-podium__col {
    max-width: 96px;
  }

  .role-podium__bar-wrap {
    height: 110px;
  }

  .role-podium__name {
    font-size: 0.86rem;
  }
}

@media (max-width: 520px) {
  .role-podium__col--rank-4,
  .role-podium__col--rank-5 {
    display: none;
  }
}

.hero-favorite-section {
  margin-bottom: 22px;
}

.hero-favorite-section__heading {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.3rem;
  letter-spacing: 1.8px;
  color: var(--text-secondary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-favorite-section__icon {
  color: var(--gold);
}

.hero-favorite-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.hero-favorite-card {
  background: linear-gradient(160deg, rgba(14, 34, 26, 0.9), rgba(9, 12, 11, 0.95));
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 12px;
  min-height: 155px;
  position: relative;
  overflow: hidden;
}

.hero-favorite-card::after {
  content: '';
  position: absolute;
  inset: auto -30% -70% -30%;
  height: 90px;
  background: radial-gradient(circle, rgba(0, 255, 135, 0.12), transparent 65%);
  pointer-events: none;
}

.hero-favorite-card--rank-1 { border-color: rgba(255, 215, 0, 0.6); }
.hero-favorite-card--rank-2 { border-color: rgba(209, 213, 219, 0.45); }
.hero-favorite-card--rank-3 { border-color: rgba(180, 83, 9, 0.5); }

.hero-favorite-card__top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.hero-favorite-card__rank {
  font-family: 'Teko', var(--font-heading);
  color: var(--green-neon);
  font-size: 1.15rem;
  min-width: 28px;
  line-height: 1;
}

.hero-favorite-card__name {
  margin: 0;
  font-size: 1rem;
  line-height: 1.1;
}

.hero-favorite-card__meta {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.74rem;
}

.hero-favorite-card__players-title {
  margin: 0 0 6px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
}

.hero-favorite-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hero-favorite-card__chip {
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(0, 255, 135, 0.25);
  background: rgba(0, 255, 135, 0.08);
  color: #ccffe8;
}

@media (max-width: 1200px) {
  .hero-favorite-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .hero-favorite-grid {
    grid-template-columns: 1fr;
  }
}
</style>
