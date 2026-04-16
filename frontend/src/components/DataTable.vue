<script setup lang="ts">
import type { Column, Pagination } from '@/types'

const props = defineProps<{
  columns: Column[]
  data: Record<string, unknown>[]
  loading?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  pagination?: Pagination
}>()

const emit = defineEmits<{
  sort: [key: string]
  page: [page: number]
}>()

function handleSort(col: Column) {
  if (col.sortable) emit('sort', col.key)
}

function getCellValue(row: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce((obj: unknown, k) => (obj as Record<string, unknown>)?.[k], row)
}
</script>

<template>
  <div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="{ width: col.width, textAlign: col.align || 'left', cursor: col.sortable ? 'pointer' : 'default' }"
              @click="handleSort(col)"
            >
              <span class="th-content">
                {{ col.label }}
                <span v-if="col.sortable" class="sort-icon">
                  <template v-if="sortBy === col.key">{{ sortDir === 'asc' ? '▲' : '▼' }}</template>
                  <template v-else>⇅</template>
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="i in 5" :key="i">
            <td v-for="col in columns" :key="col.key">
              <div class="skeleton" style="height: 16px; width: 80%"></div>
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="data.length">
          <tr v-for="(row, index) in data" :key="index">
            <td v-for="col in columns" :key="col.key" :style="{ textAlign: col.align || 'left' }">
              <slot :name="`cell-${col.key}`" :row="row" :value="getCellValue(row, col.key)" :index="index">
                {{ getCellValue(row, col.key) ?? '-' }}
              </slot>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td :colspan="columns.length" style="text-align: center; padding: 40px; color: var(--text-muted)">
              No data available
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination && pagination.last_page > 1" class="pagination">
      <button :disabled="pagination.current_page <= 1" @click="emit('page', pagination.current_page - 1)">‹ Prev</button>
      <template v-for="p in pagination.last_page" :key="p">
        <button
          v-if="p === 1 || p === pagination.last_page || (p >= pagination.current_page - 2 && p <= pagination.current_page + 2)"
          :class="{ active: p === pagination.current_page }"
          @click="emit('page', p)"
        >{{ p }}</button>
        <span
          v-else-if="p === pagination.current_page - 3 || p === pagination.current_page + 3"
          style="color: var(--text-muted); padding: 0 4px;"
        >…</span>
      </template>
      <button :disabled="pagination.current_page >= pagination.last_page" @click="emit('page', pagination.current_page + 1)">Next ›</button>
    </div>
  </div>
</template>

<style scoped>
.th-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  font-size: 0.7rem;
  color: var(--text-muted);
}

th:hover .sort-icon {
  color: var(--green-neon);
}
</style>
