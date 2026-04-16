<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/admin/dashboard')
  } catch {
    error.value = authStore.error || 'Login failed. Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-card animate-slide-up">
      <div class="login-card__header">
        <span class="login-card__icon">⚔</span>
        <h1 class="login-card__title">MLBB <span class="text-green">ADMIN</span></h1>
        <p class="login-card__subtitle">Sign in to manage stats</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-card__form">
        <div v-if="error" class="login-error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="admin@example.com"
            autocomplete="email"
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            autocomplete="current-password"
          >
        </div>

        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="login-card__footer">
        <router-link to="/">← Back to site</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.login-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at top, rgba(0, 255, 135, 0.05), transparent 60%),
    repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(0, 255, 135, 0.02) 50px, rgba(0, 255, 135, 0.02) 51px),
    repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(0, 255, 135, 0.02) 50px, rgba(0, 255, 135, 0.02) 51px),
    var(--bg-primary);
  z-index: 0;
}

.login-card {
  position: relative;
  z-index: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-card);
}

.login-card__header {
  text-align: center;
  margin-bottom: 32px;
}

.login-card__icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
}

.login-card__title {
  font-size: 1.8rem;
  letter-spacing: 2px;
}

.login-card__subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 4px;
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--danger);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  text-align: center;
}

.login-card__footer {
  text-align: center;
  margin-top: 24px;
  font-size: 0.85rem;
}
</style>
