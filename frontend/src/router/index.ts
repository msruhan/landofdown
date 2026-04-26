import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/pages/public/DashboardPage.vue'),
        },
        {
          path: 'dashboard',
          name: 'dashboard-alias',
          component: () => import('@/pages/public/DashboardPage.vue'),
        },
        {
          path: 'ranking',
          name: 'ranking',
          component: () => import('@/pages/public/RankingPage.vue'),
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: () => import('@/pages/public/StatisticsPage.vue'),
        },
        {
          path: 'battle',
          name: 'battle',
          component: () => import('@/pages/public/BattlePage.vue'),
        },
        {
          path: 'head-to-head',
          name: 'head-to-head',
          component: () => import('@/pages/public/HeadToHeadPage.vue'),
        },
        {
          path: 'matches/:id',
          name: 'match-detail',
          component: () => import('@/pages/public/MatchDetailPage.vue'),
        },
        {
          path: 'mabar',
          name: 'mabar',
          component: () => import('@/pages/public/MabarLoungePage.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'mabar/room/:id',
          name: 'mabar-room',
          component: () => import('@/pages/public/MabarRoomPage.vue'),
          meta: { requiresAuth: true, hideChrome: true },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/public/LoginPage.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/public/RegisterPage.vue'),
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/pages/admin/LoginPage.vue'),
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/pages/admin/AdminDashboardPage.vue'),
        },
        {
          path: 'matches/create',
          name: 'match-create',
          component: () => import('@/pages/admin/MatchCreatePage.vue'),
        },
        {
          path: 'matches/upload',
          name: 'match-upload',
          component: () => import('@/pages/admin/MatchUploadPage.vue'),
        },
        {
          path: 'matches/:id/edit',
          name: 'match-edit',
          component: () => import('@/pages/admin/MatchEditPage.vue'),
        },
        {
          path: 'players',
          name: 'admin-players',
          component: () => import('@/pages/admin/PlayerManagementPage.vue'),
        },
        {
          path: 'heroes',
          name: 'admin-heroes',
          component: () => import('@/pages/admin/HeroManagementPage.vue'),
        },
        {
          path: 'roles',
          name: 'admin-roles',
          component: () => import('@/pages/admin/RoleManagementPage.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)

  const token = localStorage.getItem('auth_token')

  if (!requiresAuth) {
    return next()
  }

  if (!token) {
    const loginRoute = requiresAdmin ? 'admin-login' : 'login'
    return next({ name: loginRoute, query: { redirect: to.fullPath } })
  }

  // Ensure user info loaded
  const auth = useAuthStore()
  if (!auth.user) {
    try {
      await auth.fetchUser()
    } catch {
      // ignore
    }
  }

  if (requiresAdmin && !auth.isAdmin) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
