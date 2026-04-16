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
      <!-- Match Header -->
      <div class="match-header">
        <div class="match-header__date">{{ formattedDate }}</div>
        <div v-if="match.duration" class="match-header__duration">Duration: {{ match.duration }}</div>
        <div class="match-header__teams">
          <div class="match-header__team" :class="{ winner: match.winner === 'team_a' }">
            <span class="team-name">{{ match.team_a_name }}</span>
            <span v-if="match.winner === 'team_a'" class="winner-tag">WINNER</span>
          </div>
          <div class="match-header__vs">VS</div>
          <div class="match-header__team" :class="{ winner: match.winner === 'team_b' }">
            <span class="team-name">{{ match.team_b_name }}</span>
            <span v-if="match.winner === 'team_b'" class="winner-tag">WINNER</span>
          </div>
        </div>
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

.match-header__teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.match-header__team {
  text-align: center;
}

.match-header__team .team-name {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-secondary);
  display: block;
}

.match-header__team.winner .team-name {
  color: var(--green-neon);
}

.match-header__team.winner {
  text-shadow: 0 0 20px rgba(0, 255, 135, 0.3);
}

.winner-tag {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(0, 255, 135, 0.1);
  color: var(--green-neon);
  border: 1px solid rgba(0, 255, 135, 0.2);
  border-radius: 99px;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.match-header__vs {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-muted);
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
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
  .teams-grid {
    grid-template-columns: 1fr;
  }

  .match-header__teams {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
