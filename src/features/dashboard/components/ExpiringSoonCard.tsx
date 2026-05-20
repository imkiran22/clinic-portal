import { computed, defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import DashboardCard from './DashboardCard'
import { useExpiringSoon } from '../composables/useDashboard'

function daysUntil(isoDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(isoDate + 'T00:00:00')
  const diff = target.getTime() - today.getTime()
  return Math.round(diff / 86_400_000)
}

function fmtDay(isoDate: string): string {
  try {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString()
  } catch {
    return isoDate
  }
}

export default defineComponent({
  name: 'ExpiringSoonCard',
  setup() {
    const router = useRouter()
    const { data, isLoading, error } = useExpiringSoon()

    const accent = computed(() => {
      const rows = data.value?.rows ?? []
      if (rows.length === 0) return 'default' as const
      const minDays = Math.min(...rows.map((r) => daysUntil(r.expiry_date)))
      return minDays <= 14 ? ('danger' as const) : ('warn' as const)
    })

    return () => (
      <DashboardCard
        title="Expiring soon"
        hint="Within 60 days, with stock"
        count={data.value?.total ?? null}
        loading={isLoading.value}
        errorMessage={(error.value as { message?: string } | null)?.message ?? (error.value ? "Failed to load" : "")}
        accent={accent.value}
        viewAllLabel={
          (data.value?.total ?? 0) > 5
            ? `View all ${data.value!.total} in inventory`
            : 'Open inventory'
        }
        onViewAll={() => router.push({ name: 'inventory' })}
      >
        {{
          empty: () => 'No batches expiring soon.',
          default: () => (
            <ul class="divide-y divide-border">
              {(data.value?.rows ?? []).map((p) => {
                const days = daysUntil(p.expiry_date)
                const urgent = days <= 14
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push({
                          name: 'inventory-detail',
                          params: { id: p.id },
                        })
                      }
                      class="w-full px-2 py-2 text-left hover:bg-accent rounded-md flex items-start justify-between gap-3"
                    >
                      <div class="min-w-0">
                        <div class="text-sm truncate">{p.name}</div>
                        {p.batch_number && (
                          <div class="text-xs text-muted-foreground truncate">
                            Batch {p.batch_number}
                          </div>
                        )}
                      </div>
                      <div class="text-xs tabular-nums shrink-0 text-right">
                        <div
                          class={
                            urgent
                              ? 'font-semibold text-red-700 dark:text-red-400'
                              : 'font-medium text-amber-700 dark:text-amber-400'
                          }
                        >
                          {days}d
                        </div>
                        <div class="text-muted-foreground">
                          {fmtDay(p.expiry_date)}
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
  },
})
