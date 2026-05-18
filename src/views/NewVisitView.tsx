import { defineComponent } from 'vue'

export default defineComponent({
  name: 'NewVisitView',
  setup() {
    return () => (
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">New Visit</h1>
        <p class="text-sm text-muted-foreground">
          Patient picker + prescribed-products multi-row arrives in M7. Submit will call
          <code class="ml-1 px-1 rounded bg-muted text-xs">create_visit_with_prescriptions</code>.
        </p>
      </div>
    )
  },
})
