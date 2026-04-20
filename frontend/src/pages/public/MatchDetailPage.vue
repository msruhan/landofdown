<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { matchesApi } from '@/services/api'
import type { GameMatch, MatchPlayer } from '@/types'
import PlayerBadge from '@/components/PlayerBadge.vue'
import MedalBadge from '@/components/MedalBadge.vue'
import KDADisplay from '@/components/KDADisplay.vue'
import RoleBadge from '@/components/RoleBadge.vue'
import HeroChip from '@/components/HeroChip.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const match = ref<GameMatch | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const matchId = computed(() => Number(route.params.id))

const teamA = computed(() => match.value?.match_players?.filter(p => p.team === 'team_a') ?? [])
const teamB = computed(() => match.value?.match_players?.filter(p => p.team === 'team_b') ?? [])

function teamTotals(players: MatchPlayer[]) {
  return {
    kills: players.reduce((s, p) => s + p.kills, 0),
    deaths: players.reduce((s, p) => s + p.deaths, 0),
    assists: players.reduce((s, p) => s + p.assists, 0),
  }
}

const teamATotals = computed(() => teamTotals(teamA.value))
const teamBTotals = computed(() => teamTotals(teamB.value))
const winningTeam = computed(() => match.value?.winner ?? null)
const isTeamAWinner = computed(() => winningTeam.value === 'team_a')
function normalizeItem<T>(payload: T | { data?: T }): T {
  return (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>))
    ? ((payload as { data?: T }).data as T)
    : (payload as T)
}
const screenshotUrl = computed(() => {
  const path = match.value?.screenshot_path
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `http://localhost:8000/api/matches/${matchId.value}/screenshot`
})

const formattedDate = computed(() => {
  if (!match.value) return ''
  return new Date(match.value.match_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

onMounted(async () => {
  try {
    const res = await matchesApi.getMatch(matchId.value)
    match.value = normalizeItem<GameMatch>(res.data as GameMatch | { data?: GameMatch })
  } catch {
    error.value = 'Failed to load match data'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <LoadingSpinner v-if="loading" size="lg" text="Loading match..." />

    <div v-else-if="error" class="card text-center" style="padding: 48px;">
      <p class="text-red">{{ error }}</p>
      <router-link to="/" class="btn btn-secondary mt-md">Back to Dashboard</router-link>
    </div>

    <template v-else-if="match">
      <div class="result-banner" :class="{ 'result-banner--team-a': isTeamAWinner, 'result-banner--team-b': !isTeamAWinner }">
        <div class="result-banner__team" :class="{ 'result-banner__team--winner': isTeamAWinner }">
          <span class="result-banner__team-name">{{ match.team_a_name }}</span>
          <span class="result-banner__score">{{ teamATotals.kills }}</span>
        </div>
        <div class="result-banner__center">
          <span class="result-banner__status result-banner__status--win">
            <span class="result-banner__status-icon">👑</span>
            {{ isTeamAWinner ? 'VICTORY' : 'LOSE' }}
          </span>
          <span class="result-banner__vs">VS</span>
          <span class="result-banner__status result-banner__status--lose">
            {{ isTeamAWinner ? 'LOSE' : 'VICTORY' }}
            <span v-if="!isTeamAWinner" class="result-banner__status-icon">🏆</span>
          </span>
        </div>
        <div class="result-banner__team" :class="{ 'result-banner__team--winner': !isTeamAWinner }">
          <span class="result-banner__score">{{ teamBTotals.kills }}</span>
          <span class="result-banner__team-name">{{ match.team_b_name }}</span>
        </div>
      </div>

      <!-- Match Header -->
      <div class="match-header">
        <div class="match-header__date">{{ formattedDate }}</div>
        <div v-if="match.duration" class="match-header__duration">Duration: {{ match.duration }}</div>
      </div>

      <!-- Teams -->
      <div class="teams-grid">
        <!-- Team A -->
        <div class="team-col">
          <h3 class="team-col__title" :class="{ 'text-green': match.winner === 'team_a' }">{{ match.team_a_name }}</h3>
          <div v-for="player in teamA" :key="player.id" class="player-card card">
            <div class="player-card__top">
              <PlayerBadge :username="player.player?.username ?? 'Unknown'" :player-id="player.player_id" :linkable="true" />
              <MedalBadge :medal="player.medal" />
            </div>
            <div class="player-card__details">
              <div class="player-card__meta">
                <HeroChip :name="player.hero?.name ?? 'Unknown'" />
                <RoleBadge :role="player.role?.name ?? 'Unknown'" />
              </div>
              <div class="player-card__stats">
                <KDADisplay :kills="player.kills" :deaths="player.deaths" :assists="player.assists" />
                <span class="player-card__rating">⭐ {{ Number(player.rating).toFixed(1) }}</span>
              </div>
            </div>
          </div>
          <div class="team-totals card">
            <span class="text-muted">Team Totals:</span>
            <KDADisplay :kills="teamATotals.kills" :deaths="teamATotals.deaths" :assists="teamATotals.assists" size="lg" />
          </div>
        </div>

        <!-- Team B -->
        <div class="team-col">
          <h3 class="team-col__title" :class="{ 'text-green': match.winner === 'team_b' }">{{ match.team_b_name }}</h3>
          <div v-for="player in teamB" :key="player.id" class="player-card card">
            <div class="player-card__top">
              <PlayerBadge :username="player.player?.username ?? 'Unknown'" :player-id="player.player_id" :linkable="true" />
              <MedalBadge :medal="player.medal" />
            </div>
            <div class="player-card__details">
              <div class="player-card__meta">
                <HeroChip :name="player.hero?.name ?? 'Unknown'" />
                <RoleBadge :role="player.role?.name ?? 'Unknown'" />
              </div>
              <div class="player-card__stats">
                <KDADisplay :kills="player.kills" :deaths="player.deaths" :assists="player.assists" />
                <span class="player-card__rating">⭐ {{ Number(player.rating).toFixed(1) }}</span>
              </div>
            </div>
          </div>
          <div class="team-totals card">
            <span class="text-muted">Team Totals:</span>
            <KDADisplay :kills="teamBTotals.kills" :deaths="teamBTotals.deaths" :assists="teamBTotals.assists" size="lg" />
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="match.notes" class="card mt-lg">
        <h4 class="mb-sm">Notes</h4>
        <p class="text-muted">{{ match.notes }}</p>
      </div>

      <div v-if="screenshotUrl" class="card mt-lg screenshot-section">
        <h4 class="mb-sm">Match Screenshot</h4>
        <a :href="screenshotUrl" target="_blank" rel="noopener noreferrer" class="screenshot-link">
          <img :src="screenshotUrl" alt="Match screenshot" class="screenshot-image">
        </a>
      </div>
    </template>
  </div>
</template>

<style scoped>
.result-banner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
  padding: 20px 24px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  background: linear-gradient(160deg, rgba(9, 18, 14, 0.95), rgba(6, 9, 8, 0.98));
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.25);
}

.result-banner__team {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--text-secondary);
}

.result-banner__team:last-child {
  justify-content: flex-end;
}

.result-banner__team-name {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.result-banner__score {
  font-family: 'Teko', var(--font-heading);
  font-size: 3.2rem;
  line-height: 1;
  font-weight: 800;
  color: #9ca3af;
  text-shadow: 0 0 20px rgba(156, 163, 175, 0.2);
}

.result-banner__team--winner .result-banner__team-name {
  color: var(--green-neon);
}

.result-banner__team--winner .result-banner__score {
  color: var(--green-neon);
  text-shadow: 0 0 30px rgba(0, 255, 135, 0.45);
}

.result-banner__center {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-banner__status {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.6rem;
  letter-spacing: 2px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.result-banner__status--win {
  color: var(--gold);
}

.result-banner__status--lose {
  color: #94a3b8;
}

.result-banner__vs {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.2rem;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 2px 10px;
}

.result-banner__status-icon {
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.45));
}

.match-header {
  text-align: center;
  margin-bottom: 40px;
}

.match-header__date {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.match-header__duration {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 20px;
}

.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.team-col__title {
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.player-card {
  margin-bottom: 12px;
  padding: 16px;
}

.player-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.player-card__details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-card__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.player-card__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.player-card__rating {
  font-family: var(--font-heading);
  font-weight: 700;
  color: var(--gold);
}

.team-totals {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-secondary);
}

.screenshot-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.screenshot-link {
  display: inline-flex;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  max-width: 740px;
}

.screenshot-image {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  display: block;
}

@media (max-width: 768px) {
  .result-banner {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: center;
    padding: 18px 12px;
  }

  .result-banner__team,
  .result-banner__team:last-child,
  .result-banner__center {
    justify-content: center;
  }

  .result-banner__score {
    font-size: 2.6rem;
  }

  .teams-grid {
    grid-template-columns: 1fr;
  }

}
</style>
