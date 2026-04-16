<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Role, Hero, FilterOptions } from '@/types'
import { rolesApi, heroesApi } from '@/services/api'

const emit = defineEmits<{
  filter: [filters: FilterOptions]
}>()

const props = defineProps<{
  showSort?: boolean
  sortOptions?: { value: string; label: string }[]
}>()

const roles = ref<Role[]>([])
const heroes = ref<Hero[]>([])

const filters = ref<FilterOptions>({
  role_id: undefined,
  hero_id: undefined,
  period: undefined,
  min_matches: undefined,
  sort_by: undefined,
  sort_dir: 'desc',
})

onMounted(async () => {
  try {
    const [rolesRes, heroesRes] = await Promise.all([
      rolesApi.getRoles({ per_page: 100 }),
      heroesApi.getHeroes({ per_page: 200 }),
    ])
    roles.value = rolesRes.data.data
    heroes.value = heroesRes.data.data
  } catch {
    // Silently handle - filters just won't have options
  }
})

function applyFilters() {
  emit('filter', { ...filters.value })
}

function resetFilters() {
  filters.value = { role_id: undefined, hero_id: undefined, period: undefined, min_matches: undefined, sort_by: undefined, sort_dir: 'desc' }
  emit('filter', { ...filters.value })
}
</script>

<template>
  <div class="filter-panel">
    <div class="filter-panel__fields">
      <div class="form-group">
        <label class="form-label">Role</label>
        <select v-model="filters.role_id" class="form-select" @change="applyFilters">
          <option :value="undefined">All Roles</option>
          <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Hero</label>
        <select v-model="filters.hero_id" class="form-select" @change="applyFilters">
          <option :value="undefined">All Heroes</option>
          <option v-for="hero in heroes" :key="hero.id" :value="hero.id">{{ hero.name }}</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Period</label>
        <select v-model="filters.period" class="form-select" @change="applyFilters">
          <option :value="undefined">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Min Matches</label>
        <input v-model.number="filters.min_matches" type="number" class="form-input" placeholder="0" min="0" @change="applyFilters">
      </div>

      <div v-if="showSort && sortOptions" class="form-group">
        <label class="form-label">Sort By</label>
        <select v-model="filters.sort_by" class="form-select" @change="applyFilters">
          <option :value="undefined">Default</option>
          <option v-for="opt in props.sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>

    <button class="btn btn-secondary btn-sm" @click="resetFilters">Reset</button>
  </div>
</template>

<style scoped>
.filter-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-panel__fields {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.filter-panel__fields .form-group {
  min-width: 150px;
  flex: 1;
}

@media (max-width: 768px) {
  .filter-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-panel__fields {
    flex-direction: column;
  }
}
</style>
