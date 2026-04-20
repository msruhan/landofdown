<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { statisticsApi } from '@/services/api'
import type { DashboardStats } from '@/types'
import { getAvatarUrl, handleAvatarError } from '@/utils/avatar'
import StatCard from '@/components/StatCard.vue'
import LeaderboardCard from '@/components/LeaderboardCard.vue'
import MatchResultCard from '@/components/MatchResultCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

ChartJS.register(BarElement, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend)

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const response = await statisticsApi.getDashboard()
    stats.value = response.data
  } catch {
    error.value = 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
})

const featuredMvp = computed(() => stats.value?.top_mvps?.[0] ?? null)

const totalKillsEstimate = computed(() => {
  if (!stats.value) return 0
  const avgKills = stats.value.top_mvps?.length
    ? stats.value.top_mvps.reduce((s, p) => s + p.avg_kills, 0) / stats.value.top_mvps.length
    : 5
  return Math.round(avgKills * stats.value.total_matches * 5)
})

function getTrendChartData() {
  if (!stats.value?.win_trend?.length) return null
  return {
    labels: stats.value.win_trend.map((t) => t.label),
    datasets: [
      {
        label: 'Result',
        data: stats.value.win_trend.map((t) => t.value),
        borderColor: '#00ff87',
        backgroundColor: 'rgba(0, 255, 135, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: stats.value.win_trend.map((t) =>
          t.result === 'win' ? '#00ff87' : '#ef4444',
        ),
        borderWidth: 2,
      },
    ],
  }
}

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
            <span class="hero-btn__icon">🏆</span>
            View Rankings
          </router-link>
          <router-link to="/statistics" class="hero-btn hero-btn--secondary">
            <span class="hero-btn__icon">📊</span>
            View Statistics
          </router-link>
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
          <StatCard title="Total Matches" :value="stats.total_matches" icon="⚔" color="#00ff87" />
          <StatCard title="Total Players" :value="stats.total_players" icon="👥" color="#06b6d4" />
          <StatCard title="Heroes Used" :value="stats.total_heroes" icon="🦸" color="#f59e0b" />
          <StatCard title="Total MVPs" :value="stats.total_mvps" icon="🏆" color="#ffd700" />
          <StatCard title="Global Win Rate" :value="stats.global_win_rate.toFixed(1) + '%'" icon="📈" color="#10b981" />
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
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">🎮 {{ stats.total_matches }} matches played</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">🏆 {{ stats.total_mvps }} MVPs awarded</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">👥 {{ stats.total_players }} players competing</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">📈 {{ stats.global_win_rate.toFixed(1) }}% global win rate</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">🦸 {{ stats.total_heroes }} heroes in the pool</span>
              <span class="live-banner__divider">◆</span>
              <!-- duplicate for seamless loop -->
              <span class="live-banner__item">⚔ {{ totalKillsEstimate.toLocaleString() }} total kills recorded</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">🎮 {{ stats.total_matches }} matches played</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">🏆 {{ stats.total_mvps }} MVPs awarded</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">👥 {{ stats.total_players }} players competing</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">📈 {{ stats.global_win_rate.toFixed(1) }}% global win rate</span>
              <span class="live-banner__divider">◆</span>
              <span class="live-banner__item">🦸 {{ stats.total_heroes }} heroes in the pool</span>
              <span class="live-banner__divider">◆</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ========== SECTION 6: WIN TREND CHART ========== -->
      <section v-if="getTrendChartData()" class="section">
        <h2 class="section-title">Win Trend</h2>
        <div class="chart-panel">
          <div class="chart-panel__inner">
            <Line :data="getTrendChartData()!" :options="chartOptions" />
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
              <span class="cta-card__icon">📊</span>
            </div>
            <h3 class="cta-card__title">Player Statistics</h3>
            <p class="cta-card__desc">Dive deep into individual player performance, KDA ratios, hero preferences and match history.</p>
            <span class="cta-card__link">Explore Stats →</span>
          </router-link>

          <router-link to="/ranking" class="cta-card">
            <div class="cta-card__icon-wrap">
              <span class="cta-card__icon">🏆</span>
            </div>
            <h3 class="cta-card__title">Leaderboard</h3>
            <p class="cta-card__desc">See who dominates the rankings. Compare win rates, MVP counts, and overall ratings.</p>
            <span class="cta-card__link">View Rankings →</span>
          </router-link>

          <router-link to="/statistics" class="cta-card">
            <div class="cta-card__icon-wrap">
              <span class="cta-card__icon">⚔</span>
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
  font-size: 1.1rem;
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
  font-size: 1.6rem;
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
