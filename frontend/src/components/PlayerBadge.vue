<script setup lang="ts">
defineProps<{
  username: string
  playerId?: number
  linkable?: boolean
}>()
</script>

<template>
  <component
    :is="linkable && playerId ? 'router-link' : 'span'"
    :to="linkable && playerId ? { name: 'statistics', query: { player: String(playerId) } } : undefined"
    class="player-badge"
  >
    <span class="player-badge__avatar">
      <img :src="`https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`" :alt="username" class="player-badge__img" />
    </span>
    <span class="player-badge__name">{{ username }}</span>
  </component>
</template>

<style scoped>
.player-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

a.player-badge:hover .player-badge__name {
  color: var(--green-neon);
}

a.player-badge:hover .player-badge__avatar {
  border-color: rgba(0, 255, 135, 0.4);
  box-shadow: 0 0 8px rgba(0, 255, 135, 0.2);
}

.player-badge__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: all var(--transition);
}

.player-badge__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-badge__name {
  font-weight: 500;
  transition: color var(--transition);
}
</style>
