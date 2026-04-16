<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  winRate: number
  wins?: number
  losses?: number
}>()

const clampedRate = computed(() => Math.max(0, Math.min(100, props.winRate)))
</script>

<template>
  <div class="wr">
    <div class="wr__bar">
      <div class="wr__fill wr__fill--win" :style="{ width: clampedRate + '%' }"></div>
      <div class="wr__fill wr__fill--loss" :style="{ width: (100 - clampedRate) + '%' }"></div>
    </div>
    <div class="wr__label">
      <span class="wr__pct">{{ clampedRate.toFixed(1) }}%</span>
      <span v-if="wins !== undefined && losses !== undefined" class="wr__wl">{{ wins }}W {{ losses }}L</span>
    </div>
  </div>
</template>

<style scoped>
.wr {
  width: 100%;
}

.wr__bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--bg-input);
}

.wr__fill--win {
  background: var(--green-neon);
  transition: width 0.5s ease;
}

.wr__fill--loss {
  background: var(--danger);
  transition: width 0.5s ease;
}

.wr__label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.wr__pct {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--green-neon);
}

.wr__wl {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
