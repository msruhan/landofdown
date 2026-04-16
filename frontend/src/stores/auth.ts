import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'
import type { AuthUser } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name ?? 'Admin')

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.login({ email, password })
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('auth_token', response.data.token)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore errors on logout
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const response = await authApi.me()
      user.value = response.data
    } catch {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    }
  }

  return { user, token, loading, error, isAuthenticated, userName, login, logout, fetchUser }
})
