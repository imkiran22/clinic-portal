import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PatientsView',
  setup() {
    return () => (
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">Patients</h1>
        <p class="text-sm text-muted-foreground">Patient list, search, and CRUD arrive in M4.</p>
      </div>
    )
  },
})
