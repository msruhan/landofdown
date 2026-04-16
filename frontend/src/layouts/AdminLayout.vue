<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const loggingOut = ref(false)

const sidebarLinks = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  },
  {
    to: '/admin/matches/create',
    label: 'Input Match',
    icon: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M8 13h8 M8 17h8 M8 9h2',
  },
  {
    to: '/admin/matches/upload',
    label: 'Upload Screenshot',
    icon: 'M4 7h4l2-2h4l2 2h4v12H4z M12 18a4 4 0 1 0 0-8a4 4 0 0 0 0 8z',
  },
  {
    to: '/admin/players',
    label: 'Players',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8a4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  },
  {
    to: '/admin/heroes',
    label: 'Heroes',
    icon: 'M14.5 3l6.5 6.5l-3.5 3.5L11 6.5z M10 7l7 7l-8.5 8.5a2.12 2.12 0 0 1-3 0l-2-2a2.12 2.12 0 0 1 0-3z',
  },
  {
    to: '/admin/roles',
    label: 'Roles',
    icon: 'M12 3l7 4v6c0 5-3.5 8.5-7 10c-3.5-1.5-7-5-7-10V7z M9 12h6 M9 16h4',
  },
]

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}

async function handleLogout() {
  loggingOut.value = true
  await authStore.logout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="admin-layout" :class="{ 'sidebar-collapsed': !appStore.sidebarOpen }">
    <aside class="sidebar" :class="{ open: appStore.mobileMenuOpen }">
      <div class="sidebar__header">
        <router-link to="/admin/dashboard" class="sidebar__logo">
          <span class="sidebar__logo-icon">⚔</span>
          <span v-show="appStore.sidebarOpen" class="sidebar__logo-text">MLBB <span class="text-green">ADMIN</span></span>
        </router-link>
      </div>

      <nav class="sidebar__nav">
        <router-link
          v-for="link in sidebarLinks"
          :key="link.to"
          :to="link.to"
          class="sidebar__link"
          :class="{ active: isActive(link.to) }"
          @click="appStore.closeMobileMenu()"
        >
          <span class="sidebar__link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path :d="link.icon" />
            </svg>
          </span>
          <span v-show="appStore.sidebarOpen" class="sidebar__link-label">{{ link.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar__footer">
        <router-link to="/" class="sidebar__link" @click="appStore.closeMobileMenu()">
          <span class="sidebar__link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18 M12 3a15.3 15.3 0 0 1 4 9a15.3 15.3 0 0 1-4 9a15.3 15.3 0 0 1-4-9a15.3 15.3 0 0 1 4-9z M3 12a9 9 0 0 0 18 0a9 9 0 0 0-18 0z" />
            </svg>
          </span>
          <span v-show="appStore.sidebarOpen" class="sidebar__link-label">View Site</span>
        </router-link>
      </div>
    </aside>

    <div class="admin-main">
      <header class="topbar">
        <button class="topbar__toggle" @click="appStore.toggleSidebar()" aria-label="Toggle sidebar">
          ☰
        </button>
        <button class="topbar__mobile-toggle" @click="appStore.toggleMobileMenu()" aria-label="Toggle mobile menu">
          ☰
        </button>
        <div class="topbar__spacer"></div>
        <div class="topbar__user">
          <span class="topbar__name">{{ authStore.userName }}</span>
          <button class="btn btn-secondary btn-sm" :disabled="loggingOut" @click="handleLogout">
            {{ loggingOut ? 'Logging out...' : 'Logout' }}
          </button>
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </div>

    <div v-if="appStore.mobileMenuOpen" class="sidebar-overlay" @click="appStore.closeMobileMenu()"></div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background: var(--bg-card);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 30;
}

.sidebar-collapsed .sidebar {
  width: 68px;
}

.sidebar__header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-white);
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  white-space: nowrap;
  text-transform: uppercase;
}

.sidebar__logo-icon {
  font-size: 1.05rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 135, 0.25);
  background: rgba(0, 255, 135, 0.06);
}

.sidebar__nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-secondary);
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  transition: all var(--transition);
  white-space: nowrap;
}

.sidebar__link:hover {
  color: var(--text-white);
  background: rgba(0, 255, 135, 0.05);
}

.sidebar__link.active {
  color: var(--green-neon);
  background: rgba(0, 255, 135, 0.08);
  border-left: 3px solid var(--green-neon);
}

.sidebar__link-icon {
  width: 22px;
  height: 22px;
  text-align: center;
  flex-shrink: 0;
  color: #7dd3b0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sidebar__link-icon svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sidebar__link.active .sidebar__link-icon {
  color: var(--green-neon);
}

.sidebar__link-label {
  letter-spacing: 0.4px;
}

.sidebar__footer {
  padding: 12px 8px;
  border-top: 1px solid var(--border-color);
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  height: 60px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.topbar__toggle {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  transition: all var(--transition);
}

.topbar__toggle:hover {
  border-color: var(--green-neon);
  color: var(--green-neon);
}

.topbar__mobile-toggle {
  display: none;
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--radius-md);
}

.topbar__spacer {
  flex: 1;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar__name {
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.admin-content :deep(.page-title) {
  font-family: 'Teko', var(--font-heading);
  font-size: clamp(2.2rem, 5vw, 2.9rem);
  letter-spacing: 1.4px;
  font-weight: 600;
  line-height: 1;
}

.admin-content {
  padding: 32px 24px;
  flex: 1;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -260px;
    top: 0;
    bottom: 0;
    width: 250px;
    transition: left var(--transition);
  }

  .sidebar.open {
    left: 0;
  }

  .sidebar-collapsed .sidebar {
    width: 250px;
    left: -260px;
  }

  .sidebar-collapsed .sidebar.open {
    left: 0;
  }

  .topbar__toggle {
    display: none;
  }

  .topbar__mobile-toggle {
    display: block;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 25;
  }

  .admin-content {
    padding: 20px 16px;
  }
}
</style>
