import { defineComponent } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  name: 'InventoryDetailView',
  setup() {
    const route = useRoute()
    return () => (
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">Product #{route.params.id}</h1>
        <p class="text-sm text-muted-foreground">Product detail + movement history arrive in M5.</p>
      </div>
    )
  },
})
