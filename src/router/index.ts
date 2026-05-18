import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

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

// Auth + profile guard. Wired in M3 when Supabase is configured.
// For M1, all routes pass through so dev navigation works without credentials.
router.beforeEach(async (to) => {
  if (to.meta.public) return true
  // M3 will check session + profile here and redirect to /login or /contact-admin.
  return true
})
