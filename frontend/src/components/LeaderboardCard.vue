<script setup lang="ts">
import type { LeaderboardEntry } from '@/types'

const props = withDefaults(defineProps<{
  title: string
  players?: LeaderboardEntry[]
  statKey: keyof LeaderboardEntry
}>(), {
  players: () => [],
})

function getRankClass(index: number) {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

function getRankMedal(index: number) {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return ''
}

function formatValue(val: unknown): string {
  if (typeof val === 'number') return val % 1 === 0 ? val.toString() : val.toFixed(1)
  return String(val ?? '-')
}
</script>

<template>
  <div class="leaderboard-card card neon-border">
    <h4 class="leaderboard-card__title">
      <span class="leaderboard-card__title-bar"></span>
      {{ title }}
    </h4>
    <div class="leaderboard-card__list stagger-children">
      <router-link
        v-for="(player, index) in players.slice(0, 5)"
        :key="player.player_id"
        :to="{ name: 'statistics', query: { player: String(player.player_id) } }"
        class="leaderboard-card__item"
        :class="getRankClass(index)"
      >
        <span class="leaderboard-card__rank">
          <template v-if="getRankMedal(index)">{{ getRankMedal(index) }}</template>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <div class="leaderboard-card__avatar">
          <img
            :src="`https://api.dicebear.com/7.x/adventurer/svg?seed=${player.username}`"
            :alt="player.username"
            class="leaderboard-card__avatar-img"
          />
        </div>
        <span class="leaderboard-card__name">{{ player.username }}</span>
        <span class="leaderboard-card__stat">{{ formatValue(player[statKey]) }}</span>
        <span class="leaderboard-card__hint">View profile →</span>
      </router-link>
      <div v-if="!players.length" class="leaderboard-card__empty">No data available</div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-card__title {
  font-size: 1rem;
  color: var(--text-white);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.leaderboard-card__title-bar {
  width: 3px;
  height: 18px;
  background: var(--green-neon);
  border-radius: 2px;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(0, 255, 135, 0.4);
}

.leaderboard-card__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-card__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  transition: all var(--transition);
  border: 1px solid transparent;
  text-decoration: none;
  cursor: pointer;
}

.leaderboard-card__item:hover {
  background: rgba(0, 255, 135, 0.05);
  border-color: rgba(0, 255, 135, 0.1);
}

.leaderboard-card__hint {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  letter-spacing: 0.6px;
  color: var(--green-neon);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity var(--transition), transform var(--transition);
  white-space: nowrap;
}

.leaderboard-card__item:hover .leaderboard-card__hint {
  opacity: 1;
  transform: translateX(0);
}

.leaderboard-card__item.rank-gold {
  background: rgba(255, 215, 0, 0.06);
  border-left: 3px solid var(--gold);
  box-shadow: inset 0 0 20px rgba(255, 215, 0, 0.03);
}

.leaderboard-card__item.rank-silver {
  background: rgba(192, 192, 192, 0.04);
  border-left: 3px solid var(--silver);
}

.leaderboard-card__item.rank-bronze {
  background: rgba(205, 127, 50, 0.04);
  border-left: 3px solid var(--bronze);
}

.leaderboard-card__rank {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  width: 28px;
  text-align: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.rank-gold .leaderboard-card__rank { color: var(--gold); }
.rank-silver .leaderboard-card__rank { color: var(--silver); }
.rank-bronze .leaderboard-card__rank { color: var(--bronze); }

.leaderboard-card__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  transition: all var(--transition);
}

.rank-gold .leaderboard-card__avatar {
  border-color: var(--gold);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
}

.rank-silver .leaderboard-card__avatar {
  border-color: var(--silver);
  box-shadow: 0 0 8px rgba(192, 192, 192, 0.15);
}

.rank-bronze .leaderboard-card__avatar {
  border-color: var(--bronze);
  box-shadow: 0 0 8px rgba(205, 127, 50, 0.15);
}

.leaderboard-card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.leaderboard-card__name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
}

.leaderboard-card__stat {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--green-neon);
}

.leaderboard-card__empty {
  color: var(--text-muted);
  text-align: center;
  padding: 24px;
  font-size: 0.9rem;
}
</style>
