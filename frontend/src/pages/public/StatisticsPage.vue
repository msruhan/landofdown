<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { statisticsApi, playersApi, matchesApi, patchesApi } from '@/services/api'
import type { Player, HeroStats, RoleStats, GameMatch, Column, PlayerStats, SynergyEntry } from '@/types'
import DataTable from '@/components/DataTable.vue'
import WinRateBar from '@/components/WinRateBar.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'
import MatchResultCard from '@/components/MatchResultCard.vue'
import PlayerDetailView from '@/components/PlayerDetailView.vue'
import { getAvatarUrl, handleAvatarError } from '@/utils/avatar'

const route = useRoute()
const router = useRouter()
const activeTab = ref('player')
const selectedPatchId = ref<number | undefined>(undefined)
const patchOptions = ref<{ value: number; label: string }[]>([])
const tabs = [
  { key: 'player', label: 'Player Stats' },
  { key: 'hero', label: 'Hero Stats' },
  { key: 'role', label: 'Role Stats' },
  { key: 'highlights', label: 'Highlights' },
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

type HighlightItem = {
  title: string
  icon: string
  value: number
  playerId: number
  username: string
  avatarUrl?: string | null
}

type RoleHighlightItem = {
  role: string
  playerId: number
  username: string
  avatarUrl?: string | null
  matches: number
  wins: number
  winRate: number
}

const highlightsLoading = ref(false)
const highlights = ref<HighlightItem[]>([])
const performanceHighlights = ref<HighlightItem[]>([])
const roleHighlights = ref<RoleHighlightItem[]>([])
const synergyDuos = ref<SynergyEntry[]>([])
const synergyTrios = ref<SynergyEntry[]>([])

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
    const patchRes = await patchesApi.list()
    patchOptions.value = (patchRes.data.data ?? []).map((p) => ({
      value: p.id,
      label: `${p.version}${p.name ? ` - ${p.name}` : ''}`,
    }))

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
  if (tab === 'highlights' && !highlights.value.length) fetchHighlights()
  if (tab === 'matches' && !matches.value.length) fetchMatches()
}, { immediate: true })

watch(selectedPatchId, () => {
  heroStats.value = []
  roleStats.value = []
  matches.value = []
  highlights.value = []
  performanceHighlights.value = []
  roleHighlights.value = []
  synergyDuos.value = []
  synergyTrios.value = []

  if (activeTab.value === 'hero') fetchHeroStats()
  if (activeTab.value === 'role') fetchRoleStats()
  if (activeTab.value === 'highlights') fetchHighlights()
  if (activeTab.value === 'matches') fetchMatches()
})

async function fetchHeroStats() {
  heroLoading.value = true
  try {
    const res = await statisticsApi.getHeroStats({ sort_by: heroSortBy.value, sort_dir: heroSortDir.value, patch_id: selectedPatchId.value })
    heroStats.value = res.data
  } catch { heroStats.value = [] } finally { heroLoading.value = false }
}

async function fetchRoleStats() {
  roleLoading.value = true
  try {
    const res = await statisticsApi.getRoleStats({ patch_id: selectedPatchId.value })
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
    const res = await matchesApi.getMatches({ page, per_page: 12, patch_id: selectedPatchId.value })
    matches.value = res.data.data
    matchPage.value = res.data.current_page
    matchLastPage.value = res.data.last_page
  } catch { matches.value = [] } finally { matchLoading.value = false }
}

async function fetchHighlights() {
  highlightsLoading.value = true
  try {
    const roleStatsRes = await statisticsApi.getRoleStats({ patch_id: selectedPatchId.value })
    roleHighlights.value = buildRoleHighlights(roleStatsRes.data ?? [])
    const synergyRes = await statisticsApi.getSynergy({ patch_id: selectedPatchId.value })
    synergyDuos.value = synergyRes.data.top_duos ?? []
    synergyTrios.value = synergyRes.data.top_trios ?? []
    const playersRes = await playersApi.getPlayers({ per_page: 200 })
    const playerRows = playersRes.data.data ?? []
    if (!playerRows.length) {
      highlights.value = []
      performanceHighlights.value = []
      return
    }

    const statsRows = await Promise.all(
      playerRows.map(async (player) => {
        const statRes = await statisticsApi.getPlayerStats(player.id, { patch_id: selectedPatchId.value })
        return statRes.data
      }),
    )

    highlights.value = buildHighlightsFromPlayerStats(statsRows)
    performanceHighlights.value = buildPerformanceHighlightsFromPlayerStats(statsRows)
  } catch {
    highlights.value = []
    performanceHighlights.value = []
    roleHighlights.value = []
    synergyDuos.value = []
    synergyTrios.value = []
  } finally {
    highlightsLoading.value = false
  }
}

function buildRoleHighlights(rows: RoleStats[]): RoleHighlightItem[] {
  const targetRoles = ['jungle', 'roam', 'mid', 'exp', 'gold'] as const

  return targetRoles
    .map((roleName) => {
      const role = rows.find((r) => r.name.toLowerCase() === roleName)
      const top = role?.top_used_players?.[0]
      if (!top) return null
      return {
        role: roleName.toUpperCase(),
        playerId: top.id,
        username: top.username,
        matches: top.matches,
        wins: top.wins,
        winRate: top.win_rate,
      }
    })
    .filter((item): item is RoleHighlightItem => Boolean(item))
}

function buildHighlightsFromPlayerStats(rows: PlayerStats[]): HighlightItem[] {
  const topBy = (metric: 'kills' | 'deaths' | 'assists') => {
    return rows.reduce((best: PlayerStats | null, current) => {
      if (!best) return current
      const currentValue = current.total_kda?.[metric] ?? 0
      const bestValue = best.total_kda?.[metric] ?? 0
      if (currentValue > bestValue) return current
      if (currentValue < bestValue) return best
      if ((current.total_wins ?? 0) > (best.total_wins ?? 0)) return current
      if ((current.total_wins ?? 0) < (best.total_wins ?? 0)) return best
      return current.player.username.localeCompare(best.player.username) < 0 ? current : best
    }, null)
  }

  const topKills = topBy('kills')
  const topDeaths = topBy('deaths')
  const topAssists = topBy('assists')

  return [
    {
      title: 'Paling Banyak Kill',
      icon: 'kills',
      value: topKills?.total_kda?.kills ?? 0,
      playerId: topKills?.player?.id ?? 0,
      username: topKills?.player?.username ?? '-',
      avatarUrl: topKills?.player?.avatar_url,
    },
    {
      title: 'Paling Banyak Mati',
      icon: 'deaths',
      value: topDeaths?.total_kda?.deaths ?? 0,
      playerId: topDeaths?.player?.id ?? 0,
      username: topDeaths?.player?.username ?? '-',
      avatarUrl: topDeaths?.player?.avatar_url,
    },
    {
      title: 'Paling Banyak Assist',
      icon: 'assists',
      value: topAssists?.total_kda?.assists ?? 0,
      playerId: topAssists?.player?.id ?? 0,
      username: topAssists?.player?.username ?? '-',
      avatarUrl: topAssists?.player?.avatar_url,
    },
  ]
}

function buildPerformanceHighlightsFromPlayerStats(rows: PlayerStats[]): HighlightItem[] {
  const ratedRows = rows.filter((r) => r.total_matches > 0 && r.avg_rating !== null)

  const topBy = (
    metric: (row: PlayerStats) => number,
    tieBreaker: (current: PlayerStats, best: PlayerStats) => boolean = (current, best) =>
      current.player.username.localeCompare(best.player.username) < 0,
  ) => {
    return rows.reduce((best: PlayerStats | null, current) => {
      if (!best) return current
      const currentValue = metric(current)
      const bestValue = metric(best)
      if (currentValue > bestValue) return current
      if (currentValue < bestValue) return best
      if ((current.total_wins ?? 0) > (best.total_wins ?? 0)) return current
      if ((current.total_wins ?? 0) < (best.total_wins ?? 0)) return best
      return tieBreaker(current, best) ? current : best
    }, null)
  }

  const highestRating = ratedRows.reduce((best: PlayerStats | null, current) => {
    if (!best) return current
    if ((current.avg_rating ?? 0) > (best.avg_rating ?? 0)) return current
    if ((current.avg_rating ?? 0) < (best.avg_rating ?? 0)) return best
    if ((current.total_matches ?? 0) > (best.total_matches ?? 0)) return current
    if ((current.total_matches ?? 0) < (best.total_matches ?? 0)) return best
    return current.player.username.localeCompare(best.player.username) < 0 ? current : best
  }, null)

  const lowestRating = ratedRows.reduce((best: PlayerStats | null, current) => {
    if (!best) return current
    if ((current.avg_rating ?? 0) < (best.avg_rating ?? 0)) return current
    if ((current.avg_rating ?? 0) > (best.avg_rating ?? 0)) return best
    if ((current.total_matches ?? 0) > (best.total_matches ?? 0)) return current
    if ((current.total_matches ?? 0) < (best.total_matches ?? 0)) return best
    return current.player.username.localeCompare(best.player.username) < 0 ? current : best
  }, null)

  const topMvpWin = topBy((r) => r.medals.mvp_win ?? 0)
  const topMvpLose = topBy((r) => r.medals.mvp_lose ?? 0)
  const topSilver = topBy((r) => r.medals.silver ?? 0)

  return [
    {
      title: 'Rating Tertinggi',
      icon: 'rating_high',
      value: Number((highestRating?.avg_rating ?? 0).toFixed(1)),
      playerId: highestRating?.player?.id ?? 0,
      username: highestRating?.player?.username ?? '-',
      avatarUrl: highestRating?.player?.avatar_url,
    },
    {
      title: 'Rating Terendah',
      icon: 'rating_low',
      value: Number((lowestRating?.avg_rating ?? 0).toFixed(1)),
      playerId: lowestRating?.player?.id ?? 0,
      username: lowestRating?.player?.username ?? '-',
      avatarUrl: lowestRating?.player?.avatar_url,
    },
    {
      title: 'Terbanyak MVP Win',
      icon: 'mvp_win',
      value: topMvpWin?.medals.mvp_win ?? 0,
      playerId: topMvpWin?.player?.id ?? 0,
      username: topMvpWin?.player?.username ?? '-',
      avatarUrl: topMvpWin?.player?.avatar_url,
    },
    {
      title: 'Terbanyak MVP Lose',
      icon: 'mvp_lose',
      value: topMvpLose?.medals.mvp_lose ?? 0,
      playerId: topMvpLose?.player?.id ?? 0,
      username: topMvpLose?.player?.username ?? '-',
      avatarUrl: topMvpLose?.player?.avatar_url,
    },
    {
      title: 'Si Paling Konsisten (Silver)',
      icon: 'silver_consistency',
      value: topSilver?.medals.silver ?? 0,
      playerId: topSilver?.player?.id ?? 0,
      username: topSilver?.player?.username ?? '-',
      avatarUrl: topSilver?.player?.avatar_url,
    },
  ]
}

function isNegativeHighlight(title: string): boolean {
  return title === 'Paling Banyak Mati' || title === 'Rating Terendah'
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

    <div class="stats-toolbar">
      <div class="form-group stats-toolbar__patch">
        <label class="form-label">Season / Split</label>
        <select v-model.number="selectedPatchId" class="form-select">
          <option :value="undefined">All Seasons</option>
          <option v-for="opt in patchOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
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
      <PlayerDetailView v-if="selectedPlayerId" :player-id="selectedPlayerId" :patch-id="selectedPatchId" />
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
    <div v-if="activeTab === 'highlights'" class="animate-fade-in">
      <LoadingSpinner v-if="highlightsLoading" />
      <section v-else-if="highlights.length" class="highlights-section">
        <h2 class="highlights-section__title">MATCH HIGHLIGHTS</h2>
        <div class="highlights-grid">
          <button
            v-for="item in highlights"
            :key="item.title"
            type="button"
            class="highlight-card"
            :class="{ 'highlight-card--negative': isNegativeHighlight(item.title) }"
            @click="openPlayerStats(item.playerId)"
          >
            <div class="highlight-card__top">
              <span class="highlight-card__icon">
                <svg v-if="item.icon === 'kills'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 6L4 3L2 7L6 10M16 18L20 21L22 17L18 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 8L14 12M14 12L10 16M14 12H6M14 12H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="item.icon === 'deaths'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l7 7l-7 11L5 10l7-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <path d="M9.5 10.5h5M9.5 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="item.icon === 'assists'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 12a3 3 0 100-6a3 3 0 000 6zM16 18a3 3 0 100-6a3 3 0 000 6z" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M10.5 8.5l3 3M13.5 12l2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="item.icon === 'rating_high'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 19h16M7 15l3-3l3 2l4-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M16 9h3v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="item.icon === 'rating_low'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 19h16M7 9l3 3l3-2l4 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M16 15h3v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="item.icon === 'mvp_win'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18 14l1.6 1.6L22 13.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="item.icon === 'mvp_lose'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18 14l4 4M22 14l-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="highlight-card__label">{{ item.title }}</span>
            </div>
            <div class="highlight-card__player">
              <img
                :src="getAvatarUrl(item.username, item.avatarUrl)"
                :alt="item.username"
                class="highlight-card__avatar"
                @error="(event) => handleAvatarError(event, item.username)"
              >
              <span class="highlight-card__name">{{ item.username }}</span>
            </div>
            <p class="highlight-card__value">{{ item.value }}</p>
          </button>
        </div>
        <div v-if="performanceHighlights.length" class="performance-highlights">
          <h3 class="highlights-section__subtitle">PERFORMANCE HIGHLIGHTS</h3>
          <div class="performance-highlights-grid">
            <button
              v-for="item in performanceHighlights"
              :key="item.title"
              type="button"
              class="highlight-card highlight-card--compact"
              :class="{ 'highlight-card--negative': isNegativeHighlight(item.title) }"
              @click="openPlayerStats(item.playerId)"
            >
              <div class="highlight-card__top">
                <span class="highlight-card__icon">
                  <svg v-if="item.icon === 'rating_high'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 19h16M7 15l3-3l3 2l4-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 9h3v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="item.icon === 'rating_low'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 19h16M7 9l3 3l3-2l4 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 15h3v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="item.icon === 'mvp_win'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18 14l1.6 1.6L22 13.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="item.icon === 'mvp_lose'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18 14l4 4M22 14l-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                  <svg v-else-if="item.icon === 'silver_consistency'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3l2.4 3.6L19 8l-3 3.4l.6 4.8L12 14.4L7.4 16.2L8 11.4L5 8l4.6-1.4L12 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                    <path d="M9 18h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="highlight-card__label">{{ item.title }}</span>
              </div>
              <div class="highlight-card__player">
                <img
                  :src="getAvatarUrl(item.username, item.avatarUrl)"
                  :alt="item.username"
                  class="highlight-card__avatar"
                  @error="(event) => handleAvatarError(event, item.username)"
                >
                <span class="highlight-card__name">{{ item.username }}</span>
              </div>
              <p class="highlight-card__value">{{ item.value }}</p>
            </button>
          </div>
        </div>
        <div v-if="roleHighlights.length" class="role-highlights">
          <h3 class="highlights-section__subtitle">ROLE LEADERS (MOST PLAYED)</h3>
          <div class="role-highlights-grid">
            <button
              v-for="item in roleHighlights"
              :key="item.role"
              type="button"
              class="role-highlight-card"
              @click="openPlayerStats(item.playerId)"
            >
              <span class="role-highlight-card__role">{{ item.role }}</span>
              <div class="role-highlight-card__player">
                <img
                  :src="getAvatarUrl(item.username, item.avatarUrl)"
                  :alt="item.username"
                  class="role-highlight-card__avatar"
                  @error="(event) => handleAvatarError(event, item.username)"
                >
                <span class="role-highlight-card__name">{{ item.username }}</span>
              </div>
              <span class="role-highlight-card__meta">{{ item.matches }}x · {{ item.wins }}W · {{ item.winRate.toFixed(0) }}%</span>
            </button>
          </div>
        </div>
        <div v-if="synergyDuos.length || synergyTrios.length" class="role-highlights">
          <h3 class="highlights-section__subtitle">TEAM SYNERGY SCORE</h3>
          <div class="synergy-grid">
            <div class="role-highlight-card">
              <span class="role-highlight-card__role">BEST DUOS</span>
              <div v-if="synergyDuos.length">
                <div v-for="duo in synergyDuos.slice(0, 3)" :key="duo.players.map((p) => p.id).join('-')" class="synergy-row">
                  <span class="role-highlight-card__name">{{ duo.players.map((p) => p.username).join(' + ') }}</span>
                  <span class="role-highlight-card__meta">{{ duo.matches }}x · {{ duo.win_rate.toFixed(0) }}% · {{ duo.avg_rating.toFixed(1) }}</span>
                </div>
              </div>
              <span v-else class="role-highlight-card__meta">No duo data</span>
            </div>
            <div class="role-highlight-card">
              <span class="role-highlight-card__role">BEST TRIOS</span>
              <div v-if="synergyTrios.length">
                <div v-for="trio in synergyTrios.slice(0, 3)" :key="trio.players.map((p) => p.id).join('-')" class="synergy-row">
                  <span class="role-highlight-card__name">{{ trio.players.map((p) => p.username).join(' + ') }}</span>
                  <span class="role-highlight-card__meta">{{ trio.matches }}x · {{ trio.win_rate.toFixed(0) }}% · {{ trio.avg_rating.toFixed(1) }}</span>
                </div>
              </div>
              <span v-else class="role-highlight-card__meta">No trio data</span>
            </div>
          </div>
        </div>
      </section>
      <EmptyState v-else icon="📈" title="No Highlights Yet" message="Belum ada data performa pemain untuk ditampilkan." />
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

.stats-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.stats-toolbar__patch {
  min-width: 280px;
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

.highlights-section {
  margin-top: 4px;
}

.highlights-section__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.3rem;
  letter-spacing: 1.8px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.highlights-section__subtitle {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.05rem;
  letter-spacing: 1.2px;
  color: var(--text-secondary);
  margin: 18px 0 10px;
}

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.highlight-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, rgba(14, 34, 26, 0.9), rgba(9, 12, 11, 0.95));
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform .2s ease, border-color .2s ease;
}

.highlight-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 255, 135, 0.45);
}

.highlight-card--negative {
  background: linear-gradient(160deg, rgba(46, 14, 14, 0.9), rgba(20, 8, 8, 0.95));
  border-color: rgba(239, 68, 68, 0.35);
}

.highlight-card--negative:hover {
  border-color: rgba(248, 113, 113, 0.6);
}

.highlight-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.highlight-card__icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: var(--green-neon);
}

.highlight-card__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.highlight-card--negative .highlight-card__icon {
  color: #f87171;
}

.highlight-card__label {
  font-family: 'Teko', var(--font-heading);
  letter-spacing: 1px;
  color: var(--text-secondary);
  font-size: 1rem;
}

.highlight-card__player {
  display: flex;
  align-items: center;
  gap: 8px;
}

.highlight-card__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
}

.highlight-card__name {
  color: var(--text-primary);
  font-weight: 600;
}

.highlight-card__value {
  margin: 10px 0 0;
  font-family: 'Teko', var(--font-heading);
  font-size: 2rem;
  line-height: 1;
  color: var(--green-neon);
}

.performance-highlights {
  margin-top: 6px;
}

.performance-highlights-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.highlight-card--compact {
  padding: 10px;
}

.highlight-card--compact .highlight-card__label {
  font-size: 0.86rem;
}

.highlight-card--compact .highlight-card__value {
  font-size: 1.45rem;
  margin-top: 8px;
}

.role-highlights-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.role-highlight-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: rgba(8, 24, 18, 0.9);
  padding: 10px;
  text-align: left;
  cursor: pointer;
  transition: border-color .2s ease, transform .2s ease;
}

.role-highlight-card:hover {
  border-color: rgba(0, 255, 135, 0.4);
  transform: translateY(-2px);
}

.role-highlight-card__role {
  display: inline-block;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.95rem;
  letter-spacing: 1px;
  color: var(--green-neon);
  margin-bottom: 6px;
}

.role-highlight-card__player {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-highlight-card__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
}

.role-highlight-card__name {
  font-size: 0.86rem;
  color: var(--text-primary);
  font-weight: 600;
}

.role-highlight-card__meta {
  display: block;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.synergy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.synergy-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
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
  .stats-toolbar {
    justify-content: stretch;
  }

  .stats-toolbar__patch {
    min-width: 100%;
  }

  .synergy-grid {
    grid-template-columns: 1fr;
  }

  .performance-highlights-grid {
    grid-template-columns: 1fr;
  }

  .role-highlights-grid {
    grid-template-columns: 1fr;
  }

  .highlights-grid {
    grid-template-columns: 1fr;
  }

  .hero-favorite-grid {
    grid-template-columns: 1fr;
  }
}
</style>
