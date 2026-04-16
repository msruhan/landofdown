<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { playersApi } from '@/services/api'
import type { Player, Column } from '@/types'
import DataTable from '@/components/DataTable.vue'
import ModalDialog from '@/components/ModalDialog.vue'

const players = ref<Player[]>([])
const loading = ref(true)
const search = ref('')

const showModal = ref(false)
const editingPlayer = ref<Player | null>(null)
const formUsername = ref('')
const formError = ref('')
const formSaving = ref(false)

const showDeleteConfirm = ref(false)
const deletingPlayer = ref<Player | null>(null)

const columns: Column[] = [
  { key: 'id', label: 'ID', width: '60px', align: 'center' },
  { key: 'username', label: 'Username', sortable: true },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: 'Actions', width: '160px', align: 'center' },
]

const filteredPlayers = computed(() => {
  if (!search.value) return players.value
  const q = search.value.toLowerCase()
  return players.value.filter(p => p.username.toLowerCase().includes(q))
})

async function fetchPlayers() {
  loading.value = true
  try {
    const res = await playersApi.getPlayers({ per_page: 200 })
    players.value = res.data.data
  } catch { players.value = [] } finally { loading.value = false }
}

function openAddModal() {
  editingPlayer.value = null
  formUsername.value = ''
  formError.value = ''
  showModal.value = true
}

function openEditModal(player: Player) {
  editingPlayer.value = player
  formUsername.value = player.username
  formError.value = ''
  showModal.value = true
}

async function handleSave() {
  if (!formUsername.value.trim()) { formError.value = 'Username is required'; return }
  formSaving.value = true
  formError.value = ''
  try {
    if (editingPlayer.value) {
      await playersApi.updatePlayer(editingPlayer.value.id, { username: formUsername.value })
    } else {
      await playersApi.createPlayer({ username: formUsername.value })
    }
    showModal.value = false
    await fetchPlayers()
  } catch (e: unknown) {
    formError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
  } finally { formSaving.value = false }
}

function confirmDelete(player: Player) {
  deletingPlayer.value = player
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deletingPlayer.value) return
  try {
    await playersApi.deletePlayer(deletingPlayer.value.id)
    showDeleteConfirm.value = false
    await fetchPlayers()
  } catch { /* empty */ }
}

onMounted(fetchPlayers)
</script>

<template>
  <div>
    <div class="page-header flex justify-between items-center flex-wrap gap-md">
      <div>
        <h1 class="page-title">Players</h1>
        <p class="page-subtitle">Manage player accounts</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Add Player</button>
    </div>

    <div class="card mb-lg" style="padding: 16px;">
      <input v-model="search" type="text" class="form-input" placeholder="Search players...">
    </div>

    <DataTable :columns="columns" :data="(filteredPlayers as unknown as Record<string, unknown>[])" :loading="loading">
      <template #cell-created_at="{ value }">
        <span class="text-muted">{{ value ? new Date(value as string).toLocaleDateString() : '-' }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex gap-sm justify-center">
          <button class="btn btn-secondary btn-sm" @click="openEditModal(row as unknown as Player)">Edit</button>
          <button class="btn btn-danger btn-sm" @click="confirmDelete(row as unknown as Player)">Delete</button>
        </div>
      </template>
    </DataTable>

    <!-- Add/Edit Modal -->
    <ModalDialog v-if="showModal" :title="editingPlayer ? 'Edit Player' : 'Add Player'" @close="showModal = false">
      <form @submit.prevent="handleSave">
        <div v-if="formError" class="error-banner mb-md">{{ formError }}</div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input v-model="formUsername" type="text" class="form-input" placeholder="Enter username" required autofocus>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showModal = false">Cancel</button>
        <button class="btn btn-primary" :disabled="formSaving" @click="handleSave">{{ formSaving ? 'Saving...' : 'Save' }}</button>
      </template>
    </ModalDialog>

    <!-- Delete Confirmation -->
    <ModalDialog v-if="showDeleteConfirm" title="Delete Player" @close="showDeleteConfirm = false">
      <p>Are you sure you want to delete <strong>{{ deletingPlayer?.username }}</strong>? This action cannot be undone.</p>
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
