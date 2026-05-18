import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LoginView',
  setup() {
    return () => (
      <div class="min-h-screen flex items-center justify-center bg-background p-6">
        <div class="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 class="text-xl font-semibold tracking-tight mb-2">Clinic Portal</h1>
          <p class="text-sm text-muted-foreground mb-6">
            Sign-in form wires in M3 with Supabase Auth.
          </p>
          <div class="space-y-3">
            <div>
              <label class="text-sm font-medium" for="email">Email</label>
              <input
                id="email"
                type="email"
                disabled
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
                placeholder="staff@clinic.com"
              />
            </div>
            <div>
              <label class="text-sm font-medium" for="password">Password</label>
              <input
                id="password"
                type="password"
                disabled
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              disabled
              class="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    )
  },
})
