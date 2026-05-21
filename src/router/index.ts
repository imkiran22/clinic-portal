import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'

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
        path: 'categories',
        name: 'categories',
        component: () => import('@/views/CategoriesView'),
      },
      {
        path: 'suppliers',
        name: 'suppliers',
        component: () => import('@/views/SuppliersView'),
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
      {
        path: 'sales',
        name: 'sales',
        component: () => import('@/views/SalesView'),
      },
      {
        path: 'help',
        name: 'help',
        component: () => import('@/views/HelpView'),
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

// Auth state is loaded once at app start by useAuth() and kept in sync via
// onAuthStateChange. The guard reads from those refs — no per-nav network
// call. Earlier code awaited getSession() + getProfile() on every nav, which
// could stall a sidebar click after the page sat idle and Supabase's
// underlying connection went sleepy.
const auth = useAuth()

async function waitForAuthReady(): Promise<void> {
  if (auth.ready.value) return
  await new Promise<void>((resolve) => {
    const stop = watch(auth.ready, (isReady) => {
      if (isReady) {
        stop()
        resolve()
      }
    })
  })
}

router.beforeEach(async (to) => {
  await waitForAuthReady()
  const session = auth.session.value
  const profile = auth.profile.value

  // Authenticated user hitting /login → bounce them to where they belong.
  if (to.name === 'login' && session) {
    return profile ? { name: 'dashboard' } : { name: 'contact-admin' }
  }

  if (to.meta.public) return true

  if (!session) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!profile) {
    return { name: 'contact-admin' }
  }

  return true
})
