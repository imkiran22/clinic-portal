import { defineComponent } from 'vue'
import { Menu, LogOut } from 'lucide-vue-next'

export default defineComponent({
  name: 'Topbar',
  props: {
    onToggleSidebar: { type: Function, default: () => {} },
  },
  setup(props) {
    return () => (
      <header class="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
        <button
          class="md:hidden p-2 rounded hover:bg-accent"
          onClick={() => props.onToggleSidebar()}
          aria-label="Open sidebar"
        >
          <Menu class="size-5" />
        </button>
        <div class="flex-1" />
        <button
          class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Sign out"
          disabled
          title="Sign-out wires in M3"
        >
          <LogOut class="size-4" />
          <span>Sign out</span>
        </button>
      </header>
    )
  },
})
