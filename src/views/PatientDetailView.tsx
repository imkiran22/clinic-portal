import { defineComponent } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  name: 'PatientDetailView',
  setup() {
    const route = useRoute()
    return () => (
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">Patient #{route.params.id}</h1>
        <p class="text-sm text-muted-foreground">Profile + visit history arrive in M4 / M7.</p>
      </div>
    )
  },
})
