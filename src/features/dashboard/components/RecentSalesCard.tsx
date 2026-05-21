import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import DashboardCard from './DashboardCard'
import { useRecentSales } from '../composables/useDashboard'

function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.round((now - then) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`
  const days = Math.round(diffSec / 86400)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default defineComponent({
  name: 'RecentSalesCard',
  setup() {
    const router = useRouter()
    const { data, isLoading, error } = useRecentSales()

    return () => {
      const rows = data.value ?? []
      // The card only ever loads `limit` rows — no separate count query.
      // The badge shows how many of those came back, not lifetime total.
      return (
        <DashboardCard
          title="Recent sales"
          hint="Latest 10 dispenses"
          count={rows.length}
          loading={isLoading.value}
          errorMessage={(error.value as { message?: string } | null)?.message ?? (error.value ? "Failed to load" : "")}
          accent="default"
          viewAllLabel="View all sales"
          onViewAll={() => router.push({ name: 'sales' })}
        >
          {{
            empty: () => 'No sales yet.',
            default: () => (
              <ul class="divide-y divide-border">
                {rows.map((m) => {
                  const qty = Math.abs(m.quantity)
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (m.product?.id)
                            router.push({
                              name: 'inventory-detail',
                              params: { id: m.product.id },
                            })
                        }}
                        disabled={!m.product?.id}
                        class="w-full px-2 py-2 text-left hover:bg-accent rounded-md flex items-start justify-between gap-3 disabled:opacity-60 disabled:cursor-default"
                      >
                        <div class="min-w-0">
                          <div class="text-sm truncate">
                            {m.product?.name ?? '—'}
                          </div>
                          <div class="text-xs text-muted-foreground truncate">
                            {m.patient?.name ?? 'Walk-in'}
                          </div>
                        </div>
                        <div class="text-xs tabular-nums text-right shrink-0">
                          <div class="font-medium">×{qty}</div>
                          <div class="text-muted-foreground">
                            {fmtRelative(m.created_at)}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ),
          }}
        </DashboardCard>
      )
    }
  },
})
