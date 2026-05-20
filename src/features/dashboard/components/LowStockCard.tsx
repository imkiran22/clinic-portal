import { computed, defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import DashboardCard from './DashboardCard'
import { useLowStock } from '../composables/useDashboard'

export default defineComponent({
  name: 'LowStockCard',
  setup() {
    const router = useRouter()
    const { data, isLoading, error } = useLowStock()

    // Don't paint the card red when there's nothing to flag — the danger
    // accent should reflect actual state, not the card's category.
    const accent = computed(() =>
      (data.value?.total ?? 0) > 0 ? ('danger' as const) : ('default' as const),
    )

    return () => (
      <DashboardCard
        title="Low stock"
        hint="At or below reorder level"
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
          empty: () => 'Stock is healthy.',
          default: () => (
            <ul class="divide-y divide-border">
              {(data.value?.rows ?? []).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push({
                        name: 'inventory-detail',
                        params: { id: p.id },
                      })
                    }
                    class="w-full px-2 py-2 text-left hover:bg-accent rounded-md flex items-center justify-between gap-3"
                  >
                    <span class="text-sm truncate">{p.name}</span>
                    <span
                      class={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tabular-nums ${
                        p.current_stock <= 0
                          ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {p.current_stock} / {p.reorder_level}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ),
        }}
      </DashboardCard>
    )
  },
})
