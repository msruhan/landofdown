<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { headToHeadApi, playersApi } from '@/services/api'
import type { HeadToHeadPlayers, HeadToHeadRivalry, Player } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getAvatarUrl, handleAvatarError } from '@/utils/avatar'

const players = ref<Player[]>([])
const playerAId = ref<number | undefined>(undefined)
const playerBId = ref<number | undefined>(undefined)
const data = ref<HeadToHeadPlayers | null>(null)
const loading = ref(false)
const errorMsg = ref<string | null>(null)

async function loadPlayers() {
  const response = await playersApi.getPlayers({ per_page: 200 })
  const raw = response.data as unknown as { data?: Player[] }
  players.value = Array.isArray(raw.data) ? raw.data : []
}

async function compare() {
  if (!playerAId.value || !playerBId.value || playerAId.value === playerBId.value) {
    errorMsg.value = 'Pilih dua player berbeda'
    return
  }
  errorMsg.value = null
  loading.value = true
  try {
    const response = await headToHeadApi.players(playerAId.value, playerBId.value)
    data.value = response.data
  } catch {
    errorMsg.value = 'Gagal memuat data head-to-head'
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadPlayers)

const summary = computed(() => data.value?.summary)
const h2hMatches = computed(() => data.value?.head_to_head ?? [])
const rivalry = computed<HeadToHeadRivalry | null>(() => data.value?.rivalry ?? null)
const favHeroesA = computed(() => data.value?.favorite_heroes.a ?? [])
const favHeroesB = computed(() => data.value?.favorite_heroes.b ?? [])
const favH2hA = computed(() => data.value?.favorite_heroes_h2h?.a ?? [])
const favH2hB = computed(() => data.value?.favorite_heroes_h2h?.b ?? [])

const dominancePctB = computed(() => {
  const r = rivalry.value
  if (!r || r.games === 0) return 50
  return Math.round((100 - r.dominance_pct_a) * 10) / 10
})

function leaderSideClass(side: 'a' | 'b'): Record<string, boolean> {
  const L = rivalry.value?.leader
  return {
    'h2h-panel--lead': L === side,
    'h2h-panel--trail': L !== side && L !== 'tie' && (L === 'a' || L === 'b'),
    'h2h-panel--tie': L === 'tie',
  }
}

function metricWinner(
  key: 'avg_rating' | 'kda_ratio' | 'avg_kills' | 'avg_assists',
  higherIsBetter: boolean,
): 'a' | 'b' | 'tie' {
  const r = rivalry.value
  const pa = r?.player_a
  const pb = r?.player_b
  if (!pa || !pb) return 'tie'
  const va = pa[key] ?? 0
  const vb = pb[key] ?? 0
  if (va === vb) return 'tie'
  const aBetter = higherIsBetter ? va > vb : va < vb
  if (Math.abs(va - vb) < (key === 'avg_rating' ? 0.05 : 0.01)) return 'tie'
  return aBetter ? 'a' : 'b'
}

function winnerName(match: { a: { result: string }; b: { result: string } }): string {
  if (!data.value) return ''
  return match.a.result === 'win' ? data.value.player_a.username : data.value.player_b.username
}
</script>

<template>
  <div class="h2h-page">
    <div class="page-header">
      <h1 class="page-title">Head <span class="gradient-text">to Head</span></h1>
      <p class="page-subtitle">
        Winrate duel langsung, performa rating &amp; KDA saat bertemu, hero andalan di duel, dan riwayat match.
      </p>
    </div>

    <div class="h2h-form card">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Player A</label>
          <select v-model="playerAId" class="form-select">
            <option :value="undefined" disabled>Pilih Player A</option>
            <option v-for="p in players" :key="p.id" :value="p.id">{{ p.username }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Player B</label>
          <select v-model="playerBId" class="form-select">
            <option :value="undefined" disabled>Pilih Player B</option>
            <option v-for="p in players" :key="p.id" :value="p.id">{{ p.username }}</option>
          </select>
        </div>
        <button class="btn btn-primary btn-compare" :disabled="loading" @click="compare">
          {{ loading ? 'Memuat...' : 'Bandingkan' }}
        </button>
      </div>
      <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="data" class="h2h-results">
      <!-- Verdict banner -->
      <div v-if="rivalry && rivalry.games > 0" class="h2h-verdict">
        <span class="h2h-verdict__crown" aria-hidden="true">👑</span>
        <div class="h2h-verdict__text">
          <span class="h2h-verdict__label">Rivalitas H2H</span>
          <p class="h2h-verdict__title">{{ rivalry.leader_label }}</p>
          <p v-if="rivalry.streak && rivalry.streak.count >= 1" class="h2h-verdict__streak">
            Form terkini: <strong>{{ rivalry.streak.label }}</strong> menang {{ rivalry.streak.count }} duel beruntun
          </p>
        </div>
      </div>
      <div v-else-if="rivalry && rivalry.games === 0" class="h2h-verdict h2h-verdict--empty">
        <p>Belum pernah bertemu sebagai lawan di match yang tercatat. Pilih pasangan lain atau input match dulu.</p>
      </div>

      <!-- Main duel board -->
      <div class="h2h-duel card-elevated">
        <div class="h2h-duel__player h2h-panel" :class="leaderSideClass('a')">
          <div class="h2h-duel__avatar-wrap">
            <img
              :src="getAvatarUrl(data.player_a.username, data.player_a.avatar_url)"
              :alt="data.player_a.username"
              class="h2h-duel__avatar"
              @error="(e) => handleAvatarError(e, data?.player_a.username ?? '')"
            >
            <span v-if="rivalry?.leader === 'a'" class="h2h-duel__badge">Unggul</span>
          </div>
          <h2 class="h2h-duel__name">{{ data.player_a.username }}</h2>
          <p class="h2h-duel__meta">{{ data.player_a.total_matches }} match · {{ data.player_a.overall_win_rate }}% WR (semua)</p>
          <div class="h2h-duel__form">
            <span
              v-for="(r, idx) in data.player_a.recent_form"
              :key="`a-${idx}`"
              class="form-pill"
              :class="r === 'W' ? 'form-pill--win' : 'form-pill--lose'"
            >{{ r }}</span>
          </div>
        </div>

        <div class="h2h-duel__center">
          <div class="h2h-duel__scoreboard">
            <span class="h2h-duel__num">{{ summary?.player_a_wins_vs_b ?? 0 }}</span>
            <span class="h2h-duel__colon">:</span>
            <span class="h2h-duel__num">{{ summary?.player_b_wins_vs_a ?? 0 }}</span>
          </div>
          <p class="h2h-duel__hint">Menang saat lawan langsung</p>
          <div v-if="rivalry && rivalry.games > 0" class="h2h-share">
            <div
              class="h2h-share__track"
              :style="{ '--split-a': `${rivalry.dominance_pct_a}%` }"
            >
              <div class="h2h-share__fill h2h-share__fill--a" />
              <div class="h2h-share__fill h2h-share__fill--b" />
            </div>
            <div class="h2h-share__labels">
              <span>{{ data.player_a.username }} {{ rivalry.dominance_pct_a }}%</span>
              <span>{{ data.player_b.username }} {{ dominancePctB }}%</span>
            </div>
          </div>
          <p class="h2h-duel__sub">{{ summary?.as_opponents ?? 0 }} match duel · {{ summary?.as_teammates ?? 0 }}× satu tim</p>
        </div>

        <div class="h2h-duel__player h2h-panel" :class="leaderSideClass('b')">
          <div class="h2h-duel__avatar-wrap">
            <img
              :src="getAvatarUrl(data.player_b.username, data.player_b.avatar_url)"
              :alt="data.player_b.username"
              class="h2h-duel__avatar"
              @error="(e) => handleAvatarError(e, data?.player_b.username ?? '')"
            >
            <span v-if="rivalry?.leader === 'b'" class="h2h-duel__badge h2h-duel__badge--b">Unggul</span>
          </div>
          <h2 class="h2h-duel__name">{{ data.player_b.username }}</h2>
          <p class="h2h-duel__meta">{{ data.player_b.total_matches }} match · {{ data.player_b.overall_win_rate }}% WR (semua)</p>
          <div class="h2h-duel__form">
            <span
              v-for="(r, idx) in data.player_b.recent_form"
              :key="`b-${idx}`"
              class="form-pill"
              :class="r === 'W' ? 'form-pill--win' : 'form-pill--lose'"
            >{{ r }}</span>
          </div>
        </div>
      </div>

      <!-- H2H metrics -->
      <div v-if="rivalry?.player_a && rivalry?.player_b" class="h2h-metrics card">
        <h3 class="h2h-section-title">Performa saat duel (rata-rata per match)</h3>
        <div class="h2h-metrics__grid">
          <div class="h2h-metrics__head">
            <span></span>
            <span>{{ data.player_a.username }}</span>
            <span>{{ data.player_b.username }}</span>
          </div>
          <div class="h2h-metrics__row">
            <span class="h2h-metrics__k">Rating</span>
            <span :class="{ 'h2h-metrics__win': metricWinner('avg_rating', true) === 'a' }">{{ rivalry.player_a.avg_rating ?? '—' }}</span>
            <span :class="{ 'h2h-metrics__win': metricWinner('avg_rating', true) === 'b' }">{{ rivalry.player_b.avg_rating ?? '—' }}</span>
          </div>
          <div class="h2h-metrics__row">
            <span class="h2h-metrics__k">Avg K / D / A</span>
            <span>{{ rivalry.player_a.avg_kills }} / {{ rivalry.player_a.avg_deaths }} / {{ rivalry.player_a.avg_assists }}</span>
            <span>{{ rivalry.player_b.avg_kills }} / {{ rivalry.player_b.avg_deaths }} / {{ rivalry.player_b.avg_assists }}</span>
          </div>
          <div class="h2h-metrics__row">
            <span class="h2h-metrics__k">(K+A)/D</span>
            <span :class="{ 'h2h-metrics__win': metricWinner('kda_ratio', true) === 'a' }">{{ rivalry.player_a.kda_ratio }}</span>
            <span :class="{ 'h2h-metrics__win': metricWinner('kda_ratio', true) === 'b' }">{{ rivalry.player_b.kda_ratio }}</span>
          </div>
          <div class="h2h-metrics__row">
            <span class="h2h-metrics__k">Win rate duel</span>
            <span :class="{ 'h2h-metrics__win': rivalry.player_a.win_rate > rivalry.player_b.win_rate }">{{ rivalry.player_a.win_rate }}%</span>
            <span :class="{ 'h2h-metrics__win': rivalry.player_b.win_rate > rivalry.player_a.win_rate }">{{ rivalry.player_b.win_rate }}%</span>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="card">
          <h3 class="stat-title">Hero andalan · {{ data.player_a.username }}</h3>
          <p class="stat-desc">Semua match tercatat</p>
          <ul v-if="favHeroesA.length" class="hero-list">
            <li v-for="(h, idx) in favHeroesA" :key="`ha-${idx}`">
              <span>{{ h.hero }}</span>
              <span>{{ h.matches }}× · {{ h.win_rate }}%</span>
            </li>
          </ul>
          <div v-else class="empty">Belum ada data.</div>
        </div>

        <div class="card">
          <h3 class="stat-title">Hero andalan · {{ data.player_b.username }}</h3>
          <p class="stat-desc">Semua match tercatat</p>
          <ul v-if="favHeroesB.length" class="hero-list">
            <li v-for="(h, idx) in favHeroesB" :key="`hb-${idx}`">
              <span>{{ h.hero }}</span>
              <span>{{ h.matches }}× · {{ h.win_rate }}%</span>
            </li>
          </ul>
          <div v-else class="empty">Belum ada data.</div>
        </div>

        <div v-if="favH2hA.length || favH2hB.length" class="card card--span">
          <h3 class="stat-title">Hero saat duel H2H saja</h3>
          <p class="stat-desc">Hanya match di mana mereka berada di tim berbeda</p>
          <div class="hero-h2h-split">
            <ul v-if="favH2hA.length" class="hero-list">
              <li v-for="(h, idx) in favH2hA" :key="`h2ha-${idx}`">
                <span>{{ h.hero }}</span>
                <span>{{ h.matches }}× · {{ h.win_rate }}%</span>
              </li>
            </ul>
            <div v-else class="empty muted">—</div>
            <ul v-if="favH2hB.length" class="hero-list">
              <li v-for="(h, idx) in favH2hB" :key="`h2hb-${idx}`">
                <span>{{ h.hero }}</span>
                <span>{{ h.matches }}× · {{ h.win_rate }}%</span>
              </li>
            </ul>
            <div v-else class="empty muted">—</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="stat-title">Riwayat lawan langsung</h3>
        <div v-if="!h2hMatches.length" class="empty">Belum pernah bertemu di tim berbeda.</div>
        <div v-else class="match-table">
          <div class="match-row match-row--head">
            <span>Tanggal</span>
            <span>{{ data.player_a.username }}</span>
            <span>Rating</span>
            <span>Hasil</span>
            <span>{{ data.player_b.username }}</span>
          </div>
          <div v-for="match in h2hMatches" :key="match.match_id" class="match-row">
            <span class="match-date">{{ match.match_date }}</span>
            <span>
              <strong>{{ match.a.hero }}</strong>
              <span class="muted"> · {{ match.a.kda }}</span>
            </span>
            <span class="match-rating">
              <span class="rating-pair">{{ match.a.rating ?? '—' }}</span>
              <span class="rating-vs">vs</span>
              <span class="rating-pair">{{ match.b.rating ?? '—' }}</span>
            </span>
            <span class="result">
              <span
                class="badge"
                :class="match.a.result === 'win' ? 'badge-green' : 'badge-red'"
              >
                {{ winnerName(match) }} menang
              </span>
            </span>
            <span>
              <strong>{{ match.b.hero }}</strong>
              <span class="muted"> · {{ match.b.kda }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.h2h-form {
  margin-bottom: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 16px;
  align-items: end;
}

.form-error {
  color: #fca5a5;
  font-size: 0.88rem;
  margin-top: 10px;
}

.btn-compare {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Verdict */
.h2h-verdict {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 22px;
  margin-bottom: 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 215, 0, 0.35);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(0, 255, 135, 0.06));
  box-shadow: 0 0 40px -12px rgba(255, 215, 0, 0.25);
}

.h2h-verdict--empty {
  border-color: var(--border-color);
  background: rgba(13, 31, 23, 0.4);
  box-shadow: none;
  color: var(--text-secondary);
}

.h2h-verdict__crown {
  font-size: 1.75rem;
  line-height: 1;
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
}

.h2h-verdict__label {
  display: block;
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #fde68a;
  margin-bottom: 4px;
}

.h2h-verdict__title {
  font-family: var(--font-heading);
  font-size: 1.35rem;
  color: var(--text-white);
  margin: 0;
  letter-spacing: 0.03em;
  line-height: 1.3;
}

.h2h-verdict__streak {
  margin: 8px 0 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.h2h-verdict__streak strong {
  color: var(--green-neon);
}

/* Duel board */
.card-elevated {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.h2h-duel {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: stretch;
}

.h2h-panel {
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.h2h-panel--lead {
  border-color: rgba(0, 255, 135, 0.45);
  box-shadow:
    0 0 0 1px rgba(0, 255, 135, 0.15),
    0 12px 40px -16px rgba(0, 255, 135, 0.35);
}

.h2h-duel__player:first-child.h2h-panel--lead {
  border-color: rgba(6, 182, 212, 0.55);
  box-shadow:
    0 0 0 1px rgba(6, 182, 212, 0.2),
    0 12px 40px -16px rgba(6, 182, 212, 0.35);
}

.h2h-duel__player:last-child.h2h-panel--lead {
  border-color: rgba(248, 113, 113, 0.55);
  box-shadow:
    0 0 0 1px rgba(248, 113, 113, 0.2),
    0 12px 40px -16px rgba(239, 68, 68, 0.3);
}

.h2h-panel--trail {
  opacity: 0.88;
}

.h2h-duel__player {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.h2h-duel__avatar-wrap {
  position: relative;
  margin-bottom: 10px;
}

.h2h-duel__avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.12);
}

.h2h-duel__badge {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #06b6d4, #22d3ee);
  color: #041216;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
}

.h2h-duel__badge--b {
  background: linear-gradient(135deg, #ef4444, #f87171);
  color: #fff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

.h2h-duel__name {
  font-family: var(--font-heading);
  font-size: 1.35rem;
  color: var(--text-white);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 4px;
}

.h2h-duel__meta {
  color: var(--text-secondary);
  font-size: 0.82rem;
  margin: 0;
}

.h2h-duel__form {
  display: inline-flex;
  gap: 4px;
  margin-top: 10px;
}

.form-pill {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.78rem;
}

.form-pill--win {
  background: rgba(0, 255, 135, 0.15);
  color: var(--green-neon);
}

.form-pill--lose {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.h2h-duel__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 200px;
  padding: 8px 0;
}

.h2h-duel__scoreboard {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.h2h-duel__num {
  font-size: 3.2rem;
  font-family: var(--font-heading);
  line-height: 1;
  background: linear-gradient(180deg, #fff 0%, var(--green-neon) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.h2h-duel__colon {
  font-size: 2rem;
  color: var(--text-muted);
  font-weight: 300;
}

.h2h-duel__hint {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 8px 0 12px;
}

.h2h-duel__sub {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 10px 0 0;
  text-align: center;
}

.h2h-share {
  width: 100%;
  max-width: 220px;
}

.h2h-share__track {
  display: flex;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}

.h2h-share__fill {
  height: 100%;
  transition: flex-basis 0.5s ease;
}

.h2h-share__fill--a {
  flex: 0 0 var(--split-a, 50%);
  background: linear-gradient(90deg, #0891b2, #22d3ee);
  min-width: 4px;
}

.h2h-share__fill--b {
  flex: 1 1 auto;
  min-width: 4px;
  background: linear-gradient(90deg, #f87171, #ef4444);
}

.h2h-share__labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 4px;
  font-family: var(--font-heading);
}

/* Metrics */
.h2h-metrics {
  margin-bottom: 24px;
}

.h2h-section-title {
  font-family: var(--font-heading);
  color: var(--text-white);
  margin: 0 0 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 1rem;
}

.h2h-metrics__grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.h2h-metrics__head,
.h2h-metrics__row {
  display: grid;
  grid-template-columns: 140px 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  font-size: 0.88rem;
}

.h2h-metrics__head {
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
}

.h2h-metrics__row:nth-child(even) {
  background: rgba(13, 31, 23, 0.35);
  border-radius: var(--radius-md);
}

.h2h-metrics__k {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.h2h-metrics__win {
  color: var(--green-neon);
  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.card--span {
  grid-column: 1 / -1;
}

.stat-title {
  font-family: var(--font-heading);
  color: var(--text-white);
  margin-bottom: 4px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 1rem;
}

.stat-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.hero-h2h-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.hero-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
}

.hero-list li {
  display: flex;
  justify-content: space-between;
  background: rgba(13, 31, 23, 0.35);
  padding: 8px 12px;
  border-radius: var(--radius-md);
}

.match-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.match-row {
  display: grid;
  grid-template-columns: 100px 1fr 100px 130px 1fr;
  align-items: center;
  padding: 10px 12px;
  background: rgba(13, 31, 23, 0.35);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.match-row--head {
  background: transparent;
  color: var(--text-muted);
  text-transform: uppercase;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
}

.match-row .muted {
  color: var(--text-muted);
}

.match-row .result {
  text-align: center;
}

.match-date {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.match-rating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-heading);
  font-size: 0.9rem;
}

.rating-vs {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.rating-pair {
  min-width: 2ch;
  text-align: center;
}

.muted {
  color: var(--text-muted);
}

.empty {
  color: var(--text-muted);
  padding: 12px;
  font-size: 0.9rem;
}

@media (max-width: 960px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .h2h-duel {
    grid-template-columns: 1fr;
  }

  .h2h-duel__center {
    order: -1;
    padding: 16px 0;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .hero-h2h-split {
    grid-template-columns: 1fr;
  }

  .match-row,
  .match-row--head {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .match-row--head {
    display: none;
  }

  .h2h-metrics__head,
  .h2h-metrics__row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .h2h-metrics__head {
    display: none;
  }
}
</style>
