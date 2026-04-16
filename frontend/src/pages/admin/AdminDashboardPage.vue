<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { statisticsApi } from '@/services/api'
import type { DashboardStats } from '@/types'
import StatCard from '@/components/StatCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await statisticsApi.getDashboard()
    stats.value = res.data
  } catch {
    // fallback to empty
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Admin Dashboard</h1>
      <p class="page-subtitle">Overview and quick actions</p>
    </div>

    <LoadingSpinner v-if="loading" text="Loading..." />

    <template v-else>
      <!-- Stats -->
      <div class="grid-4 mb-lg" v-if="stats">
        <StatCard title="Total Matches" :value="stats.total_matches" icon="⚔" color="#00ff87" />
        <StatCard title="Total Players" :value="stats.total_players" icon="👥" color="#06b6d4" />
        <StatCard title="Heroes Used" :value="stats.total_heroes" icon="🦸" color="#f59e0b" />
        <StatCard title="Total MVPs" :value="stats.total_mvps" icon="🏆" color="#ffd700" />
      </div>

      <!-- Quick Actions -->
      <section class="section">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-actions">
          <router-link to="/admin/matches/create" class="action-card card">
            <span class="action-card__icon">📝</span>
            <span class="action-card__label">Input Match</span>
            <span class="action-card__desc">Manually enter match results</span>
          </router-link>
          <router-link to="/admin/matches/upload" class="action-card card">
            <span class="action-card__icon">📸</span>
            <span class="action-card__label">Upload Screenshot</span>
            <span class="action-card__desc">Upload and parse a screenshot</span>
          </router-link>
          <router-link to="/admin/players" class="action-card card">
            <span class="action-card__icon">👥</span>
            <span class="action-card__label">Manage Players</span>
            <span class="action-card__desc">Add, edit, or remove players</span>
          </router-link>
          <router-link to="/admin/heroes" class="action-card card">
            <span class="action-card__icon">🦸</span>
            <span class="action-card__label">Manage Heroes</span>
            <span class="action-card__desc">Maintain the hero pool</span>
          </router-link>
        </div>
      </section>

      <!-- Recent Matches -->
      <section v-if="stats?.recent_matches?.length" class="section">
        <h2 class="section-title">Recent Activity</h2>
        <div class="activity-list">
          <div v-for="match in stats.recent_matches.slice(0, 5)" :key="match.id" class="activity-item card">
            <div class="activity-item__date">{{ new Date(match.match_date).toLocaleDateString() }}</div>
            <div class="activity-item__detail">
              <strong :class="match.winner === 'team_a' ? 'text-green' : ''">{{ match.team_a_name }}</strong>
              <span class="text-muted"> vs </span>
              <strong :class="match.winner === 'team_b' ? 'text-green' : ''">{{ match.team_b_name }}</strong>
            </div>
            <router-link :to="`/admin/matches/${match.id}/edit`" class="btn btn-secondary btn-sm">Edit</router-link>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 20px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.action-card:hover {
  border-color: var(--green-neon);
  transform: translateY(-3px);
}

.action-card__icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.action-card__label {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-white);
  margin-bottom: 4px;
}

.action-card__desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
}

.activity-item__date {
  color: var(--text-muted);
  font-size: 0.85rem;
  min-width: 100px;
}

.activity-item__detail {
  flex: 1;
}
</style>
