import { defineComponent } from 'vue'

export default defineComponent({
  name: 'VisitsView',
  setup() {
    return () => (
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">Visits</h1>
        <p class="text-sm text-muted-foreground">Visit list arrives in M7.</p>
      </div>
    )
  },
})
