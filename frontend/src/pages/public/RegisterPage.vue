<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const name = ref('')
const username = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!name.value || !email.value || !password.value) {
    error.value = 'Nama, email, dan password wajib diisi.'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Password minimal 6 karakter.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'Konfirmasi password tidak cocok.'
    return
  }

  loading.value = true
  try {
    await auth.register({
      name: name.value,
      username: username.value || null,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirm.value,
    })
    const redirect = (route.query.redirect as string) || '/mabar'
    router.push(redirect)
  } catch {
    error.value = auth.error || 'Pendaftaran gagal. Coba lagi.'
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8 M19 8v6 M22 11h-6" />
          </svg>
        </span>
        <h1 class="auth-card__title">Join the <span class="gradient-text">Squad</span></h1>
        <p class="auth-card__subtitle">Bikin akun & langsung cari teman mabar tonight</p>
      </div>

      <form @submit.prevent="submit" class="auth-card__form">
        <div v-if="error" class="auth-error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label" for="name">Nama lengkap</label>
          <input id="name" v-model="name" type="text" class="form-input" placeholder="Your name" autocomplete="name" />
        </div>

        <div class="form-group">
          <label class="form-label" for="username">Username gamer (opsional)</label>
          <input id="username" v-model="username" type="text" class="form-input" placeholder="e.g. NightStalker" autocomplete="username" />
        </div>

        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input id="email" v-model="email" type="email" class="form-input" placeholder="you@email.com" autocomplete="email" />
        </div>

        <div class="form-group form-group--split">
          <div>
            <label class="form-label" for="password">Password</label>
            <input id="password" v-model="password" type="password" class="form-input" placeholder="min 6 karakter" autocomplete="new-password" />
          </div>
          <div>
            <label class="form-label" for="password_confirm">Konfirmasi</label>
            <input id="password_confirm" v-model="passwordConfirm" type="password" class="form-input" placeholder="ulangi password" autocomplete="new-password" />
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-full auth-submit" :disabled="loading">
          {{ loading ? 'Mendaftarkan...' : 'Create Account' }}
        </button>
      </form>

      <div class="auth-card__footer">
        Sudah punya akun? <router-link :to="{ name: 'login', query: route.query }">Login</router-link>
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
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 255, 135, 0.05);
}

.auth-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: var(--radius-xl);
  padding: 1px;
  background: linear-gradient(135deg, rgba(0, 140, 255, 0.4), transparent 40%, rgba(0, 255, 135, 0.3));
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
  background: linear-gradient(135deg, rgba(0, 140, 255, 0.2), rgba(0, 255, 135, 0.1));
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
  gap: 16px;
}

.form-group--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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

@media (max-width: 480px) {
  .form-group--split {
    grid-template-columns: 1fr;
  }
}
</style>
