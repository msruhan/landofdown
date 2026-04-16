<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  medal: 'mvp_win' | 'mvp_lose' | 'gold' | 'silver' | 'bronze' | null
}>()

const config = computed(() => {
  switch (props.medal) {
    case 'mvp_win':
      return { label: '★ MVP Win', cls: 'medal-mvp-win' }
    case 'mvp_lose':
      return { label: '✦ MVP Lose', cls: 'medal-mvp-lose' }
    case 'gold':
      return { label: '🥇 Gold', cls: 'medal-gold' }
    case 'silver':
      return { label: '🥈 Silver', cls: 'medal-silver' }
    case 'bronze':
      return { label: '🥉 Bronze', cls: 'medal-bronze' }
    default:
      return null
  }
})
</script>

<template>
  <span v-if="config" class="medal-badge" :class="config.cls">{{ config.label }}</span>
</template>

<style scoped>
.medal-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-heading);
  letter-spacing: 0.5px;
}

.medal-mvp-win {
  background: rgba(255, 215, 0, 0.15);
  color: var(--gold);
  border: 1px solid rgba(255, 215, 0, 0.3);
  animation: glow-pulse 2s ease-in-out infinite;
}

.medal-mvp-lose {
  background: rgba(147, 197, 253, 0.14);
  color: #bfdbfe;
  border: 1px solid rgba(147, 197, 253, 0.3);
}

.medal-gold {
  background: rgba(255, 215, 0, 0.1);
  color: var(--gold);
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.medal-silver {
  background: rgba(192, 192, 192, 0.1);
  color: var(--silver);
  border: 1px solid rgba(192, 192, 192, 0.2);
}

.medal-bronze {
  background: rgba(205, 127, 50, 0.1);
  color: var(--bronze);
  border: 1px solid rgba(205, 127, 50, 0.2);
}
</style>
