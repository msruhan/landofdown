<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { statisticsApi } from '@/services/api'
import type { PlayerStats } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend)

const props = defineProps<{
  playerId: number
}>()

const stats = ref<PlayerStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function loadPlayerStats(id: number) {
  loading.value = true
  error.value = null

  try {
    const res = await statisticsApi.getPlayerStats(id)
    stats.value = res.data
  } catch {
    stats.value = null
    error.value = 'Failed to load player data'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.playerId,
  (id) => {
    if (!id || Number.isNaN(id)) {
      stats.value = null
      loading.value = false
      error.value = 'Invalid player ID'
      return
    }
    loadPlayerStats(id)
  },
  { immediate: true }
)

const kdaRatio = computed(() => {
  if (!stats.value) return '0.00'
  const d = Math.max(stats.value.avg_kda.deaths, 1)
  return ((stats.value.avg_kda.kills + stats.value.avg_kda.assists) / d).toFixed(2)
})

const winRateDonut = computed(() => {
  if (!stats.value) return null
  const wr = stats.value.win_rate
  return {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [wr, 100 - wr],
      backgroundColor: ['#00ff87', 'rgba(255,255,255,0.06)'],
      borderWidth: 0,
      cutout: '78%',
    }],
  }
})

const mvpRateDonut = computed(() => {
  if (!stats.value) return null
  const rate = stats.value.mvp_rate
  return {
    labels: ['MVP', 'Other'],
    datasets: [{
      data: [rate, 100 - rate],
      backgroundColor: ['#ffd700', 'rgba(255,255,255,0.06)'],
      borderWidth: 0,
      cutout: '78%',
    }],
  }
})

const donutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
}

function trendData() {
  if (!stats.value?.recent_performance?.length) return null
  const perf = stats.value.recent_performance.slice(-10)
  return {
    labels: perf.map(t => t.match_date.slice(5)),
    datasets: [{
      data: perf.map(t => t.rating),
      borderColor: '#00ff87',
      backgroundColor: 'rgba(0,255,135,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: perf.map(t => t.result === 'win' ? '#00ff87' : '#ef4444'),
      borderWidth: 2,
    }],
  }
}

const trendOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111a15', titleColor: '#e4e4e7', bodyColor: '#a1a1aa', borderColor: '#1e3a2a', borderWidth: 1, padding: 8, cornerRadius: 8 } },
  scales: {
    x: { ticks: { color: '#52525b', font: { family: 'Rajdhani', size: 11 } }, grid: { display: false } },
    y: { ticks: { color: '#52525b', font: { family: 'Rajdhani', size: 11 } }, grid: { color: 'rgba(30,58,42,0.2)' } },
  },
}

const roleColors: Record<string, string> = {
  gold: '#ffd700', mid: '#06b6d4', exp: '#f59e0b', jungle: '#ef4444', roam: '#10b981',
}
</script>

<template>
  <div class="player-page">
    <LoadingSpinner v-if="loading" size="lg" text="Loading player data..." />

    <div v-else-if="error" class="card text-center" style="padding: 48px;">
      <p class="text-red">{{ error }}</p>
    </div>

    <template v-else-if="stats">
      <div class="profile-card">
        <div class="profile-card__bg"></div>
        <div class="profile-card__content">
          <div class="profile-card__left">
            <div class="profile-card__avatar-wrap">
              <img
                :src="stats.player.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${stats.player.username}`"
                :alt="stats.player.username"
                class="profile-card__avatar"
              />
              <div class="profile-card__avatar-ring"></div>
            </div>
            <div class="profile-card__info">
              <h1 class="profile-card__name">{{ stats.player.username }}</h1>
              <div class="profile-card__tags">
                <span v-if="stats.current_streak.type" class="streak-tag" :class="stats.current_streak.type">
                  {{ stats.current_streak.type === 'win' ? '🔥' : '❄️' }}
                  {{ stats.current_streak.count }} {{ stats.current_streak.type }} streak
                </span>
                <span class="date-tag" v-if="stats.first_match_date">Since {{ stats.first_match_date.slice(0, 10) }}</span>
              </div>
            </div>
          </div>

          <div class="profile-card__stats">
            <div class="key-stat">
              <span class="key-stat__value">{{ stats.total_wins }}</span>
              <span class="key-stat__label">Wins</span>
            </div>
            <div class="key-stat">
              <span class="key-stat__value key-stat__value--red">{{ stats.total_losses }}</span>
              <span class="key-stat__label">Losses</span>
            </div>
            <div class="key-stat">
              <span class="key-stat__value">{{ stats.total_kda.kills }}</span>
              <span class="key-stat__label">Kills</span>
            </div>
            <div class="key-stat">
              <span class="key-stat__value key-stat__value--red">{{ stats.total_kda.deaths }}</span>
              <span class="key-stat__label">Deaths</span>
            </div>
            <div class="key-stat">
              <span class="key-stat__value">{{ stats.total_kda.assists }}</span>
              <span class="key-stat__label">Assists</span>
            </div>
            <div class="key-stat">
              <span class="key-stat__value key-stat__value--gold">{{ stats.medals.mvp }}</span>
              <span class="key-stat__label">MVPs</span>
            </div>
          </div>
        </div>
      </div>

      <div class="highlight-row">
        <div class="highlight-card">
          <span class="highlight-card__label">Win Rate</span>
          <div class="highlight-card__donut-wrap">
            <Doughnut v-if="winRateDonut" :data="winRateDonut" :options="donutOpts" />
            <span class="highlight-card__donut-value" style="color: #00ff87;">{{ stats.win_rate.toFixed(1) }}%</span>
          </div>
        </div>
        <div class="highlight-card">
          <span class="highlight-card__label">KDA Ratio</span>
          <div class="highlight-card__big-value">{{ kdaRatio }}</div>
          <div class="highlight-card__kda-detail">
            <span class="kda-k">{{ stats.avg_kda.kills.toFixed(1) }}</span>
            <span class="kda-sep">/</span>
            <span class="kda-d">{{ stats.avg_kda.deaths.toFixed(1) }}</span>
            <span class="kda-sep">/</span>
            <span class="kda-a">{{ stats.avg_kda.assists.toFixed(1) }}</span>
          </div>
        </div>
        <div class="highlight-card">
          <span class="highlight-card__label">MVP Rate</span>
          <div class="highlight-card__donut-wrap">
            <Doughnut v-if="mvpRateDonut" :data="mvpRateDonut" :options="donutOpts" />
            <span class="highlight-card__donut-value" style="color: #ffd700;">{{ stats.mvp_rate.toFixed(0) }}%</span>
          </div>
        </div>
        <div class="highlight-card">
          <span class="highlight-card__label">Avg Rating</span>
          <div class="highlight-card__big-value highlight-card__big-value--cyan">{{ (stats.avg_rating ?? 0).toFixed(1) }}</div>
          <span class="highlight-card__sub">per match</span>
        </div>
        <div class="highlight-card">
          <span class="highlight-card__label">Total Matches</span>
          <div class="highlight-card__big-value">{{ stats.total_matches }}</div>
          <span class="highlight-card__sub">games played</span>
        </div>
      </div>

      <div class="player-two-col">
        <div class="player-two-col__left">
          <div class="panel">
            <h3 class="panel__title">
              <span class="panel__icon">🏅</span>
              Medals
            </h3>
            <div class="medals-grid">
              <div class="medal-box medal-box--mvp">
                <span class="medal-box__icon">🏆</span>
                <span class="medal-box__count">{{ stats.medals.mvp }}</span>
                <span class="medal-box__label">MVP</span>
              </div>
              <div class="medal-box medal-box--gold">
                <span class="medal-box__icon">🥇</span>
                <span class="medal-box__count">{{ stats.medals.gold }}</span>
                <span class="medal-box__label">Gold</span>
              </div>
              <div class="medal-box medal-box--silver">
                <span class="medal-box__icon">🥈</span>
                <span class="medal-box__count">{{ stats.medals.silver }}</span>
                <span class="medal-box__label">Silver</span>
              </div>
              <div class="medal-box medal-box--bronze">
                <span class="medal-box__icon">🥉</span>
                <span class="medal-box__count">{{ stats.medals.bronze }}</span>
                <span class="medal-box__label">Bronze</span>
              </div>
            </div>
          </div>

          <div class="panel" v-if="stats.roles_played?.length">
            <h3 class="panel__title">
              <span class="panel__icon">🎭</span>
              Role Distribution
            </h3>
            <div class="role-bars">
              <div v-for="rp in stats.roles_played" :key="rp.role.id" class="role-bar-item">
                <div class="role-bar-item__header">
                  <span class="role-bar-item__name" :style="{ color: roleColors[rp.role.name] || '#00ff87' }">{{ rp.role.name }}</span>
                  <span class="role-bar-item__count">{{ rp.times_played }} games</span>
                </div>
                <div class="role-bar">
                  <div
                    class="role-bar__fill"
                    :style="{
                      width: `${(rp.times_played / stats.total_matches) * 100}%`,
                      background: roleColors[rp.role.name] || '#00ff87',
                    }"
                  ></div>
                </div>
                <span class="role-bar-item__wr">{{ rp.win_rate.toFixed(0) }}% WR</span>
              </div>
            </div>
          </div>

          <div class="panel" v-if="stats.heroes_used?.length">
            <h3 class="panel__title">
              <span class="panel__icon">⚔</span>
              Most Played
            </h3>
            <div class="hero-list">
              <div v-for="hu in stats.heroes_used.slice(0, 5)" :key="hu.hero.id" class="hero-row">
                <div class="hero-row__info">
                  <span class="hero-row__name">{{ hu.hero.name }}</span>
                  <span class="hero-row__games">{{ hu.times_played }} games</span>
                </div>
                <div class="hero-row__stats">
                  <div class="hero-row__stat">
                    <span class="hero-row__stat-label">WIN %</span>
                    <span class="hero-row__stat-value" :class="hu.win_rate >= 50 ? 'text-green' : 'text-red'">{{ hu.win_rate.toFixed(0) }}%</span>
                  </div>
                  <div class="hero-row__stat">
                    <span class="hero-row__stat-label">AVG RATING</span>
                    <span class="hero-row__stat-value">{{ hu.avg_rating.toFixed(1) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel" v-if="trendData()">
            <h3 class="panel__title">
              <span class="panel__icon">📈</span>
              Performance Trend
            </h3>
            <div class="trend-chart">
              <Line :data="trendData()!" :options="trendOpts" />
            </div>
          </div>
        </div>

        <div class="player-two-col__right">
          <div class="panel">
            <h3 class="panel__title">
              <span class="panel__icon">🎮</span>
              Recent Matches
            </h3>
            <div class="match-list" v-if="stats.recent_performance?.length">
              <div
                v-for="(m, i) in stats.recent_performance"
                :key="m.match_id"
                class="match-row"
                :class="m.result"
                :style="{ animationDelay: `${i * 0.05}s` }"
              >
                <div class="match-row__indicator" :class="m.result"></div>
                <div class="match-row__left">
                  <div class="match-row__hero-line">
                    <span class="match-row__hero-name">{{ m.hero }}</span>
                    <span class="match-row__role">{{ m.role }}</span>
                  </div>
                  <div class="match-row__stats-line">
                    <span class="match-row__result" :class="m.result === 'win' ? 'text-green' : 'text-red'">
                      {{ m.result === 'win' ? 'WIN' : 'LOSS' }}
                    </span>
                    <span class="match-row__kda">
                      <span class="kda-k">{{ m.kills }}</span><span class="kda-sep">/</span><span class="kda-d">{{ m.deaths }}</span><span class="kda-sep">/</span><span class="kda-a">{{ m.assists }}</span>
                    </span>
                    <span class="match-row__rating">{{ Number(m.rating).toFixed(1) }}</span>
                  </div>
                </div>
                <div class="match-row__right">
                  <span class="match-row__date">{{ m.match_date }}</span>
                  <span v-if="m.medal" class="match-row__medal">
                    {{ m.medal === 'mvp_win' ? '🏆' : m.medal === 'mvp_lose' ? '✦' : m.medal === 'gold' ? '🥇' : m.medal === 'silver' ? '🥈' : '🥉' }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-muted text-center" style="padding: 32px;">No recent matches</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* copied from PlayerDetailPage for visual parity */
.player-page { animation: fade-in 0.4s ease; }
.profile-card { position: relative; border-radius: var(--radius-xl); overflow: hidden; margin-bottom: 24px; padding: 32px; background: linear-gradient(160deg, rgba(0, 255, 135, 0.04) 0%, #0a0a0a 50%, rgba(6, 182, 212, 0.03) 100%); border: 1px solid var(--border-color); }
.profile-card__bg { position: absolute; inset: 0; background: radial-gradient(circle at 1px 1px, rgba(0, 255, 135, 0.05) 1px, transparent 0); background-size: 40px 40px; }
.profile-card__content { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
.profile-card__left { display: flex; align-items: center; gap: 20px; }
.profile-card__avatar-wrap { position: relative; flex-shrink: 0; }
.profile-card__avatar { width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--green-neon); background: var(--green-muted); padding: 2px; }
.profile-card__avatar-ring { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(0, 255, 135, 0.15); animation: ring-pulse 3s ease-in-out infinite; }
@keyframes ring-pulse { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.06); opacity: 1; } }
.profile-card__name { font-size: 1.8rem; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px; color: var(--text-white); }
.profile-card__tags { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.streak-tag { font-family: var(--font-heading); font-size: 0.75rem; font-weight: 700; padding: 4px 12px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.5px; }
.streak-tag.win { background: rgba(0,255,135,0.1); color: var(--green-neon); border: 1px solid rgba(0,255,135,0.2); }
.streak-tag.lose { background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
.date-tag { font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-heading); letter-spacing: 0.5px; }
.profile-card__stats { display: flex; gap: 4px; }
.key-stat { display: flex; flex-direction: column; align-items: center; padding: 10px 20px; min-width: 70px; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.04); }
.key-stat__value { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700; color: var(--text-white); line-height: 1.2; }
.key-stat__value--red { color: var(--danger); }
.key-stat__value--gold { color: var(--gold); }
.key-stat__label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.8px; margin-top: 2px; font-family: var(--font-heading); }
.highlight-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
.highlight-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; transition: all 0.3s ease; position: relative; overflow: hidden; }
.highlight-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--green-neon), transparent); opacity: 0.3; }
.highlight-card:hover { border-color: rgba(0, 255, 135, 0.2); box-shadow: 0 0 25px rgba(0, 255, 135, 0.06); transform: translateY(-2px); }
.highlight-card__label { font-family: var(--font-heading); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 12px; }
.highlight-card__donut-wrap { position: relative; width: 90px; height: 90px; }
.highlight-card__donut-value { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; }
.highlight-card__big-value { font-family: var(--font-heading); font-size: 2.4rem; font-weight: 700; color: var(--text-white); line-height: 1.1; margin: 8px 0 4px; }
.highlight-card__big-value--cyan { color: var(--cyan); }
.highlight-card__sub { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.highlight-card__kda-detail { display: flex; gap: 4px; font-family: var(--font-heading); font-size: 0.9rem; font-weight: 600; margin-top: 6px; }
.kda-k { color: var(--green-neon); } .kda-d { color: var(--danger); } .kda-a { color: var(--cyan); } .kda-sep { color: var(--text-muted); font-weight: 400; }
.player-two-col { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
.panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 20px; transition: border-color 0.3s ease; }
.panel:hover { border-color: rgba(0, 255, 135, 0.15); }
.panel__title { font-family: var(--font-heading); font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
.panel__icon { font-size: 1rem; }
.medals-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.medal-box { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px; border-radius: var(--radius-md); background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); transition: all 0.3s ease; }
.medal-box:hover { background: rgba(255,255,255,0.04); }
.medal-box__icon { font-size: 1.3rem; }
.medal-box__count { font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700; color: var(--text-white); }
.medal-box__label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.8px; }
.role-bars { display: flex; flex-direction: column; gap: 14px; }
.role-bar-item__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.role-bar-item__name { font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.role-bar-item__count { font-size: 0.75rem; color: var(--text-muted); }
.role-bar { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-bottom: 3px; }
.role-bar__fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
.role-bar-item__wr { font-size: 0.7rem; color: var(--text-secondary); font-family: var(--font-heading); letter-spacing: 0.5px; }
.hero-list { display: flex; flex-direction: column; gap: 10px; }
.hero-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: var(--radius-md); background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); transition: all 0.3s ease; }
.hero-row:hover { background: rgba(0, 255, 135, 0.04); border-color: rgba(0, 255, 135, 0.1); }
.hero-row__name { font-family: var(--font-heading); font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
.hero-row__games { font-size: 0.7rem; color: var(--text-muted); display: block; margin-top: 2px; }
.hero-row__stats { display: flex; gap: 20px; }
.hero-row__stat { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.hero-row__stat-label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
.hero-row__stat-value { font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; color: var(--text-white); }
.trend-chart { height: 200px; }
.match-list { display: flex; flex-direction: column; gap: 8px; }
.match-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-md); background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.03); transition: all 0.3s ease; animation: slide-up 0.4s ease both; }
.match-row:hover { background: rgba(255,255,255,0.035); border-color: rgba(255,255,255,0.08); }
.match-row__indicator { width: 3px; height: 32px; border-radius: 2px; flex-shrink: 0; }
.match-row__indicator.win { background: var(--green-neon); box-shadow: 0 0 8px rgba(0,255,135,0.3); }
.match-row__indicator.lose { background: var(--danger); box-shadow: 0 0 8px rgba(239,68,68,0.3); }
.match-row__left { flex: 1; min-width: 0; }
.match-row__hero-line { display: flex; align-items: baseline; gap: 6px; margin-bottom: 3px; }
.match-row__hero-name { font-family: var(--font-heading); font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
.match-row__role { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
.match-row__stats-line { display: flex; align-items: center; gap: 12px; }
.match-row__result { font-family: var(--font-heading); font-size: 0.75rem; font-weight: 700; min-width: 36px; }
.match-row__kda { font-family: var(--font-heading); font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
.match-row__rating { font-family: var(--font-heading); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
.match-row__right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.match-row__date { font-size: 0.6rem; color: var(--text-muted); font-family: var(--font-heading); letter-spacing: 0.5px; white-space: nowrap; }
.match-row__medal { font-size: 0.85rem; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 900px) { .highlight-row { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) {
  .player-two-col { grid-template-columns: 1fr; }
  .profile-card__content { flex-direction: column; align-items: flex-start; }
  .profile-card__stats { flex-wrap: wrap; width: 100%; }
  .key-stat { min-width: 60px; padding: 8px 12px; }
  .highlight-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .highlight-row { grid-template-columns: 1fr 1fr; }
  .medals-grid { grid-template-columns: repeat(2, 1fr); }
  .profile-card__left { flex-direction: column; align-items: flex-start; }
}
</style>
