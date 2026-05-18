import { defineComponent } from 'vue'

export default defineComponent({
  name: 'InventoryView',
  setup() {
    return () => (
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p class="text-sm text-muted-foreground">Product list and movements arrive in M5 / M6.</p>
      </div>
    )
  },
})
