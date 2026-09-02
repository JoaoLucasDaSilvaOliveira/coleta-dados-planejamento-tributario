import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/features/auth/auth.store'

const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('@/pages/LoginPage.vue'), meta: { public: true } },
  { path: '/f', component: () => import('@/pages/PublicFormPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/app/AppLayout.vue'),
    children: [
      { path: '', redirect: '/empresas' },
      { path: 'empresas', component: () => import('@/pages/CompaniesPage.vue') },
      { path: 'empresas/nova', component: () => import('@/pages/CompanyFormPage.vue') },
      {
        path: 'empresas/:companyId/editar',
        component: () => import('@/pages/CompanyFormPage.vue'),
      },
      {
        path: 'empresas/:companyId/envios/:submissionId',
        component: () => import('@/pages/SubmissionDetailPage.vue'),
      },
      { path: 'empresas/:companyId', component: () => import('@/pages/CompanyDetailPage.vue') },
      { path: 'despesas', component: () => import('@/pages/ExpensesPage.vue') },
      { path: 'conteudo-formulario', component: () => import('@/pages/FormContentPage.vue') },
      {
        path: 'auditoria',
        component: () => import('@/pages/AuditPage.vue'),
        meta: { admin: true },
      },
      { path: 'usuarios', component: () => import('@/pages/UsersPage.vue'), meta: { admin: true } },
      { path: 'perfil', component: () => import('@/pages/ProfilePage.vue') },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { public: true },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.initialize()
  if (to.meta.public) return true
  if (!auth.user) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.admin && !auth.isAdmin) return { path: '/empresas' }
  return true
})
