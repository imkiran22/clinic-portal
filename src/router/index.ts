import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { authService } from '@/features/auth/services/authService'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView'),
    meta: { public: true },
  },
  {
    path: '/contact-admin',
    name: 'contact-admin',
    component: () => import('@/views/ContactAdminView'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppShell'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView'),
      },
      {
        path: 'patients',
        name: 'patients',
        component: () => import('@/views/PatientsView'),
      },
      {
        path: 'patients/:id',
        name: 'patient-detail',
        component: () => import('@/views/PatientDetailView'),
      },
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('@/views/InventoryView'),
      },
      {
        path: 'inventory/:id',
        name: 'inventory-detail',
        component: () => import('@/views/InventoryDetailView'),
      },
      {
        path: 'visits',
        name: 'visits',
        component: () => import('@/views/VisitsView'),
      },
      {
        path: 'visits/new',
        name: 'visit-new',
        component: () => import('@/views/NewVisitView'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView'),
    meta: { public: true },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const session = await authService.getSession(supabase)

  // Authenticated user hitting /login → bounce them to where they belong.
  if (to.name === 'login' && session) {
    const profile = await authService.getProfile(supabase, session.user.id)
    return profile ? { name: 'dashboard' } : { name: 'contact-admin' }
  }

  if (to.meta.public) return true

  if (!session) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const profile = await authService.getProfile(supabase, session.user.id)
  if (!profile) {
    return { name: 'contact-admin' }
  }

  return true
})
