import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'chat', component: () => import('pages/ChatPage.vue') },
      { path: 'account', name: 'account', component: () => import('pages/AccountPage.vue') },
      { path: 'doc/:id', name: 'document', component: () => import('pages/DocumentPage.vue') }
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
