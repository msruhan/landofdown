<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  title: string
  value: string | number
  icon?: string
  color?: string
  trend?: number
}>()

const visible = ref(false)

function normalizedIcon(icon?: string): string {
  if (!icon) return ''
  const value = icon.toLowerCase().trim()
  if (value.includes('match') || value === '⚔') return 'matches'
  if (value.includes('player') || value === '👥') return 'players'
  if (value.includes('hero') || value === '🦸') return 'heroes'
  if (value.includes('mvp') || value === '🏆') return 'mvps'
  if (value.includes('win') || value.includes('rate') || value === '📈') return 'winrate'
  return value
}

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true
  })
})
</script>

<template>
  <div
    class="stat-card corner-brackets"
    :class="{ 'stat-card--visible': visible }"
    :style="color ? `--accent: ${color}` : ''"
  >
    <div class="stat-card__scanlines"></div>
    <div class="stat-card__header">
      <span class="stat-card__icon-wrap" v-if="icon">
        <svg v-if="normalizedIcon(icon) === 'matches'" class="stat-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 6L4 3L2 7L6 10M16 18L20 21L22 17L18 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 8L14 12M14 12L10 16M14 12H6M14 12H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="normalizedIcon(icon) === 'players'" class="stat-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M16 7a3 3 0 110 6a3 3 0 010-6zM8 8a4 4 0 110 8a4 4 0 010-8z" stroke="currentColor" stroke-width="1.8"/>
          <path d="M3 19a5 5 0 015-5h1a5 5 0 015 5M14 19a4 4 0 014-4h.5A3.5 3.5 0 0122 18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="normalizedIcon(icon) === 'heroes'" class="stat-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l2.4 3.6L19 8l-3 3.4l.6 4.8L12 14.4L7.4 16.2L8 11.4L5 8l4.6-1.4L12 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M9 18h6M10 21h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="normalizedIcon(icon) === 'mvps'" class="stat-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 4h10v3a5 5 0 01-10 0V4zM7 7H5a2 2 0 002 2M17 7h2a2 2 0 01-2 2M12 12v4M9 21h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="normalizedIcon(icon) === 'winrate'" class="stat-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 19h16M7 16l3-4l3 2l4-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 8h3v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="stat-card__title">{{ title }}</span>
    </div>
    <div class="stat-card__value">{{ value }}</div>
    <div v-if="trend !== undefined" class="stat-card__trend" :class="trend >= 0 ? 'positive' : 'negative'">
      <span>{{ trend >= 0 ? '▲' : '▼' }}</span>
      {{ Math.abs(trend).toFixed(1) }}%
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  --accent: var(--green-neon);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px);
}

.stat-card--visible {
  opacity: 1;
  transform: translateY(0);
  animation: count-up 0.5s ease forwards;
}

.stat-card__scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 135, 0.012) 2px,
    rgba(0, 255, 135, 0.012) 4px
  );
  pointer-events: none;
  z-index: 1;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  opacity: 0.6;
}

.stat-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 25px color-mix(in srgb, var(--accent) 15%, transparent);
  transform: translateY(-3px);
  background: linear-gradient(
    135deg,
    var(--bg-card) 0%,
    color-mix(in srgb, var(--accent) 4%, var(--bg-card)) 100%
  );
}

.stat-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.stat-card__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 10%, transparent);
  flex-shrink: 0;
}

.stat-card__icon {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.stat-card__title {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-card__value {
  font-family: var(--font-heading);
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--text-white);
  line-height: 1;
}

.stat-card__trend {
  margin-top: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-card__trend.positive {
  color: var(--green-neon);
}

.stat-card__trend.negative {
  color: var(--danger);
}
</style>
