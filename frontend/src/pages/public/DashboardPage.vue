<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { statisticsApi, patchesApi } from '@/services/api'
import type { DashboardStats, Patch } from '@/types'
import { getAvatarUrl, handleAvatarError } from '@/utils/avatar'
import StatCard from '@/components/StatCard.vue'
import LeaderboardCard from '@/components/LeaderboardCard.vue'
import MatchResultCard from '@/components/MatchResultCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend)

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedPatchId = ref<number | undefined>(undefined)
const patchOptions = ref<Patch[]>([])

async function loadDashboard() {
  try {
    const response = await statisticsApi.getDashboard(selectedPatchId.value ? { patch_id: selectedPatchId.value } : {})
    stats.value = response.data
  } catch {
    error.value = 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const patchRes = await patchesApi.list()
    patchOptions.value = patchRes.data.data ?? []
  } catch {
    patchOptions.value = []
  }
  await loadDashboard()
})

const featuredMvp = computed(
  () => stats.value?.season_mvp ?? stats.value?.top_mvps?.[0] ?? null,
)

const bestWinRatePlayer = computed(() => {
  const rows = stats.value?.top_winners ?? []
  if (!rows.length) return null
  return rows
    .slice()
    .sort((a, b) => {
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate
      if (b.matches_played !== a.matches_played) return b.matches_played - a.matches_played
      return b.wins - a.wins
    })[0] ?? null
})

const highestRatedPlayer = computed(() => {
  const rows = [...(stats.value?.top_winners ?? []), ...(stats.value?.top_mvps ?? [])]
  if (!rows.length) return null
  const unique = new Map<number, typeof rows[number]>()
  for (const row of rows) {
    if (!unique.has(row.player_id)) unique.set(row.player_id, row)
  }
  return [...unique.values()]
    .sort((a, b) => {
      if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating
      return b.matches_played - a.matches_played
    })[0] ?? null
})

const topMvpPlayer = computed(() => stats.value?.top_mvps?.[0] ?? null)

const avgMatchesPerPlayer = computed(() => {
  if (!stats.value || stats.value.total_players === 0) return 0
  return Number((stats.value.total_matches / stats.value.total_players).toFixed(1))
})

const totalKillsEstimate = computed(() => {
  if (!stats.value) return 0
  const avgKills = stats.value.top_mvps?.length
    ? stats.value.top_mvps.reduce((s, p) => s + p.avg_kills, 0) / stats.value.top_mvps.length
    : 5
  return Math.round(avgKills * stats.value.total_matches * 5)
})

function getHeroChartData() {
  if (!stats.value?.most_used_heroes?.length) return null
  const heroes = stats.value.most_used_heroes.slice(0, 10)
  return {
    labels: heroes.map((h) => h.hero_name),
    datasets: [
      {
        label: 'Times Used',
        data: heroes.map((h) => h.count),
        backgroundColor: 'rgba(0, 255, 135, 0.6)',
        borderColor: '#00ff87',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }
}

function getRoleChartData() {
  if (!stats.value?.most_played_roles?.length) return null
  return {
    labels: stats.value.most_played_roles.map((r) => r.role_name),
    datasets: [
      {
        label: 'Times Played',
        data: stats.value.most_played_roles.map((r) => r.count),
        backgroundColor: [
          'rgba(0, 255, 135, 0.6)',
          'rgba(6, 182, 212, 0.6)',
          'rgba(255, 215, 0, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(245, 158, 11, 0.6)',
        ],
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111a15',
      titleColor: '#e4e4e7',
      bodyColor: '#a1a1aa',
      borderColor: '#1e3a2a',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      ticks: { color: '#71717a', font: { family: 'Rajdhani', size: 12 } },
      grid: { color: 'rgba(30, 58, 42, 0.3)' },
    },
    y: {
      ticks: { color: '#71717a', font: { family: 'Rajdhani', size: 12 } },
      grid: { color: 'rgba(30, 58, 42, 0.3)' },
    },
  },
}

const barOptions = {
  ...chartOptions,
  indexAxis: 'y' as const,
}
</script>

<template>
  <div class="dashboard">

    <!-- ========== SECTION 1: EPIC HERO BANNER ========== -->
    <section class="hero-banner">
      <div class="hero-banner__grid-bg"></div>
      <div class="hero-banner__particles"></div>

      <div class="hero-banner__hex hero-banner__hex--1"></div>
      <div class="hero-banner__hex hero-banner__hex--2"></div>
      <div class="hero-banner__hex hero-banner__hex--3"></div>
      <div class="hero-banner__diag hero-banner__diag--1"></div>
      <div class="hero-banner__diag hero-banner__diag--2"></div>

      <div class="hero-banner__corner hero-banner__corner--tl"></div>
      <div class="hero-banner__corner hero-banner__corner--tr"></div>
      <div class="hero-banner__corner hero-banner__corner--bl"></div>
      <div class="hero-banner__corner hero-banner__corner--br"></div>

      <div class="hero-banner__content">
        <div class="hero-banner__badge">MOBILE LEGENDS: BANG BANG</div>
        <h1 class="hero-banner__title">
          <span class="hero-banner__title-line">MLBB STATS</span>
          <span class="hero-banner__title-accent">TRACKER</span>
        </h1>
        <p class="hero-banner__subtitle">
          Track match results, player performance, and climb the leaderboard
        </p>
        <div class="hero-banner__actions">
          <router-link to="/ranking" class="hero-btn hero-btn--primary">
            <svg class="hero-btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            View Rankings
          </router-link>
          <router-link to="/statistics" class="hero-btn hero-btn--secondary">
            <svg class="hero-btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 19h16M7 17V9M12 17V5M17 17v-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            View Statistics
          </router-link>
        </div>
        <div class="hero-banner__season">
          <label class="hero-banner__season-label">Season / Split</label>
          <select v-model.number="selectedPatchId" class="form-select hero-banner__season-select" @change="loading = true; loadDashboard()">
            <option :value="undefined">All Seasons</option>
            <option v-for="patch in patchOptions" :key="patch.id" :value="patch.id">
              {{ patch.version }}{{ patch.name ? ` - ${patch.name}` : '' }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <LoadingSpinner v-if="loading" size="lg" text="Loading dashboard..." />

    <div v-else-if="error" class="card" style="text-align: center; padding: 48px;">
      <p class="text-red">{{ error }}</p>
      <button class="btn btn-secondary mt-md" @click="$router.go(0)">Retry</button>
    </div>

    <template v-else-if="stats">

      <!-- ========== SECTION 2: STAT CARDS ROW ========== -->
      <section class="section">
        <div class="grid-5 stagger-children">
          <StatCard title="Total Matches" :value="stats.total_matches" icon="matches" color="#00ff87" />
          <StatCard title="Total Players" :value="stats.total_players" icon="players" color="#06b6d4" />
          <StatCard title="Heroes Used" :value="stats.total_heroes" icon="heroes" color="#f59e0b" />
          <StatCard title="Total MVPs" :value="stats.total_mvps" icon="mvps" color="#ffd700" />
          <StatCard title="Global Win Rate" :value="stats.global_win_rate.toFixed(1) + '%'" icon="winrate" color="#10b981" />
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Key Insights</h2>
        </div>
        <div class="grid-4 stagger-children">
          <article class="insight-card card">
            <p class="insight-card__label">Best Win Rate</p>
            <p class="insight-card__value">{{ bestWinRatePlayer?.username ?? '-' }}</p>
            <p class="insight-card__meta">{{ bestWinRatePlayer ? `${bestWinRatePlayer.win_rate.toFixed(1)}% · ${bestWinRatePlayer.matches_played} match` : '-' }}</p>
          </article>
          <article class="insight-card card">
            <p class="insight-card__label">Highest Avg Rating</p>
            <p class="insight-card__value">{{ highestRatedPlayer?.username ?? '-' }}</p>
            <p class="insight-card__meta">{{ highestRatedPlayer ? `${highestRatedPlayer.avg_rating.toFixed(1)} rating` : '-' }}</p>
          </article>
          <article class="insight-card card">
            <p class="insight-card__label">Most MVP</p>
            <p class="insight-card__value">{{ topMvpPlayer?.username ?? '-' }}</p>
            <p class="insight-card__meta">{{ topMvpPlayer ? `${topMvpPlayer.mvp_count} MVP` : '-' }}</p>
          </article>
          <article class="insight-card card">
            <p class="insight-card__label">Avg Matches / Player</p>
            <p class="insight-card__value">{{ avgMatchesPerPlayer }}</p>
            <p class="insight-card__meta">Overall activity</p>
          </article>
        </div>
      </section>

      <!-- ========== SECTION 3: FEATURED MVP PLAYER ========== -->
      <section v-if="featuredMvp" class="section">
        <div class="mvp-card">
          <div class="mvp-card__corner mvp-card__corner--tl"></div>
          <div class="mvp-card__corner mvp-card__corner--tr"></div>
          <div class="mvp-card__corner mvp-card__corner--bl"></div>
          <div class="mvp-card__corner mvp-card__corner--br"></div>
          <div class="mvp-card__glow"></div>

          <div class="mvp-card__header">
            <span class="mvp-card__crown">👑</span>
            <span class="mvp-card__header-text">MVP OF THE SEASON</span>
            <span class="mvp-card__crown">👑</span>
          </div>

          <div class="mvp-card__body">
            <div class="mvp-card__avatar-wrap">
              <img
                :src="getAvatarUrl(featuredMvp.username)"
                :alt="featuredMvp.username"
                class="mvp-card__avatar"
                @error="(event) => handleAvatarError(event, featuredMvp?.username ?? 'Player')"
              />
              <div class="mvp-card__avatar-ring"></div>
            </div>

            <div class="mvp-card__info">
              <h3 class="mvp-card__username">{{ featuredMvp.username }}</h3>
              <div class="mvp-card__stats-grid">
                <div class="mvp-card__stat">
                  <span class="mvp-card__stat-value">{{ featuredMvp.mvp_count }}</span>
                  <span class="mvp-card__stat-label">MVPs</span>
                </div>
                <div class="mvp-card__stat">
                  <span class="mvp-card__stat-value">{{ featuredMvp.win_rate.toFixed(1) }}%</span>
                  <span class="mvp-card__stat-label">Win Rate</span>
                </div>
                <div class="mvp-card__stat">
                  <span class="mvp-card__stat-value">{{ featuredMvp.avg_rating.toFixed(1) }}</span>
                  <span class="mvp-card__stat-label">Avg Rating</span>
                </div>
                <div class="mvp-card__stat">
                  <span class="mvp-card__stat-value">{{ featuredMvp.matches_played }}</span>
                  <span class="mvp-card__stat-label">Matches</span>
                </div>
              </div>
              <div class="mvp-card__kda">
                <span class="kda-kills">{{ featuredMvp.avg_kills.toFixed(1) }}</span>
                <span class="kda-sep">/</span>
                <span class="kda-deaths">{{ featuredMvp.avg_deaths.toFixed(1) }}</span>
                <span class="kda-sep">/</span>
                <span class="kda-assists">{{ featuredMvp.avg_assists.toFixed(1) }}</span>
                <span class="kda-label">AVG KDA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========== SECTION 4: TOP PERFORMERS ========== -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Top Performers</h2>
          <router-link to="/ranking" class="link-btn">VIEW ALL RANKINGS →</router-link>
        </div>
        <div class="grid-2 stagger-children">
          <LeaderboardCard title="Most Wins" :players="stats.top_winners" stat-key="wins" />
          <LeaderboardCard title="Most MVPs" :players="stats.top_mvps" stat-key="mvp_count" />
        </div>
      </section>

      <!-- ========== SECTION 5: LIVE STATS BANNER ========== -->
      <section class="section">
        <div class="live-banner">
          <div class="live-banner__indicator">
            <span class="live-banner__dot"></span>
            LIVE STATS
          </div>
          <div class="live-banner__track">
            <div class="live-banner__scroll">
              <span class="live-banner__item">⚔ {{ totalKillsEstimate.toLocaleString() }} total kills recorded</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 6L4 3L2 7L6 10M16 18L20 21L22 17L18 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 8L14 12M14 12L10 16M14 12H6M14 12H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ totalKillsEstimate.toLocaleString() }} total kills recorded
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 9h12a3 3 0 013 3v4a2 2 0 01-2 2h-2l-2-2H9l-2 2H5a2 2 0 01-2-2v-4a3 3 0 013-3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <path d="M8 13h3M9.5 11.5v3M16 12h.01M18 14h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ stats.total_matches }} matches played
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ stats.total_mvps }} MVPs awarded
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M16 7a3 3 0 110 6a3 3 0 010-6zM8 8a4 4 0 110 8a4 4 0 010-8z" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M3 19a5 5 0 015-5h1a5 5 0 015 5M14 19a4 4 0 014-4h.5A3.5 3.5 0 0122 18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ stats.total_players }} players competing
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 19h16M7 16l3-4l3 2l4-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8h3v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ stats.global_win_rate.toFixed(1) }}% global win rate
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l2.4 3.6L19 8l-3 3.4l.6 4.8L12 14.4L7.4 16.2L8 11.4L5 8l4.6-1.4L12 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
                {{ stats.total_heroes }} heroes in the pool
              </span>
              <span class="live-banner__divider">◆</span>
              <!-- duplicate for seamless loop -->
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 6L4 3L2 7L6 10M16 18L20 21L22 17L18 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 8L14 12M14 12L10 16M14 12H6M14 12H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ totalKillsEstimate.toLocaleString() }} total kills recorded
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 9h12a3 3 0 013 3v4a2 2 0 01-2 2h-2l-2-2H9l-2 2H5a2 2 0 01-2-2v-4a3 3 0 013-3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <path d="M8 13h3M9.5 11.5v3M16 12h.01M18 14h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ stats.total_matches }} matches played
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ stats.total_mvps }} MVPs awarded
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M16 7a3 3 0 110 6a3 3 0 010-6zM8 8a4 4 0 110 8a4 4 0 010-8z" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M3 19a5 5 0 015-5h1a5 5 0 015 5M14 19a4 4 0 014-4h.5A3.5 3.5 0 0122 18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ stats.total_players }} players competing
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 19h16M7 16l3-4l3 2l4-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8h3v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ stats.global_win_rate.toFixed(1) }}% global win rate
              </span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">
                <svg class="live-banner__item-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l2.4 3.6L19 8l-3 3.4l.6 4.8L12 14.4L7.4 16.2L8 11.4L5 8l4.6-1.4L12 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
                {{ stats.total_heroes }} heroes in the pool
              </span>
              <span class="live-banner__divider">◆</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ========== SECTION 7: RECENT MATCHES ========== -->
      <section v-if="stats.recent_matches?.length" class="section">
        <div class="section-header">
          <h2 class="section-title">Recent Matches</h2>
          <router-link to="/statistics" class="link-btn">VIEW ALL MATCHES →</router-link>
        </div>
        <div class="grid-3 stagger-children">
          <MatchResultCard v-for="match in stats.recent_matches.slice(0, 6)" :key="match.id" :match="match" />
        </div>
      </section>

      <!-- ========== SECTION 8: HERO & ROLE CHARTS ========== -->
      <section class="section">
        <div class="grid-2">
          <div v-if="getHeroChartData()">
            <h2 class="section-title">Most Used Heroes</h2>
            <div class="chart-panel">
              <div class="chart-panel__inner chart-panel__inner--tall">
                <Bar :data="getHeroChartData()!" :options="barOptions" />
              </div>
            </div>
          </div>
          <div v-if="getRoleChartData()">
            <h2 class="section-title">Most Played Roles</h2>
            <div class="chart-panel">
              <div class="chart-panel__inner chart-panel__inner--tall">
                <Bar :data="getRoleChartData()!" :options="chartOptions" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========== SECTION 9: QUICK LINKS CTA FOOTER ========== -->
      <section class="section">
        <div class="grid-3 stagger-children">
          <router-link to="/statistics" class="cta-card">
            <div class="cta-card__icon-wrap">
              <svg class="cta-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 19h16M7 17V9M12 17V5M17 17v-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="cta-card__title">Player Statistics</h3>
            <p class="cta-card__desc">Dive deep into individual player performance, KDA ratios, hero preferences and match history.</p>
            <span class="cta-card__link">Explore Stats →</span>
          </router-link>

          <router-link to="/ranking" class="cta-card">
            <div class="cta-card__icon-wrap">
              <svg class="cta-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="cta-card__title">Leaderboard</h3>
            <p class="cta-card__desc">See who dominates the rankings. Compare win rates, MVP counts, and overall ratings.</p>
            <span class="cta-card__link">View Rankings →</span>
          </router-link>

          <router-link to="/statistics" class="cta-card">
            <div class="cta-card__icon-wrap">
              <svg class="cta-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 6L4 3L2 7L6 10M16 18L20 21L22 17L18 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 8L14 12M14 12L10 16M14 12H6M14 12H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
            <h3 class="cta-card__title">Match History</h3>
            <p class="cta-card__desc">Browse all recorded matches, team compositions, and detailed game results.</p>
            <span class="cta-card__link">View Matches →</span>
          </router-link>
        </div>
      </section>

    </template>
  </div>
</template>

<style scoped>
/* ============================================
   SECTION 1: EPIC HERO BANNER
   ============================================ */
.hero-banner {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 48px;
  padding: 80px 40px;
  background: linear-gradient(160deg, #0d1f17 0%, #0a0a0a 40%, #0d1f17 100%);
  border: 1px solid var(--border-color);
}

.hero-banner__grid-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 1px 1px, rgba(0, 255, 135, 0.08) 1px, transparent 0);
  background-size: 40px 40px;
  animation: grid-drift 20s linear infinite;
}

@keyframes grid-drift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(40px, 40px); }
}

.hero-banner__particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.hero-banner__particles::before,
.hero-banner__particles::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(0, 255, 135, 0.3);
  animation: float-particle 6s ease-in-out infinite;
}

.hero-banner__particles::before {
  width: 4px;
  height: 4px;
  top: 20%;
  left: 15%;
  box-shadow:
    80px 40px 0 rgba(0, 255, 135, 0.2),
    200px -30px 0 rgba(6, 182, 212, 0.25),
    350px 80px 0 rgba(0, 255, 135, 0.15),
    500px 20px 0 rgba(6, 182, 212, 0.2),
    650px -20px 0 rgba(0, 255, 135, 0.3),
    120px 100px 0 rgba(255, 215, 0, 0.15),
    420px 110px 0 rgba(0, 255, 135, 0.2),
    700px 60px 0 rgba(6, 182, 212, 0.15);
}

.hero-banner__particles::after {
  width: 3px;
  height: 3px;
  top: 60%;
  left: 25%;
  animation-delay: -3s;
  animation-duration: 8s;
  box-shadow:
    60px -40px 0 rgba(6, 182, 212, 0.25),
    180px 30px 0 rgba(0, 255, 135, 0.2),
    300px -50px 0 rgba(255, 215, 0, 0.15),
    450px 40px 0 rgba(0, 255, 135, 0.25),
    600px -10px 0 rgba(6, 182, 212, 0.2),
    150px 60px 0 rgba(0, 255, 135, 0.15),
    380px 70px 0 rgba(6, 182, 212, 0.2);
}

@keyframes float-particle {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
  25% { transform: translateY(-15px) translateX(5px); opacity: 1; }
  50% { transform: translateY(-5px) translateX(-5px); opacity: 0.8; }
  75% { transform: translateY(-20px) translateX(3px); opacity: 1; }
}

/* Hexagon decorations */
.hero-banner__hex {
  position: absolute;
  width: 80px;
  height: 80px;
  border: 1px solid rgba(0, 255, 135, 0.08);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  animation: hex-spin 30s linear infinite;
}

.hero-banner__hex--1 { top: 10%; right: 10%; width: 100px; height: 100px; border-color: rgba(0, 255, 135, 0.1); }
.hero-banner__hex--2 { bottom: 15%; left: 8%; width: 60px; height: 60px; animation-direction: reverse; }
.hero-banner__hex--3 { top: 50%; right: 25%; width: 40px; height: 40px; animation-duration: 20s; border-color: rgba(6, 182, 212, 0.08); }

@keyframes hex-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Diagonal lines */
.hero-banner__diag {
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 135, 0.1), transparent);
}

.hero-banner__diag--1 { top: 30%; left: 0; right: 0; transform: rotate(-3deg); }
.hero-banner__diag--2 { bottom: 25%; left: 0; right: 0; transform: rotate(2deg); }

/* Corner brackets (HUD frame) */
.hero-banner__corner {
  position: absolute;
  width: 30px;
  height: 30px;
  z-index: 2;
}

.hero-banner__corner--tl { top: 16px; left: 16px; border-top: 2px solid rgba(0, 255, 135, 0.4); border-left: 2px solid rgba(0, 255, 135, 0.4); }
.hero-banner__corner--tr { top: 16px; right: 16px; border-top: 2px solid rgba(0, 255, 135, 0.4); border-right: 2px solid rgba(0, 255, 135, 0.4); }
.hero-banner__corner--bl { bottom: 16px; left: 16px; border-bottom: 2px solid rgba(0, 255, 135, 0.4); border-left: 2px solid rgba(0, 255, 135, 0.4); }
.hero-banner__corner--br { bottom: 16px; right: 16px; border-bottom: 2px solid rgba(0, 255, 135, 0.4); border-right: 2px solid rgba(0, 255, 135, 0.4); }

/* Content */
.hero-banner__content {
  position: relative;
  z-index: 3;
  text-align: center;
}

.hero-banner__badge {
  display: inline-block;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--green-neon);
  border: 1px solid rgba(0, 255, 135, 0.3);
  padding: 6px 20px;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  background: rgba(0, 255, 135, 0.05);
  animation: badge-fade 1s ease-out;
}

@keyframes badge-fade {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-banner__title {
  margin-bottom: 16px;
}

.hero-banner__title-line {
  display: block;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: 6px;
  color: var(--text-white);
  line-height: 1.1;
  animation: title-slide 0.8s ease-out;
}

.hero-banner__title-accent {
  display: block;
  font-size: 4rem;
  font-weight: 700;
  letter-spacing: 8px;
  line-height: 1.1;
  background: linear-gradient(135deg, #00ff87, #06b6d4, #00ff87);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: text-shimmer 3s linear infinite, title-slide 0.8s ease-out 0.15s both;
}

@keyframes text-shimmer {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}

@keyframes title-slide {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-banner__subtitle {
  color: var(--text-secondary);
  font-size: 1.15rem;
  max-width: 520px;
  margin: 0 auto 32px;
  animation: subtitle-fade 1s ease-out 0.4s both;
}

@keyframes subtitle-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.hero-banner__actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  animation: actions-rise 0.8s ease-out 0.6s both;
}

.hero-banner__season {
  max-width: 360px;
  margin: 16px auto 0;
}

.hero-banner__season-label {
  display: block;
  font-family: var(--font-heading);
  color: var(--text-muted);
  letter-spacing: 1px;
  font-size: 0.75rem;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.hero-banner__season-select {
  width: 100%;
}

@keyframes actions-rise {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 14px 32px;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.hero-btn__icon {
  width: 18px;
  height: 18px;
}

.hero-btn--primary {
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.2), rgba(0, 255, 135, 0.1));
  color: var(--green-neon);
  border: 1px solid rgba(0, 255, 135, 0.4);
}

.hero-btn--primary:hover {
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.3), rgba(0, 255, 135, 0.15));
  box-shadow: 0 0 30px rgba(0, 255, 135, 0.2), inset 0 0 30px rgba(0, 255, 135, 0.05);
  transform: translateY(-2px);
}

.hero-btn--secondary {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.hero-btn--secondary:hover {
  border-color: rgba(6, 182, 212, 0.4);
  background: rgba(6, 182, 212, 0.08);
  color: var(--cyan);
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.1);
  transform: translateY(-2px);
}

/* ============================================
   SECTION 3: FEATURED MVP PLAYER
   ============================================ */
.mvp-card {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.04), rgba(17, 26, 21, 0.9), rgba(255, 215, 0, 0.02));
  border: 1px solid rgba(255, 215, 0, 0.25);
  border-radius: var(--radius-xl);
  padding: 40px;
  overflow: hidden;
}

.mvp-card__glow {
  position: absolute;
  inset: -2px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), transparent 40%, transparent 60%, rgba(255, 215, 0, 0.1));
  z-index: 0;
  animation: glow-pulse 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.mvp-card__corner {
  position: absolute;
  width: 24px;
  height: 24px;
  z-index: 2;
}

.mvp-card__corner--tl { top: 12px; left: 12px; border-top: 2px solid rgba(255, 215, 0, 0.5); border-left: 2px solid rgba(255, 215, 0, 0.5); }
.mvp-card__corner--tr { top: 12px; right: 12px; border-top: 2px solid rgba(255, 215, 0, 0.5); border-right: 2px solid rgba(255, 215, 0, 0.5); }
.mvp-card__corner--bl { bottom: 12px; left: 12px; border-bottom: 2px solid rgba(255, 215, 0, 0.5); border-left: 2px solid rgba(255, 215, 0, 0.5); }
.mvp-card__corner--br { bottom: 12px; right: 12px; border-bottom: 2px solid rgba(255, 215, 0, 0.5); border-right: 2px solid rgba(255, 215, 0, 0.5); }

.mvp-card__header {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.mvp-card__crown {
  font-size: 1.3rem;
}

.mvp-card__header-text {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  background: linear-gradient(135deg, #ffd700, #ffaa00, #ffd700);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: text-shimmer 3s linear infinite;
}

.mvp-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
  justify-content: center;
}

.mvp-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.mvp-card__avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 215, 0, 0.1);
  border: 3px solid rgba(255, 215, 0, 0.4);
  padding: 4px;
}

.mvp-card__avatar-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid rgba(255, 215, 0, 0.15);
  animation: ring-pulse 3s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.06); opacity: 1; }
}

.mvp-card__info {
  flex: 1;
  min-width: 280px;
}

.mvp-card__username {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-white);
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.mvp-card__stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.mvp-card__stat {
  text-align: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 215, 0, 0.08);
}

.mvp-card__stat-value {
  display: block;
  font-family: var(--font-heading);
  font-size: 1.6rem;
  font-weight: 700;
  color: #ffd700;
  line-height: 1.2;
}

.mvp-card__stat-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-top: 4px;
}

.mvp-card__kda {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 600;
}

.kda-kills { color: var(--green-neon); }
.kda-deaths { color: var(--danger); }
.kda-assists { color: var(--cyan); }
.kda-sep { color: var(--text-muted); font-weight: 400; }
.kda-label { color: var(--text-muted); font-size: 0.75rem; letter-spacing: 1px; margin-left: 8px; }

/* ============================================
   SECTION 4: SECTION HEADER WITH LINK
   ============================================ */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.link-btn {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--green-neon);
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid rgba(0, 255, 135, 0.2);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
  text-transform: uppercase;
}

.link-btn:hover {
  background: rgba(0, 255, 135, 0.08);
  border-color: rgba(0, 255, 135, 0.4);
  box-shadow: 0 0 15px rgba(0, 255, 135, 0.1);
}

.insight-card {
  padding: 18px;
  background: linear-gradient(150deg, rgba(12, 30, 24, 0.95), rgba(7, 10, 9, 0.96));
}

.insight-card__label {
  margin: 0 0 8px;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.insight-card__value {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.25rem;
  color: var(--text-white);
}

.insight-card__meta {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: var(--green-neon);
}

/* ============================================
   SECTION 5: LIVE STATS BANNER
   ============================================ */
.live-banner {
  position: relative;
  background: rgba(17, 26, 21, 0.8);
  border: 1px solid rgba(0, 255, 135, 0.2);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.live-banner__indicator {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--green-neon);
  background: rgba(17, 26, 21, 0.95);
  padding: 6px 16px 6px 12px;
  border-radius: var(--radius-sm);
  z-index: 2;
  white-space: nowrap;
}

.live-banner__dot {
  width: 8px;
  height: 8px;
  background: var(--green-neon);
  border-radius: 50%;
  animation: dot-blink 1.5s ease-in-out infinite;
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(0, 255, 135, 0.6); }
  50% { opacity: 0.3; box-shadow: none; }
}

.live-banner__track {
  overflow: hidden;
  margin-left: 120px;
}

.live-banner__scroll {
  display: flex;
  gap: 24px;
  white-space: nowrap;
  animation: marquee 35s linear infinite;
}

.live-banner__scroll:hover {
  animation-play-state: paused;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.live-banner__item {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.5px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-banner__item-icon {
  width: 14px;
  height: 14px;
  color: #8aa39a;
  flex-shrink: 0;
}

.live-banner__divider {
  color: rgba(0, 255, 135, 0.3);
  font-size: 0.6rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* ============================================
   SECTION 6: CHART PANELS
   ============================================ */
.chart-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.chart-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--green-neon), transparent);
  opacity: 0.4;
}

.chart-panel:hover {
  border-color: rgba(0, 255, 135, 0.2);
  box-shadow: 0 0 30px rgba(0, 255, 135, 0.05);
}

.chart-panel__inner {
  height: 280px;
}

.chart-panel__inner--tall {
  height: 320px;
}

/* ============================================
   SECTION 9: CTA CARDS
   ============================================ */
.cta-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 28px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.cta-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  background: radial-gradient(ellipse at center, rgba(0, 255, 135, 0.06) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cta-card:hover {
  border-color: rgba(0, 255, 135, 0.3);
  box-shadow: 0 0 30px rgba(0, 255, 135, 0.1);
  transform: translateY(-4px);
}

.cta-card:hover::before {
  opacity: 1;
}

.cta-card__icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 255, 135, 0.06);
  border: 1px solid rgba(0, 255, 135, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.cta-card:hover .cta-card__icon-wrap {
  background: rgba(0, 255, 135, 0.1);
  border-color: rgba(0, 255, 135, 0.3);
  box-shadow: 0 0 20px rgba(0, 255, 135, 0.15);
}

.cta-card__icon {
  width: 28px;
  height: 28px;
  color: var(--green-neon);
}

.cta-card__title {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-white);
  margin-bottom: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.cta-card__desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.cta-card__link {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--green-neon);
  letter-spacing: 1px;
  transition: all 0.3s ease;
}

.cta-card:hover .cta-card__link {
  letter-spacing: 2px;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .hero-banner {
    padding: 50px 20px;
  }

  .hero-banner__title-line {
    font-size: 2rem;
    letter-spacing: 3px;
  }

  .hero-banner__title-accent {
    font-size: 2.4rem;
    letter-spacing: 4px;
  }

  .hero-banner__actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-btn {
    width: 100%;
    max-width: 260px;
    justify-content: center;
  }

  .mvp-card {
    padding: 24px;
  }

  .mvp-card__body {
    flex-direction: column;
    text-align: center;
  }

  .mvp-card__stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .mvp-card__kda {
    justify-content: center;
  }

  .live-banner__indicator {
    position: static;
    transform: none;
    margin-bottom: 10px;
    display: inline-flex;
  }

  .live-banner__track {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .hero-banner__title-line {
    font-size: 1.6rem;
    letter-spacing: 2px;
  }

  .hero-banner__title-accent {
    font-size: 1.8rem;
    letter-spacing: 3px;
  }

  .mvp-card__avatar {
    width: 90px;
    height: 90px;
  }
}
</style>
