import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

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
          path: 'drafts',
          name: 'drafts',
          component: () => import('@/pages/public/DraftsPage.vue'),
        },
        {
          path: 'meta',
          name: 'meta',
          component: () => import('@/pages/public/MetaPage.vue'),
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
      ],
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/pages/admin/LoginPage.vue'),
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
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

router.beforeEach((to, _from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth) {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      next({ name: 'admin-login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
