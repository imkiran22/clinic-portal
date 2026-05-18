import { defineComponent } from 'vue'

const cards = [
  { title: 'Low Stock', hint: 'Products at or below reorder level' },
  { title: 'Expiring Soon', hint: 'Within next 60 days' },
  { title: "Today's Follow-ups", hint: 'Patients due back today' },
  { title: 'Recent Sales', hint: 'Last 10 product sales' },
]

export default defineComponent({
  name: 'DashboardView',
  setup() {
    return () => (
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.title} class="rounded-lg border border-border bg-card p-4">
              <div class="text-sm font-medium">{c.title}</div>
              <div class="text-xs text-muted-foreground mt-1">{c.hint}</div>
              <div class="mt-4 text-2xl font-semibold tabular-nums">—</div>
            </div>
          ))}
        </div>
        <p class="text-sm text-muted-foreground">Cards populate in M8.</p>
      </div>
    )
  },
})
