import { defineComponent } from 'vue'
import { useDark, useToggle } from '@vueuse/core'
import { Menu, LogOut, Sun, Moon } from 'lucide-vue-next'

export default defineComponent({
  name: 'Topbar',
  props: {
    onToggleSidebar: { type: Function, default: () => {} },
  },
  setup(props) {
    const isDark = useDark({
      storageKey: 'clinic-color-mode',
      selector: 'html',
      attribute: 'class',
      valueDark: 'dark',
      valueLight: '',
    })
    const toggleDark = useToggle(isDark)

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
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => toggleDark()}
            aria-label={isDark.value ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark.value ? 'Light mode' : 'Dark mode'}
          >
            {isDark.value ? <Sun class="size-4" /> : <Moon class="size-4" />}
          </button>
          <button
            type="button"
            class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Sign out"
            disabled
            title="Sign-out wires in M3"
          >
            <LogOut class="size-4" />
            <span class="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
    )
  },
})
