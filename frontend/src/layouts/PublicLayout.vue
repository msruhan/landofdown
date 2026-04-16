<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileMenuOpen = ref(false)

const navLinks = [
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
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <div class="public-layout bg-grid-pattern">
    <header class="navbar">
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
            :class="{ active: isActive(link.to) }"
            @click="mobileMenuOpen = false"
          >
            <span class="navbar__link-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path :d="link.icon" />
              </svg>
            </span>
            {{ link.label }}
          </router-link>
          <router-link to="/admin/login" class="navbar__link navbar__link--admin" @click="mobileMenuOpen = false">
            Admin
          </router-link>
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

    <footer class="footer">
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

.navbar__link--admin {
  margin-left: 12px;
  border: 1px solid var(--border-color);
  font-size: 0.95rem;
}

.navbar__link--admin:hover {
  border-color: var(--green-neon);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.15);
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

  .navbar__link--admin {
    margin-left: 0;
    margin-top: 8px;
    text-align: center;
  }

  .footer__links {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
