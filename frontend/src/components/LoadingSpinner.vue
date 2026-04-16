<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg'
  text?: string
}>()
</script>

<template>
  <div class="spinner-container" :class="`spinner--${size || 'md'}`">
    <div class="spinner">
      <div class="spinner__ring"></div>
      <div class="spinner__ring"></div>
      <div class="spinner__dot"></div>
    </div>
    <span v-if="text" class="spinner__text">{{ text }}</span>
  </div>
</template>

<style scoped>
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.spinner {
  position: relative;
}

.spinner--sm .spinner { width: 24px; height: 24px; }
.spinner--md .spinner { width: 40px; height: 40px; }
.spinner--lg .spinner { width: 56px; height: 56px; }

.spinner__ring {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-radius: 50%;
}

.spinner__ring:nth-child(1) {
  border-top-color: var(--green-neon);
  animation: spin 1s linear infinite;
}

.spinner__ring:nth-child(2) {
  border-bottom-color: var(--green-emerald);
  animation: spin 1.5s linear infinite reverse;
  inset: 4px;
}

.spinner__dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  background: var(--green-neon);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: glow-pulse 1s ease-in-out infinite;
}

.spinner__text {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
