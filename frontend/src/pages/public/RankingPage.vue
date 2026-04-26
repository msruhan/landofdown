<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { rankingsApi, patchesApi } from '@/services/api'
import type { RankingEntry, Column, FilterOptions } from '@/types'
import DataTable from '@/components/DataTable.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import WinRateBar from '@/components/WinRateBar.vue'
import KDADisplay from '@/components/KDADisplay.vue'
import PlayerBadge from '@/components/PlayerBadge.vue'
import RoleBadge from '@/components/RoleBadge.vue'
import { getAvatarUrl, handleAvatarError } from '@/utils/avatar'

const rankings = ref<RankingEntry[]>([])
const loading = ref(true)
const sortBy = ref('wins')
const sortDir = ref<'asc' | 'desc'>('desc')
const filters = ref<FilterOptions>({})
const patchOptions = ref<{ value: number; label: string }[]>([])

const columns: Column[] = [
  { key: 'rank', label: '#', width: '60px', align: 'center' },
  { key: 'username', label: 'Player' },
  { key: 'matches_played', label: 'Matches', sortable: true, align: 'center' },
  { key: 'win_rate', label: 'Win Rate', sortable: true, width: '160px' },
  { key: 'form_meter', label: 'Form', sortable: false, align: 'center' },
  { key: 'mvp_win_count', label: 'MVP Win', sortable: true, align: 'center' },
  { key: 'mvp_lose_count', label: 'MVP Lose', sortable: true, align: 'center' },
  { key: 'avg_rating', label: 'Avg Rating', sortable: true, align: 'center' },
  { key: 'kda', label: 'KDA', align: 'center' },
  { key: 'top_hero', label: 'Top Hero' },
  { key: 'top_role', label: 'Top Role' },
]

const sortOptions = [
  { value: 'wins', label: 'Most Wins' },
  { value: 'win_rate', label: 'Highest Win Rate' },
  { value: 'mvp_count', label: 'Most MVPs' },
  { value: 'avg_rating', label: 'Highest Avg Rating' },
  { value: 'avg_kills', label: 'Most Kills' },
  { value: 'avg_assists', label: 'Most Assists' },
  { value: 'avg_deaths', label: 'Least Deaths' },
]

const top5 = computed(() => rankings.value.slice(0, 5))
const podiumOrder = computed<RankingEntry[]>(() => {
  const t = top5.value
  if (t.length < 3) return t
  const order = [t[1]!, t[0]!, t[2]!]
  if (t.length > 3) order.push(t[3]!)
  if (t.length > 4) order.push(t[4]!)
  return order
})
const maxStat = computed(() => {
  if (!top5.value.length) return 1
  return Math.max(...top5.value.map(p => p.wins)) || 1
})

async function fetchRankings() {
  loading.value = true
  try {
    const { role_id: _roleId, hero_id: _heroId, ...restFilters } = filters.value
    const response = await rankingsApi.getRankings({
      ...restFilters,
      sort_by: sortBy.value,
      sort_dir: sortDir.value,
    })
    rankings.value = response.data.data.map((r, i) => {
      const rank = i + 1
      // Fallback: jika API belum kirim previous_rank, tetap render indikator (netral)
      const previousRank = r.previous_rank ?? rank
      return {
        ...r,
        rank,
        previous_rank: previousRank,
        rank_change: previousRank ? previousRank - rank : 0,
      }
    })
  } catch {
    rankings.value = []
  } finally {
    loading.value = false
  }
}

async function fetchPatchOptions() {
  try {
    const response = await patchesApi.list()
    patchOptions.value = (response.data.data ?? []).map((p) => ({
      value: p.id,
      label: `${p.version}${p.name ? ` - ${p.name}` : ''}`,
    }))
  } catch {
    patchOptions.value = []
  }
}

function handleSort(key: string) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = 'desc'
  }
  fetchRankings()
}

function handleFilter(f: FilterOptions) {
  filters.value = f
  if (f.sort_by) sortBy.value = f.sort_by
  fetchRankings()
}

function getRankStyle(rank: number) {
  if (rank === 1) return { color: 'var(--gold)', fontWeight: '800' }
  if (rank === 2) return { color: 'var(--silver)', fontWeight: '800' }
  if (rank === 3) return { color: 'var(--bronze)', fontWeight: '800' }
  return {}
}

function barHeight(player: RankingEntry): string {
  const rank = player.rank ?? 6
  const heights = [0, 100, 80, 64, 48, 36]
  return `${heights[rank] ?? 30}%`
}

function barColor(rank: number): string {
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
  await fetchPatchOptions()
  await fetchRankings()
})
</script>

<template>
  <div class="ranking-page">
    <!-- ========== HEADER ========== -->
    <div class="ranking-header">
      <div class="ranking-header__bg"></div>
      <div class="ranking-header__content">
        <h1 class="ranking-header__title">LEADERBOARD</h1>
        <p class="ranking-header__subtitle">Player rankings based on performance</p>
      </div>
    </div>

    <!-- ========== TOP 5 PODIUM ========== -->
    <section v-if="!loading && top5.length >= 3" class="podium-section">
      <h2 class="podium-section__heading">
        <svg viewBox="0 0 24 24" fill="none" class="podium-section__icon"><path d="M8 21h8 M12 17v4 M7 4h10v3a5 5 0 0 1-5 5a5 5 0 0 1-5-5z M7 7H5a2 2 0 0 0 2 2 M17 7h2a2 2 0 0 1-2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        TOP PERFORMERS
      </h2>
      <div class="podium">
        <div
          v-for="player in podiumOrder"
          :key="player.player_id"
          class="podium__col"
          :class="`podium__col--rank-${player.rank}`"
        >
          <div class="podium__player">
            <div class="podium__avatar-wrap" :class="`podium__avatar-wrap--rank-${player.rank}`">
              <img
                :src="getAvatarUrl(player.username, player.avatar_url)"
                :alt="player.username"
                class="podium__avatar"
                @error="(event) => handleAvatarError(event, player.username)"
              />
              <span class="podium__rank-badge" :class="`podium__rank-badge--rank-${player.rank}`">{{ player.rank }}</span>
            </div>
            <span class="podium__name">{{ player.username }}</span>
            <div class="podium__stats">
              <span class="podium__stat-main">{{ player.wins }}W</span>
              <span class="podium__stat-sub">{{ player.win_rate.toFixed(0) }}%</span>
            </div>
          </div>
          <div class="podium__bar-wrap">
            <div
              class="podium__bar"
              :style="{ height: barHeight(player), background: barColor(player.rank ?? 5) }"
            >
              <span class="podium__bar-label">{{ rankLabel(player.rank ?? 5) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== FILTERS ========== -->
    <FilterPanel
      :show-sort="true"
      :show-patch="true"
      :patch-options="patchOptions"
      :sort-options="sortOptions"
      @filter="handleFilter"
    />

    <!-- ========== TABLE ========== -->
    <DataTable
      :columns="columns"
      :data="(rankings as unknown as Record<string, unknown>[])"
      :loading="loading"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      @sort="handleSort"
    >
      <template #cell-rank="{ value }">
        <span class="rank-number" :style="getRankStyle(value as number)">
          <template v-if="(value as number) <= 3">
            {{ (value as number) === 1 ? '🥇' : (value as number) === 2 ? '🥈' : '🥉' }}
          </template>
          <template v-else>{{ value }}</template>
        </span>
      </template>

      <template #cell-username="{ row }">
        <div class="player-with-trend">
          <PlayerBadge
            :username="(row as unknown as RankingEntry).username"
            :avatar-url="(row as unknown as RankingEntry).avatar_url"
            :player-id="(row as unknown as RankingEntry).player_id"
            :linkable="true"
          />
          <span
            v-if="((row as unknown as RankingEntry).rank_change ?? 0) > 0"
            class="rank-trend rank-trend--up"
            :title="`Naik ${((row as unknown as RankingEntry).rank_change ?? 0)} peringkat dari match sebelumnya`"
          >
            ▲ {{ (row as unknown as RankingEntry).rank_change }}
          </span>
          <span
            v-else-if="((row as unknown as RankingEntry).rank_change ?? 0) < 0"
            class="rank-trend rank-trend--down"
            :title="`Turun ${Math.abs((row as unknown as RankingEntry).rank_change ?? 0)} peringkat dari match sebelumnya`"
          >
            ▼ {{ Math.abs((row as unknown as RankingEntry).rank_change ?? 0) }}
          </span>
          <span
            v-else
            class="rank-trend rank-trend--same"
            title="Peringkat sama seperti match sebelumnya"
          >
            • 0
          </span>
        </div>
      </template>

      <template #cell-win_rate="{ row }">
        <WinRateBar :win-rate="(row as unknown as RankingEntry).win_rate" :wins="(row as unknown as RankingEntry).wins" :losses="(row as unknown as RankingEntry).losses" />
      </template>

      <template #cell-form_meter="{ row }">
        <span
          class="badge"
          :style="(row as unknown as RankingEntry).form_meter === 'hot'
            ? 'background: rgba(0,255,135,.15); color:#00ff87; border-color: rgba(0,255,135,.35);'
            : (row as unknown as RankingEntry).form_meter === 'warm'
              ? 'background: rgba(245,158,11,.15); color:#f59e0b; border-color: rgba(245,158,11,.35);'
              : 'background: rgba(239,68,68,.15); color:#f87171; border-color: rgba(239,68,68,.35);'"
        >
          {{ ((row as unknown as RankingEntry).form_meter ?? 'cold').toUpperCase() }}
        </span>
      </template>

      <template #cell-mvp_win_count="{ value }">
        <span v-if="(value as number) > 0" class="badge badge-gold">🏆W {{ value }}</span>
        <span v-else class="text-muted">0</span>
      </template>

      <template #cell-mvp_lose_count="{ value }">
        <span v-if="(value as number) > 0" class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.35);">🏆L {{ value }}</span>
        <span v-else class="text-muted">0</span>
      </template>

      <template #cell-avg_rating="{ value }">
        <span class="text-green" style="font-weight: 700; font-family: var(--font-heading);">{{ (value as number)?.toFixed(1) }}</span>
      </template>

      <template #cell-kda="{ row }">
        <KDADisplay
          :kills="(row as unknown as RankingEntry).total_kda.kills"
          :deaths="(row as unknown as RankingEntry).total_kda.deaths"
          :assists="(row as unknown as RankingEntry).total_kda.assists"
          size="sm"
        />
      </template>

      <template #cell-top_hero="{ row }">
        <img
          v-if="(row as unknown as RankingEntry).top_hero_icon"
          :src="(row as unknown as RankingEntry).top_hero_icon!"
          :alt="(row as unknown as RankingEntry).top_hero || 'Hero'"
          class="top-hero-image"
          loading="lazy"
        />
        <span v-else class="text-muted">-</span>
      </template>

      <template #cell-top_role="{ value }">
        <RoleBadge v-if="value" :role="value as string" />
        <span v-else class="text-muted">-</span>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.ranking-page {
  animation: fade-in 0.4s ease;
}

/* ============================
   HEADER
   ============================ */
.ranking-header {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 32px;
  padding: 40px;
  background: linear-gradient(160deg, #0d1f17 0%, #0a0a0a 40%, #0d1f17 100%);
  border: 1px solid var(--border-color);
}
.ranking-header__bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 1px 1px, rgba(0, 255, 135, 0.06) 1px, transparent 0);
  background-size: 40px 40px;
}
.ranking-header__content {
  position: relative;
  z-index: 1;
  text-align: center;
}
.ranking-header__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 3rem;
  letter-spacing: 6px;
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
.ranking-header__subtitle {
  color: var(--text-secondary);
  font-family: 'Teko', var(--font-heading);
  font-size: 1.1rem;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* ============================
   PODIUM SECTION
   ============================ */
.podium-section {
  margin-bottom: 36px;
}
.podium-section__heading {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.3rem;
  letter-spacing: 2px;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.podium-section__icon {
  width: 20px;
  height: 20px;
  color: var(--gold);
}

.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  min-height: 340px;
  position: relative;
  overflow: hidden;
}
.podium::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--green-neon), transparent);
  opacity: 0.3;
}

.podium__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 140px;
  gap: 8px;
}

.podium__player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: slide-up 0.5s ease both;
}
.podium__col--rank-1 .podium__player { animation-delay: 0.15s; }
.podium__col--rank-2 .podium__player { animation-delay: 0.05s; }
.podium__col--rank-3 .podium__player { animation-delay: 0.25s; }
.podium__col--rank-4 .podium__player { animation-delay: 0.35s; }
.podium__col--rank-5 .podium__player { animation-delay: 0.45s; }

.podium__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.podium__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  padding: 2px;
}
.podium__avatar-wrap--rank-1 .podium__avatar {
  width: 60px;
  height: 60px;
  border-color: var(--gold);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
}
.podium__avatar-wrap--rank-2 .podium__avatar {
  width: 52px;
  height: 52px;
  border-color: var(--silver);
  box-shadow: 0 0 10px rgba(192, 192, 192, 0.2);
}
.podium__avatar-wrap--rank-3 .podium__avatar {
  width: 52px;
  height: 52px;
  border-color: var(--bronze);
  box-shadow: 0 0 10px rgba(205, 127, 50, 0.2);
}

.podium__rank-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.8rem;
  font-weight: 700;
  color: #000;
  background: var(--green-neon);
  border: 2px solid var(--bg-card);
}
.podium__rank-badge--rank-1 { background: var(--gold); }
.podium__rank-badge--rank-2 { background: var(--silver); }
.podium__rank-badge--rank-3 { background: var(--bronze); color: #fff; }

.podium__name {
  font-family: 'Teko', var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-white);
  letter-spacing: 0.5px;
  text-align: center;
  line-height: 1.1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium__stats {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.podium__stat-main {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--green-neon);
}
.podium__stat-sub {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.podium__bar-wrap {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.podium__bar {
  width: 100%;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10px;
  position: relative;
  animation: bar-grow 0.8s ease both;
  animation-delay: 0.2s;
  transform-origin: bottom;
}
.podium__col--rank-1 .podium__bar { animation-delay: 0.3s; }
.podium__col--rank-2 .podium__bar { animation-delay: 0.15s; }
.podium__col--rank-3 .podium__bar { animation-delay: 0.4s; }
.podium__col--rank-4 .podium__bar { animation-delay: 0.5s; }
.podium__col--rank-5 .podium__bar { animation-delay: 0.6s; }

@keyframes bar-grow {
  from { height: 0 !important; opacity: 0; }
  to { opacity: 1; }
}

.podium__bar-label {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: 1px;
}

/* ============================
   TABLE AREA
   ============================ */
.rank-number {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
}

.player-with-trend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.rank-trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 999px;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.5px;
  border: 1px solid transparent;
}

.rank-trend--up {
  color: #00ff87;
  background: rgba(0, 255, 135, 0.12);
  border-color: rgba(0, 255, 135, 0.35);
}

.rank-trend--down {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.12);
  border-color: rgba(255, 107, 107, 0.35);
}

.rank-trend--same {
  color: #9ca3af;
  background: rgba(156, 163, 175, 0.12);
  border-color: rgba(156, 163, 175, 0.3);
}

.top-hero-image {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(0, 255, 135, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.18);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============================
   RESPONSIVE
   ============================ */
@media (max-width: 768px) {
  .podium {
    gap: 8px;
    padding: 16px 8px;
    min-height: 280px;
  }
  .podium__col { max-width: 100px; }
  .podium__avatar-wrap--rank-1 .podium__avatar { width: 48px; height: 48px; }
  .podium__avatar-wrap--rank-2 .podium__avatar,
  .podium__avatar-wrap--rank-3 .podium__avatar { width: 44px; height: 44px; }
  .podium__bar-wrap { height: 120px; }
  .podium__name { font-size: 0.85rem; }
  .ranking-header__title { font-size: 2.2rem; letter-spacing: 3px; }
}

@media (max-width: 480px) {
  .podium__col--rank-4,
  .podium__col--rank-5 { display: none; }
}
</style>
