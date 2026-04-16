<script setup lang="ts">
defineProps<{
  kills: number
  deaths: number
  assists: number
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <span class="kda" :class="`kda--${size || 'md'}`">
    <span class="kda__kills">{{ kills }}</span>
    <span class="kda__sep">/</span>
    <span class="kda__deaths">{{ deaths }}</span>
    <span class="kda__sep">/</span>
    <span class="kda__assists">{{ assists }}</span>
  </span>
</template>

<style scoped>
.kda {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-heading);
  font-weight: 700;
}

.kda--sm { font-size: 0.85rem; }
.kda--md { font-size: 1rem; }
.kda--lg { font-size: 1.3rem; }

.kda__kills { color: var(--green-neon); }
.kda__deaths { color: var(--danger); }
.kda__assists { color: var(--cyan); }
.kda__sep { color: var(--text-muted); margin: 0 1px; }
</style>
