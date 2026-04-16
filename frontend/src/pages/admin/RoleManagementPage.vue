<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { rolesApi } from '@/services/api'
import type { Role, Column } from '@/types'
import DataTable from '@/components/DataTable.vue'
import ModalDialog from '@/components/ModalDialog.vue'

const roles = ref<Role[]>([])
const loading = ref(true)

const showModal = ref(false)
const editingRole = ref<Role | null>(null)
const formName = ref('')
const formError = ref('')
const formSaving = ref(false)

const showDeleteConfirm = ref(false)
const deletingRole = ref<Role | null>(null)

const columns: Column[] = [
  { key: 'id', label: 'ID', width: '60px', align: 'center' },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'heroes_count', label: 'Heroes', align: 'center' },
  { key: 'actions', label: 'Actions', width: '160px', align: 'center' },
]

function normalizeList<T>(payload: T[] | { data?: T[] }): T[] {
  return Array.isArray(payload) ? payload : (payload.data ?? [])
}

async function fetchRoles() {
  loading.value = true
  try {
    const res = await rolesApi.getRoles({ per_page: 100 })
    roles.value = normalizeList<Role>(res.data as Role[] | { data?: Role[] })
  } catch { roles.value = [] } finally { loading.value = false }
}

function openAddModal() {
  editingRole.value = null
  formName.value = ''
  formError.value = ''
  showModal.value = true
}

function openEditModal(role: Role) {
  editingRole.value = role
  formName.value = role.name
  formError.value = ''
  showModal.value = true
}

async function handleSave() {
  if (!formName.value.trim()) { formError.value = 'Name is required'; return }
  formSaving.value = true
  formError.value = ''
  try {
    if (editingRole.value) {
      await rolesApi.updateRole(editingRole.value.id, { name: formName.value })
    } else {
      await rolesApi.createRole({ name: formName.value })
    }
    showModal.value = false
    await fetchRoles()
  } catch (e: unknown) {
    formError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
  } finally { formSaving.value = false }
}

function confirmDelete(role: Role) {
  deletingRole.value = role
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deletingRole.value) return
  try {
    await rolesApi.deleteRole(deletingRole.value.id)
    showDeleteConfirm.value = false
    await fetchRoles()
  } catch { /* empty */ }
}

onMounted(fetchRoles)
</script>

<template>
  <div>
    <div class="page-header flex justify-between items-center flex-wrap gap-md">
      <div>
        <h1 class="page-title">Roles</h1>
        <p class="page-subtitle">Manage game roles</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Add Role</button>
    </div>

    <DataTable :columns="columns" :data="(roles as unknown as Record<string, unknown>[])" :loading="loading">
      <template #cell-heroes_count="{ value }">
        <span class="badge badge-green">{{ value ?? 0 }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex gap-sm justify-center">
          <button class="btn btn-secondary btn-sm" @click="openEditModal(row as unknown as Role)">Edit</button>
          <button class="btn btn-danger btn-sm" @click="confirmDelete(row as unknown as Role)">Delete</button>
        </div>
      </template>
    </DataTable>

    <ModalDialog v-if="showModal" :title="editingRole ? 'Edit Role' : 'Add Role'" @close="showModal = false">
      <form @submit.prevent="handleSave">
        <div v-if="formError" class="error-banner mb-md">{{ formError }}</div>
        <div class="form-group">
          <label class="form-label">Role Name</label>
          <input v-model="formName" type="text" class="form-input" placeholder="e.g. mid / exp / gold / roam / jungle" required autofocus>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancel</button>
        <button class="btn btn-primary" :disabled="formSaving" @click="handleSave">{{ formSaving ? 'Saving...' : 'Save' }}</button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="showDeleteConfirm" title="Delete Role" @close="showDeleteConfirm = false">
      <p>Are you sure you want to delete <strong>{{ deletingRole?.name }}</strong>?</p>
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
