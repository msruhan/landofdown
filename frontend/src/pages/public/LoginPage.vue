<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Email dan password wajib diisi.'
    return
  }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || (auth.isAdmin ? '/admin/dashboard' : '/mabar')
    router.push(redirect)
  } catch {
    error.value = auth.error || 'Login gagal. Periksa email & password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-page__bg"></div>
    <div class="auth-card animate-slide-up">
      <div class="auth-card__header">
        <span class="auth-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 12h4 M8 10v4 M15 12h.01 M17 14h.01 M7 16h10a5 5 0 0 0 5-5a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5a5 5 0 0 0 5 5z" />
          </svg>
        </span>
        <h1 class="auth-card__title">Welcome <span class="gradient-text">Back</span></h1>
        <p class="auth-card__subtitle">Masuk untuk gabung mabar & buat squad bareng</p>
      </div>

      <form @submit.prevent="submit" class="auth-card__form">
        <div v-if="error" class="auth-error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input id="email" v-model="email" type="email" class="form-input" placeholder="you@email.com" autocomplete="email" />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input id="password" v-model="password" type="password" class="form-input" placeholder="••••••••" autocomplete="current-password" />
        </div>

        <button type="submit" class="btn btn-primary w-full auth-submit" :disabled="loading">
          {{ loading ? 'Masuk...' : 'Sign In' }}
        </button>
      </form>

      <div class="auth-card__footer">
        Belum punya akun? <router-link :to="{ name: 'register', query: route.query }">Daftar di sini</router-link>
      </div>
      <div class="auth-card__back">
        <router-link to="/">← Kembali ke situs</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
}

.auth-page__bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at top, rgba(0, 255, 135, 0.08), transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(0, 140, 255, 0.06), transparent 60%),
    repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(0, 255, 135, 0.02) 50px, rgba(0, 255, 135, 0.02) 51px),
    repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(0, 255, 135, 0.02) 50px, rgba(0, 255, 135, 0.02) 51px),
    var(--bg-primary);
  z-index: 0;
}

.auth-card {
  position: relative;
  z-index: 1;
  background: rgba(15, 18, 20, 0.9);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 40px 32px 28px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 255, 135, 0.05);
}

.auth-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: var(--radius-xl);
  padding: 1px;
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.4), transparent 40%, rgba(0, 140, 255, 0.3));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.6;
}

.auth-card__header {
  text-align: center;
  margin-bottom: 28px;
}

.auth-card__icon {
  display: inline-flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.2), rgba(0, 140, 255, 0.1));
  border: 1px solid rgba(0, 255, 135, 0.3);
  color: var(--green-neon);
  margin-bottom: 14px;
}

.auth-card__icon svg { width: 30px; height: 30px; }

.auth-card__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 2rem;
  letter-spacing: 1.5px;
  margin: 0;
}

.auth-card__subtitle {
  color: var(--text-muted);
  font-size: 0.92rem;
  margin-top: 6px;
}

.auth-card__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ff8a8a;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  text-align: center;
}

.auth-submit {
  margin-top: 6px;
  padding: 13px 20px;
  font-size: 1rem;
  letter-spacing: 1px;
}

.auth-card__footer {
  text-align: center;
  margin-top: 22px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.auth-card__footer a {
  color: var(--green-neon);
  font-weight: 600;
}

.auth-card__back {
  text-align: center;
  margin-top: 10px;
  font-size: 0.82rem;
}

.auth-card__back a {
  color: var(--text-muted);
}
</style>
