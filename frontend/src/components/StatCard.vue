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
        <span class="stat-card__icon">{{ icon }}</span>
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
  font-size: 1.1rem;
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
