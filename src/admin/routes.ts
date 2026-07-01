import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/admin/layouts/AdminLayout.vue'),
    children: [
      { path: '', redirect: '/overview' },
      { path: 'overview', name: 'overview', component: () => import('src/admin/pages/OverviewPage.vue') },
      { path: 'knowledge-bases', name: 'kb', component: () => import('src/admin/pages/KnowledgeBasesPage.vue') },
      { path: 'departments', name: 'departments', component: () => import('src/admin/pages/DepartmentsPage.vue') },
      { path: 'providers', name: 'providers', component: () => import('src/admin/pages/ProvidersPage.vue') },
      { path: 'models', name: 'models', component: () => import('src/admin/pages/ModelsPage.vue') },
      { path: 'settings', name: 'settings', component: () => import('src/admin/pages/SettingsPage.vue') },
      { path: 'users', name: 'users', component: () => import('src/admin/pages/UsersPage.vue') }
    ]
  },
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: '', name: 'auth', component: () => import('pages/AuthPage.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
