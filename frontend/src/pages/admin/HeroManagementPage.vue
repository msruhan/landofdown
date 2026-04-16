<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { heroesApi, rolesApi } from '@/services/api'
import type { Hero, Role, Column } from '@/types'
import DataTable from '@/components/DataTable.vue'
import ModalDialog from '@/components/ModalDialog.vue'

const heroes = ref<Hero[]>([])
const roles = ref<Role[]>([])
const loading = ref(true)

const showModal = ref(false)
const editingHero = ref<Hero | null>(null)
const formName = ref('')
const formRoleId = ref<number | null>(null)
const formHeroRole = ref('')
const formLane = ref<'jungle' | 'exp' | 'gold' | 'mid' | 'roam' | null>(null)
const formError = ref('')
const formSaving = ref(false)

const showDeleteConfirm = ref(false)
const deletingHero = ref<Hero | null>(null)

const columns: Column[] = [
  { key: 'id', label: 'ID', width: '60px', align: 'center' },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'hero_role', label: 'Role' },
  { key: 'lane', label: 'Lane' },
  { key: 'actions', label: 'Actions', width: '160px', align: 'center' },
]

const laneOptions = [
  { value: 'jungle', label: 'Jungle' },
  { value: 'exp', label: 'EXP Lane' },
  { value: 'gold', label: 'Gold Lane' },
  { value: 'mid', label: 'Middle Lane' },
  { value: 'roam', label: 'Roam' },
] as const

const roleOptions = ['Assassin', 'Fighter', 'Marksman', 'Tank', 'Mage', 'Support']

function laneLabel(lane?: string | null): string {
  const found = laneOptions.find((l) => l.value === lane)
  return found?.label ?? '-'
}

function normalizeList<T>(payload: T[] | { data?: T[] }): T[] {
  return Array.isArray(payload) ? payload : (payload.data ?? [])
}

async function fetchData() {
  loading.value = true
  try {
    const [hRes, rRes] = await Promise.all([
      heroesApi.getHeroes({ per_page: 200 }),
      rolesApi.getRoles({ per_page: 100 }),
    ])
    heroes.value = normalizeList<Hero>(hRes.data as Hero[] | { data?: Hero[] })
    roles.value = normalizeList<Role>(rRes.data as Role[] | { data?: Role[] })
  } catch { heroes.value = [] } finally { loading.value = false }
}

function openAddModal() {
  editingHero.value = null
  formName.value = ''
  formRoleId.value = null
  formHeroRole.value = ''
  formLane.value = null
  formError.value = ''
  showModal.value = true
}

function openEditModal(hero: Hero) {
  editingHero.value = hero
  formName.value = hero.name
  formRoleId.value = hero.role_id ?? null
  formHeroRole.value = hero.hero_role ?? ''
  formLane.value = hero.lane ?? null
  formError.value = ''
  showModal.value = true
}

async function handleSave() {
  if (!formName.value.trim()) { formError.value = 'Name is required'; return }
  if (!formHeroRole.value.trim()) { formError.value = 'Role is required'; return }
  if (!formLane.value) { formError.value = 'Lane is required'; return }
  formSaving.value = true
  formError.value = ''
  try {
    const selectedRole = roles.value.find((r) => r.name === formLane.value)
    const data = {
      name: formName.value,
      hero_role: formHeroRole.value,
      lane: formLane.value,
      role_id: selectedRole?.id ?? formRoleId.value,
    }
    if (editingHero.value) {
      await heroesApi.updateHero(editingHero.value.id, data)
    } else {
      await heroesApi.createHero(data)
    }
    showModal.value = false
    await fetchData()
  } catch (e: unknown) {
    formError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
  } finally { formSaving.value = false }
}

function confirmDelete(hero: Hero) {
  deletingHero.value = hero
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deletingHero.value) return
  try {
    await heroesApi.deleteHero(deletingHero.value.id)
    showDeleteConfirm.value = false
    await fetchData()
  } catch { /* empty */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header flex justify-between items-center flex-wrap gap-md">
      <div>
        <h1 class="page-title">Heroes</h1>
        <p class="page-subtitle">Manage the hero pool</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Add Hero</button>
    </div>

    <DataTable :columns="columns" :data="(heroes as unknown as Record<string, unknown>[])" :loading="loading">
      <template #cell-lane="{ value }">
        <span>{{ laneLabel(value as string | null) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex gap-sm justify-center">
          <button class="btn btn-secondary btn-sm" @click="openEditModal(row as unknown as Hero)">Edit</button>
          <button class="btn btn-danger btn-sm" @click="confirmDelete(row as unknown as Hero)">Delete</button>
        </div>
      </template>
    </DataTable>

    <ModalDialog v-if="showModal" :title="editingHero ? 'Edit Hero' : 'Add Hero'" @close="showModal = false">
      <form @submit.prevent="handleSave" class="flex flex-col gap-md">
        <div v-if="formError" class="error-banner">{{ formError }}</div>
        <div class="form-group">
          <label class="form-label">Hero Name</label>
          <input v-model="formName" type="text" class="form-input" placeholder="Enter hero name" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Role Class</label>
          <select v-model="formHeroRole" class="form-select" required>
            <option value="">Select role class...</option>
            <option v-for="r in roleOptions" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Lane</label>
          <select v-model="formLane" class="form-select" required>
            <option :value="null">Select lane...</option>
            <option v-for="lane in laneOptions" :key="lane.value" :value="lane.value">{{ lane.label }}</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancel</button>
        <button class="btn btn-primary" :disabled="formSaving" @click="handleSave">{{ formSaving ? 'Saving...' : 'Save' }}</button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="showDeleteConfirm" title="Delete Hero" @close="showDeleteConfirm = false">
      <p>Are you sure you want to delete <strong>{{ deletingHero?.name }}</strong>?</p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="handleDelete">Delete</button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.error-banner { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: var(--danger); padding: 10px 16px; border-radius: var(--radius-md); font-size: 0.85rem; }
</style>
