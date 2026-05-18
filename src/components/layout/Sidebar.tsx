import { defineComponent } from 'vue'
import { RouterLink } from 'vue-router'
import { LayoutDashboard, Users, Package, ClipboardList, X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard }

const items: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/visits', label: 'Visits', icon: ClipboardList },
]

export default defineComponent({
  name: 'Sidebar',
  props: {
    open: { type: Boolean, default: false },
    onClose: { type: Function, default: () => {} },
  },
  setup(props) {
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
          <div class="flex items-center justify-between mb-6">
            <div class="font-semibold tracking-tight">Clinic Portal</div>
            <button
              class="md:hidden p-1 rounded hover:bg-accent"
              onClick={() => props.onClose()}
              aria-label="Close sidebar"
            >
              <X class="size-5" />
            </button>
          </div>
          <nav class="flex flex-col gap-1">
            {items.map((item) => (
              <RouterLink
                key={item.to}
                to={item.to}
                custom
                v-slots={{
                  default: ({
                    navigate,
                    isActive,
                  }: {
                    navigate: () => void
                    isActive: boolean
                  }) => (
                    <a
                      href={item.to}
                      onClick={(e: MouseEvent) => {
                        e.preventDefault()
                        navigate()
                        props.onClose()
                      }}
                      class={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <item.icon class="size-4" />
                      <span>{item.label}</span>
                    </a>
                  ),
                }}
              />
            ))}
          </nav>
        </aside>
      </>
    )
  },
})
