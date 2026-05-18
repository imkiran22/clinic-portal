import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDark, useToggle } from '@vueuse/core'
import { Menu, LogOut, Sun, Moon } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { authService } from '@/features/auth/services/authService'
import { useAuth } from '@/features/auth/composables/useAuth'

export default defineComponent({
  name: 'Topbar',
  props: {
    onToggleSidebar: { type: Function, default: () => {} },
  },
  setup(props) {
    const router = useRouter()
    const { profile } = useAuth()
    const signingOut = ref(false)

    const isDark = useDark({
      storageKey: 'clinic-color-mode',
      selector: 'html',
      attribute: 'class',
      valueDark: 'dark',
      valueLight: '',
    })
    const toggleDark = useToggle(isDark)

    const signOut = async () => {
      if (signingOut.value) return
      signingOut.value = true
      try {
        await authService.signOut(supabase)
        router.push({ name: 'login' })
      } catch (err) {
        const message = (err as { message?: string })?.message ?? 'Sign out failed'
        toast.error(message)
      } finally {
        signingOut.value = false
      }
    }

    return () => (
      <header class="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
        <button
          type="button"
          class="md:hidden p-2 rounded hover:bg-accent"
          onClick={() => props.onToggleSidebar()}
          aria-label="Open sidebar"
        >
          <Menu class="size-5" />
        </button>
        <div class="flex-1" />
        <div class="flex items-center gap-2">
          {profile.value && (
            <div class="hidden sm:flex flex-col text-right leading-tight">
              <span class="text-sm font-medium">{profile.value.display_name}</span>
              <span class="text-xs text-muted-foreground capitalize">
                {profile.value.role}
              </span>
            </div>
          )}
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
            onClick={signOut}
            disabled={signingOut.value}
            class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut class="size-4" />
            <span class="hidden sm:inline">{signingOut.value ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </header>
    )
  },
})
