<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)

const baseNavLinks = [
  {
    to: '/',
    label: 'Dashboard',
    icon: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  },
  {
    to: '/ranking',
    label: 'Ranking',
    icon: 'M8 21h8 M12 17v4 M7 4h10v3a5 5 0 0 1-5 5a5 5 0 0 1-5-5z M7 7H5a2 2 0 0 0 2 2 M17 7h2a2 2 0 0 1-2 2',
  },
  {
    to: '/statistics',
    label: 'Statistics',
    icon: 'M4 19h16 M7 16V9 M12 16V5 M17 16v-3',
  },
  {
    to: '/battle',
    label: 'Battle',
    icon: 'M14.5 17.5L3 6V3h3l11.5 11.5 M13 19l6-6 M16 16l4 4 M19 21l2-2 M14.5 6.5l1-1l3 3l-1 1',
  },
  {
    to: '/head-to-head',
    label: 'H2H',
    icon: 'M12 3v18 M5 8l7-5 7 5 M5 16l7 5 7-5',
  },
]

const mabarLink = {
  to: '/mabar',
  label: 'Mabar',
  // joystick / gamepad style icon
  icon: 'M6 12h4 M8 10v4 M15 12h.01 M17 14h.01 M7 16h10a5 5 0 0 0 5-5a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5a5 5 0 0 0 5 5z',
  pulse: true,
}

const navLinks = computed(() => auth.isAuthenticated ? [...baseNavLinks, mabarLink] : baseNavLinks)

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

async function handleLogout() {
  userMenuOpen.value = false
  await auth.logout()
  router.push('/')
}

onMounted(() => {
  if (auth.isAuthenticated && !auth.user) {
    auth.fetchUser()
  }
})
</script>

<template>
  <div class="public-layout bg-grid-pattern" :class="{ 'public-layout--immersive': route.meta.hideChrome }">
    <header v-if="!route.meta.hideChrome" class="navbar">
      <div class="navbar__inner">
        <router-link to="/" class="navbar__logo">
          <span class="navbar__logo-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M14.5 3l6.5 6.5l-3.5 3.5L11 6.5z M10 7l7 7l-8.5 8.5a2.12 2.12 0 0 1-3 0l-2-2a2.12 2.12 0 0 1 0-3z" />
            </svg>
          </span>
          <span class="navbar__logo-text">MLBB <span class="gradient-text">STATS</span></span>
        </router-link>

        <nav class="navbar__nav" :class="{ open: mobileMenuOpen }">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="navbar__link"
            :class="{ active: isActive(link.to), 'navbar__link--mabar': link.to === '/mabar' }"
            @click="mobileMenuOpen = false"
          >
            <span class="navbar__link-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path :d="link.icon" />
              </svg>
            </span>
            {{ link.label }}
            <span v-if="link.to === '/mabar'" class="navbar__link-dot" aria-hidden="true"></span>
          </router-link>

          <template v-if="!auth.isAuthenticated">
            <router-link to="/login" class="navbar__link navbar__link--auth" @click="mobileMenuOpen = false">
              Login
            </router-link>
            <router-link to="/register" class="navbar__link navbar__link--signup" @click="mobileMenuOpen = false">
              Join Squad
            </router-link>
          </template>

          <div v-else class="navbar__user" @click.stop>
            <button class="navbar__user-btn" @click="userMenuOpen = !userMenuOpen">
              <span class="navbar__user-avatar">
                <img v-if="auth.userAvatar" :src="auth.userAvatar" :alt="auth.userName" />
                <span v-else>{{ auth.userName.charAt(0).toUpperCase() }}</span>
              </span>
              <span class="navbar__user-name">{{ auth.userName }}</span>
              <span v-if="auth.isAdmin" class="navbar__user-badge">ADMIN</span>
              <svg class="navbar__user-caret" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div v-if="userMenuOpen" class="navbar__user-menu" @click="userMenuOpen = false">
              <router-link to="/mabar" class="navbar__user-item">My Mabar</router-link>
              <router-link v-if="auth.isAdmin" to="/admin/dashboard" class="navbar__user-item">Admin Panel</router-link>
              <button class="navbar__user-item navbar__user-item--danger" @click="handleLogout">Logout</button>
            </div>
          </div>
        </nav>

        <button class="navbar__hamburger" @click="mobileMenuOpen = !mobileMenuOpen" :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'">
          <span :class="{ open: mobileMenuOpen }"></span>
        </button>
      </div>
      <div class="navbar__glow-line"></div>
    </header>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer v-if="!route.meta.hideChrome" class="footer">
      <div class="footer__glow-line"></div>
      <div class="footer__inner">
        <div class="footer__brand">
          <span class="footer__logo">⚔ MLBB <span class="gradient-text">STATS</span></span>
          <span class="footer__tagline">Competitive match tracking & analytics</span>
        </div>
        <div class="footer__links">
          <router-link to="/" class="footer__link animated-underline">Dashboard</router-link>
          <router-link to="/ranking" class="footer__link animated-underline">Ranking</router-link>
          <router-link to="/statistics" class="footer__link animated-underline">Statistics</router-link>
          <router-link to="/battle" class="footer__link animated-underline">Battle</router-link>
          <router-link to="/head-to-head" class="footer__link animated-underline">H2H</router-link>
        </div>
        <div class="footer__bottom">
          <span>© {{ new Date().getFullYear() }} MLBB Stats Tracker</span>
          <span class="footer__divider">·</span>
          <span class="text-muted">Built for competitive tracking</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Page transitions */
.page-fade-enter-active {
  animation: scale-in 0.35s ease;
}
.page-fade-leave-active {
  animation: fade-in 0.2s ease reverse;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(10, 10, 10, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-color);
}

.navbar__glow-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--green-neon), transparent);
  opacity: 0.5;
}

.navbar__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-white);
  font-family: 'Teko', var(--font-heading);
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.navbar__logo-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #7dd3b0;
  animation: pulse-scale 3s ease-in-out infinite;
  filter: drop-shadow(0 0 6px rgba(0, 255, 135, 0.4));
}

.navbar__logo-icon svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.navbar__nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navbar__link {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  transition: all var(--transition);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}

.navbar__link-icon {
  width: 16px;
  height: 16px;
  color: #8aa39a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.navbar__link-icon svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.navbar__link.active .navbar__link-icon {
  color: var(--green-neon);
}

.navbar__link:hover {
  color: var(--text-white);
  background: rgba(0, 255, 135, 0.05);
}

.navbar__link.active {
  color: var(--green-neon);
  background: rgba(0, 255, 135, 0.08);
}

.navbar__link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: var(--green-neon);
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(0, 255, 135, 0.5);
}

.navbar__link--auth {
  margin-left: 12px;
  border: 1px solid var(--border-color);
  font-size: 0.95rem;
}

.navbar__link--auth:hover {
  border-color: var(--green-neon);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.15);
}

.navbar__link--signup {
  margin-left: 4px;
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.14), rgba(0, 255, 180, 0.04));
  border: 1px solid rgba(0, 255, 135, 0.55);
  color: var(--green-neon);
  font-size: 0.95rem;
}

.navbar__link--signup:hover {
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.2), rgba(0, 255, 180, 0.1));
  box-shadow: 0 0 16px rgba(0, 255, 135, 0.3);
  color: #b8ffd7;
}

.navbar__link--mabar {
  position: relative;
}

.navbar__link-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff3d7f;
  box-shadow: 0 0 10px rgba(255, 61, 127, 0.9);
  margin-left: 4px;
  animation: pulse-scale 1.4s ease-in-out infinite;
}

.navbar__user {
  position: relative;
  margin-left: 12px;
}

.navbar__user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 5px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-white);
  cursor: pointer;
  transition: all var(--transition);
}

.navbar__user-btn:hover {
  border-color: var(--green-neon);
  box-shadow: 0 0 12px rgba(0, 255, 135, 0.2);
}

.navbar__user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ff87, #0077ff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: 800;
  font-size: 0.8rem;
  overflow: hidden;
}

.navbar__user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.navbar__user-name {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.02rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  max-width: 120px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.navbar__user-badge {
  background: rgba(255, 180, 0, 0.15);
  color: #ffd86b;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 180, 0, 0.3);
}

.navbar__user-caret {
  width: 14px;
  height: 14px;
  color: var(--text-secondary);
}

.navbar__user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: rgba(15, 18, 20, 0.98);
  backdrop-filter: blur(18px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  z-index: 50;
  animation: fade-in 0.18s ease;
}

.navbar__user-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 11px 16px;
  color: var(--text-white);
  font-size: 0.88rem;
  text-decoration: none;
  cursor: pointer;
  transition: background var(--transition);
  font-family: inherit;
}

.navbar__user-item:hover {
  background: rgba(0, 255, 135, 0.08);
}

.navbar__user-item--danger {
  color: #ff6b6b;
  border-top: 1px solid var(--border-subtle);
}

.navbar__user-item--danger:hover {
  background: rgba(255, 80, 80, 0.12);
}

.navbar__hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  position: relative;
}

.navbar__hamburger span,
.navbar__hamburger span::before,
.navbar__hamburger span::after {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--text-primary);
  position: absolute;
  transition: all 0.3s ease;
  left: 4px;
}

.navbar__hamburger span { top: 15px; }
.navbar__hamburger span::before { content: ''; top: -7px; }
.navbar__hamburger span::after { content: ''; top: 7px; }

.navbar__hamburger span.open { background: transparent; }
.navbar__hamburger span.open::before { top: 0; transform: rotate(45deg); }
.navbar__hamburger span.open::after { top: 0; transform: rotate(-45deg); }

.main-content {
  flex: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

.footer {
  margin-top: auto;
  border-top: 1px solid var(--border-color);
}

.footer__glow-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--green-neon), transparent);
  opacity: 0.3;
}

.footer__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.footer__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.footer__logo {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-white);
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.footer__tagline {
  font-family: 'Teko', var(--font-heading);
  font-size: 1rem;
  color: #8ca39a;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  line-height: 1;
}

.footer__links {
  display: flex;
  gap: 24px;
}

.footer__link {
  font-family: 'Teko', var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  transition: color var(--transition);
}

.footer__link:hover {
  color: var(--green-neon);
}

.footer__bottom {
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-secondary);
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
  width: 100%;
  letter-spacing: 0.35px;
}

.footer__divider {
  margin: 0 8px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .navbar__hamburger {
    display: block;
  }

  .navbar__nav {
    display: none;
    position: absolute;
    top: 64px;
    left: 0;
    right: 0;
    background: rgba(10, 10, 10, 0.97);
    backdrop-filter: blur(12px);
    flex-direction: column;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    gap: 4px;
  }

  .navbar__nav.open {
    display: flex;
  }

  .navbar__link {
    width: 100%;
    padding: 12px 16px;
  }

  .navbar__link.active::after {
    display: none;
  }

  .navbar__link--auth,
  .navbar__link--signup {
    margin-left: 0;
    margin-top: 8px;
    text-align: center;
    justify-content: center;
  }

  .navbar__user {
    margin-left: 0;
    margin-top: 10px;
  }

  .navbar__user-btn {
    width: 100%;
  }

  .navbar__user-menu {
    position: static;
    width: 100%;
    margin-top: 6px;
  }

  .footer__links {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
