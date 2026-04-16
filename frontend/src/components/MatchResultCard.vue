<script setup lang="ts">
import type { GameMatch } from '@/types'
import { computed } from 'vue'

const props = defineProps<{ match: GameMatch }>()

const formattedDate = computed(() => {
  const d = new Date(props.match.match_date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})
</script>

<template>
  <router-link :to="`/matches/${match.id}`" class="match-card corner-brackets">
    <div class="match-card__scanlines"></div>
    <div class="match-card__date">{{ formattedDate }}</div>
    <div class="match-card__teams">
      <span class="match-card__team" :class="{ winner: match.winner === 'team_a' }">
        <span class="match-card__team-indicator" :class="match.winner === 'team_a' ? 'indicator-win' : 'indicator-lose'"></span>
        {{ match.team_a_name }}
      </span>
      <span class="match-card__vs">
        <span class="match-card__vs-text">VS</span>
      </span>
      <span class="match-card__team" :class="{ winner: match.winner === 'team_b' }">
        {{ match.team_b_name }}
        <span class="match-card__team-indicator" :class="match.winner === 'team_b' ? 'indicator-win' : 'indicator-lose'"></span>
      </span>
    </div>
    <div class="match-card__result">
      <span class="badge" :class="match.winner === 'team_a' ? 'badge-green' : 'badge-red'">
        {{ match.winner === 'team_a' ? match.team_a_name : match.team_b_name }} Won
      </span>
    </div>
  </router-link>
</template>

<style scoped>
.match-card {
  display: block;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all 0.4s ease;
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
}

.match-card__scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 135, 0.01) 2px,
    rgba(0, 255, 135, 0.01) 4px
  );
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.match-card:hover .match-card__scanlines {
  opacity: 1;
}

.match-card:hover {
  border-color: rgba(0, 255, 135, 0.3);
  box-shadow:
    var(--shadow-glow),
    inset 0 0 30px rgba(0, 255, 135, 0.02);
  transform: translateY(-3px);
}

.match-card__date {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 12px;
  font-family: var(--font-heading);
  letter-spacing: 0.5px;
}

.match-card__teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 14px;
}

.match-card__team {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-card__team.winner {
  color: var(--green-neon);
}

.match-card__team-indicator {
  width: 4px;
  height: 20px;
  border-radius: 2px;
  flex-shrink: 0;
}

.indicator-win {
  background: var(--green-neon);
  box-shadow: 0 0 8px rgba(0, 255, 135, 0.4);
}

.indicator-lose {
  background: var(--danger);
  opacity: 0.5;
}

.match-card__vs {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-card__vs-text {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 5px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  letter-spacing: 1px;
  transition: all 0.4s ease;
}

.match-card:hover .match-card__vs-text {
  border-color: rgba(0, 255, 135, 0.3);
  color: var(--green-neon);
  box-shadow: 0 0 12px rgba(0, 255, 135, 0.15);
}

.match-card__result {
  text-align: center;
}
</style>
