<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <span class="hero-chip">{{ name }}</span>
</template>

<style scoped>
.hero-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(0, 255, 135, 0.08);
  color: var(--green-neon);
  border: 1px solid rgba(0, 255, 135, 0.15);
  white-space: nowrap;
}
</style>
