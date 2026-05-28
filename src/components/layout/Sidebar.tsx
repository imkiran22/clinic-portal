import { computed, defineComponent } from 'vue'
import { RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  CalendarClock,
  CircleHelp,
  Tags,
  Truck,
  ShoppingCart,
  ArrowRightLeft,
  X,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { useCan } from '@/features/auth/composables/useCan'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  privileged?: boolean
}

const items: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  // Appointments lives right under Dashboard — it's the screen staff
  // open first thing in the morning to see today's roster.
  { to: '/appointments', label: 'Appointments', icon: CalendarClock },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tags, privileged: true },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, privileged: true },
  { to: '/visits', label: 'Visits', icon: ClipboardList },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/movements', label: 'Movements', icon: ArrowRightLeft },
  { to: '/help', label: 'Help', icon: CircleHelp },
]

export default defineComponent({
  name: 'Sidebar',
  props: {
    open: { type: Boolean, default: false },
    onClose: { type: Function, default: () => {} },
  },
  setup(props) {
    const { canManageProducts } = useCan()
    const visibleItems = computed(() =>
      items.filter((it) => !it.privileged || canManageProducts.value),
    )
    return () => (
      <>
        {props.open && (
          <div
            class="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => props.onClose()}
          />
        )}

        <aside
          class={cn(
            'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border p-4 transition-transform md:static md:translate-x-0',
            props.open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div class="flex items-start justify-between mb-6 gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <img
                src="/logo.webp"
                alt="Define Skin Hair & Laser Clinic"
                class="size-9 rounded-md shrink-0 object-contain bg-black"
              />
              <div class="font-semibold tracking-tight text-sm leading-tight min-w-0">
                Define Skin Hair &amp; Laser Clinic
              </div>
            </div>
            <button
              class="md:hidden p-1 rounded hover:bg-accent shrink-0"
              onClick={() => props.onClose()}
              aria-label="Close sidebar"
            >
              <X class="size-5" />
            </button>
          </div>
          <nav class="flex flex-col gap-1">
            {visibleItems.value.map((item) => (
              <RouterLink
                key={item.to}
                to={item.to}
                onClick={() => props.onClose()}
                activeClass="bg-accent text-accent-foreground"
                class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon class="size-4" />
                <span>{item.label}</span>
              </RouterLink>
            ))}
          </nav>
        </aside>
      </>
    )
  },
})
