<script setup lang="ts">
import { ref } from 'vue'
import type { FilterOptions } from '@/types'

const emit = defineEmits<{
  filter: [filters: FilterOptions]
}>()

const props = defineProps<{
  showSort?: boolean
  sortOptions?: { value: string; label: string }[]
}>()

const filters = ref<FilterOptions>({
  period: undefined,
  min_matches: undefined,
  sort_by: undefined,
  sort_dir: 'desc',
})

function applyFilters() {
  emit('filter', { ...filters.value })
}

function resetFilters() {
  filters.value = { period: undefined, min_matches: undefined, sort_by: undefined, sort_dir: 'desc' }
  emit('filter', { ...filters.value })
}
</script>

<template>
  <div class="filter-panel">
    <div class="filter-panel__fields">
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
