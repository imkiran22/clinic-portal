import { defineComponent, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { authService } from '@/features/auth/services/authService'

const schema = z.object({
  email: z.string().min(1, 'Email required').email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

type FieldErrors = Partial<Record<'email' | 'password', string>>

export default defineComponent({
  name: 'LoginView',
  setup() {
    const router = useRouter()
    const route = useRoute()

    const email = ref('')
    const password = ref('')
    const errors = ref<FieldErrors>({})
    const loading = ref(false)
    const serverError = ref<string | null>(null)

    const onSubmit = async (e: Event) => {
      e.preventDefault()
      serverError.value = null

      const parsed = schema.safeParse({ email: email.value, password: password.value })
      if (!parsed.success) {
        const next: FieldErrors = {}
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof FieldErrors
          if (!next[key]) next[key] = issue.message
        }
        errors.value = next
        return
      }
      errors.value = {}
      loading.value = true

      try {
        await authService.signIn(supabase, parsed.data.email, parsed.data.password)
        const redirect = (route.query.redirect as string | undefined) ?? '/dashboard'
        router.push(redirect)
      } catch (err) {
        const message = (err as { message?: string })?.message ?? 'Sign in failed'
        serverError.value = message
        toast.error(message)
      } finally {
        loading.value = false
      }
    }

    return () => (
      <div class="min-h-screen flex items-center justify-center bg-background p-6">
        <form
          onSubmit={onSubmit}
          class="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm space-y-5"
          novalidate
        >
          <div class="flex flex-col items-center text-center">
            <img
              src="/logo.webp"
              alt="Define Skin Hair & Laser Clinic"
              class="size-16 rounded-lg object-contain bg-black mb-3"
            />
            <h1 class="text-lg font-semibold tracking-tight leading-tight">
              Define Skin Hair &amp; Laser Clinic
            </h1>
            <p class="text-sm text-muted-foreground mt-1">Sign in to continue.</p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-sm font-medium" for="email">Email</label>
              <input
                id="email"
                type="email"
                autocomplete="email"
                value={email.value}
                onInput={(e: Event) => (email.value = (e.target as HTMLInputElement).value)}
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@clinic.com"
              />
              {errors.value.email && (
                <p class="mt-1 text-xs text-destructive">{errors.value.email}</p>
              )}
            </div>

            <div>
              <label class="text-sm font-medium" for="password">Password</label>
              <input
                id="password"
                type="password"
                autocomplete="current-password"
                value={password.value}
                onInput={(e: Event) => (password.value = (e.target as HTMLInputElement).value)}
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.value.password && (
                <p class="mt-1 text-xs text-destructive">{errors.value.password}</p>
              )}
            </div>
          </div>

          {serverError.value && (
            <p class="text-sm text-destructive" role="alert">
              {serverError.value}
            </p>
          )}

          <button
            type="submit"
            disabled={loading.value}
            class="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading.value ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  },
})
