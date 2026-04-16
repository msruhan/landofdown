<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
  message?: string
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-state__icon">{{ icon || '📭' }}</div>
    <h4 class="empty-state__title">{{ title || 'No Data' }}</h4>
    <p class="empty-state__message">{{ message || 'Nothing to display yet.' }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-state__icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.empty-state__title {
  font-family: var(--font-heading);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-state__message {
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
