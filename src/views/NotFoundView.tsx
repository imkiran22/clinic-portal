import { defineComponent } from 'vue'
import { RouterLink } from 'vue-router'

export default defineComponent({
  name: 'NotFoundView',
  setup() {
    return () => (
      <div class="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 class="text-2xl font-semibold">Page not found</h1>
        <p class="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <RouterLink
          to="/dashboard"
          class="text-sm underline text-primary hover:text-primary/80"
        >
          Go to dashboard
        </RouterLink>
      </div>
    )
  },
})
