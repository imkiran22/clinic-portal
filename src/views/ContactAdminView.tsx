import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ContactAdminView',
  setup() {
    return () => (
      <div class="min-h-screen flex items-center justify-center p-6">
        <div class="max-w-md text-center space-y-3">
          <h1 class="text-xl font-semibold">Account not provisioned</h1>
          <p class="text-sm text-muted-foreground">
            Your user exists but isn't linked to a clinic yet. Please contact your administrator
            to complete onboarding.
          </p>
        </div>
      </div>
    )
  },
})
