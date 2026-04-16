<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ role: string }>()

const colorMap: Record<string, string> = {
  gold: '#ffd700',
  mid: '#06b6d4',
  exp: '#f59e0b',
  jungle: '#ef4444',
  roam: '#10b981',
  // legacy compatibility
  'Gold Laner': '#ffd700',
  'Mid Laner': '#06b6d4',
  'EXP Laner': '#f59e0b',
  Jungler: '#ef4444',
  Roamer: '#10b981',
}

const roleColor = computed(() => colorMap[props.role] ?? colorMap[props.role.toLowerCase()] ?? 'var(--green-neon)')
</script>

<template>
  <span class="role-badge" :style="{ '--role-color': roleColor }">{{ role }}</span>
</template>

<style scoped>
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-heading);
  letter-spacing: 0.3px;
  background: color-mix(in srgb, var(--role-color) 10%, transparent);
  color: var(--role-color);
  border: 1px solid color-mix(in srgb, var(--role-color) 20%, transparent);
}
</style>
