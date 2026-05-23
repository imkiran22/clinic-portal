import { computed, defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import MultiProductPicker from '@/features/inventory/components/MultiProductPicker'
import DatePicker from '@/components/shared/DatePicker'
import Pagination from '@/components/shared/Pagination'
import {
  useMovements,
  MOVEMENTS_PAGE_SIZE,
} from '@/features/movements/composables/useMovements'
import type { MovementsFilter } from '@/features/movements/types'
import type { MovementType, Product } from '@/features/inventory/types'
import { formatDateTime as fmtDateTime } from '@/lib/datetime'

// Display label + pill colour for each movement type. Inflows are emerald,
// outflows are amber, except SALE which uses sky to distinguish it from
// stock-loss outflows (DAMAGE / EXPIRED) — visually communicates "this is
// revenue, not a write-off."
const TYPE_META: Record<
  MovementType,
  { label: string; pill: string }
> = {
  PURCHASE: {
    label: 'Purchase',
    pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  SALE: {
    label: 'Sale',
    pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    pill: 'bg-muted text-muted-foreground',
  },
  DAMAGE: {
    label: 'Damage',
    pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  EXPIRED: {
    label: 'Expired',
    pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  PROCEDURE_USAGE: {
    label: 'Procedure use',
    pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
}

// Order shown in the filter row — most-used first.
const FILTER_TYPES: MovementType[] = [
  'PURCHASE',
  'SALE',
  'ADJUSTMENT',
  'DAMAGE',
  'EXPIRED',
]

export default defineComponent({
  name: 'MovementsView',
  setup() {
    const router = useRouter()

    const products = ref<Product[]>([])
    const types = ref<MovementType[]>([])
    const dateFrom = ref('')
    const dateTo = ref('')
    const page = ref(1)

    const filter = computed<MovementsFilter>(() => ({
      dateFrom: dateFrom.value || null,
      dateTo: dateTo.value || null,
      types: types.value,
      productIds: products.value.map((p) => p.id),
    }))

    watch(filter, () => {
      page.value = 1
    })

    const { data, isLoading, isError, error, isFetching } = useMovements(
      filter,
      page,
    )

    const rows = computed(() => data.value?.rows ?? [])
    const total = computed(() => data.value?.total ?? 0)

    const hasAnyFilter = computed(
      () =>
        !!(
          filter.value.dateFrom ||
          filter.value.dateTo ||
          filter.value.types.length ||
          filter.value.productIds.length
        ),
    )

    const clearFilters = () => {
      products.value = []
      types.value = []
      dateFrom.value = ''
      dateTo.value = ''
    }

    const toggleType = (t: MovementType) => {
      types.value = types.value.includes(t)
        ? types.value.filter((x) => x !== t)
        : [...types.value, t]
    }

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-shrink-0 space-y-4 pb-4">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Stock movements</h1>
            <p class="text-sm text-muted-foreground mt-1">
              Every change in inventory across all products — purchases,
              sales, adjustments, damage, and expired write-offs. Newest
              first.
            </p>
          </div>

          {/* Filter bar */}
          <div class="rounded-md border border-border bg-card p-3 space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-xs uppercase tracking-wide text-muted-foreground">
                Filters
              </div>
              {hasAnyFilter.value && (
                <button
                  type="button"
                  onClick={clearFilters}
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X class="size-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Type toggle chips */}
            <div class="flex flex-wrap gap-1.5">
              {FILTER_TYPES.map((t) => {
                const active = types.value.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    class={[
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? `${TYPE_META[t].pill} border-transparent`
                        : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                  >
                    {TYPE_META[t].label}
                  </button>
                )
              })}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-[160px_160px_1fr] gap-3 items-start">
              <DatePicker
                modelValue={dateFrom.value}
                onUpdate:modelValue={(v: string) => (dateFrom.value = v)}
                placeholder="From"
              />
              <DatePicker
                modelValue={dateTo.value}
                onUpdate:modelValue={(v: string) => (dateTo.value = v)}
                placeholder="To"
              />
              <MultiProductPicker
                modelValue={products.value}
                onUpdate:modelValue={(ps: Product[]) =>
                  (products.value = ps)
                }
              />
            </div>
          </div>

          {isError.value && (
            <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {(error.value as { message?: string })?.message ??
                'Failed to load movements.'}
            </div>
          )}

          {!isLoading.value && !isError.value && (
            <div class="text-sm text-muted-foreground">
              {total.value} movement{total.value === 1 ? '' : 's'}
              {hasAnyFilter.value ? ' (filtered)' : ''}
            </div>
          )}
        </div>

        {/* Table */}
        <div class="flex-1 min-h-0 overflow-auto">
          {isLoading.value ? (
            <div class="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} class="h-12 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : !isError.value && total.value === 0 ? (
            <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              {hasAnyFilter.value
                ? 'No movements match the current filters.'
                : 'No stock movements yet.'}
            </div>
          ) : !isError.value && total.value > 0 ? (
            <div class={isFetching.value ? 'opacity-60 transition-opacity' : ''}>
              <div class="overflow-x-auto rounded-md border border-border">
                <table class="w-full text-sm">
                  <thead class="bg-muted/40 text-muted-foreground">
                    <tr class="text-left">
                      <th class="px-4 py-2 font-medium whitespace-nowrap">When</th>
                      <th class="px-4 py-2 font-medium">Type</th>
                      <th class="px-4 py-2 font-medium">Product</th>
                      <th class="px-4 py-2 font-medium text-right">Qty</th>
                      <th class="px-4 py-2 font-medium">Patient</th>
                      <th class="px-4 py-2 font-medium">Remarks</th>
                      <th class="px-4 py-2 font-medium">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.value.map((m) => {
                      const meta = TYPE_META[m.movement_type]
                      return (
                        <tr key={m.id} class="border-t border-border">
                          <td class="px-4 py-2 text-muted-foreground whitespace-nowrap">
                            {fmtDateTime(m.created_at)}
                          </td>
                          <td class="px-4 py-2">
                            <span
                              class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.pill}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td class="px-4 py-2">
                            {m.product ? (
                              <button
                                type="button"
                                class="text-left hover:underline"
                                onClick={() =>
                                  router.push({
                                    name: 'inventory-detail',
                                    params: { id: m.product!.id },
                                  })
                                }
                              >
                                {m.product.name}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td class="px-4 py-2 text-right tabular-nums font-medium">
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td class="px-4 py-2">
                            {m.patient ? (
                              <button
                                type="button"
                                class="text-left hover:underline"
                                onClick={() =>
                                  router.push({
                                    name: 'patient-detail',
                                    params: { id: m.patient!.id },
                                  })
                                }
                              >
                                {m.patient.name}
                                {m.patient.legacy_client_no && (
                                  <span class="ml-1 text-xs text-muted-foreground tabular-nums">
                                    #{m.patient.legacy_client_no}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span class="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td class="px-4 py-2 text-muted-foreground">
                            {m.remarks ?? '—'}
                          </td>
                          <td class="px-4 py-2 text-muted-foreground">
                            {m.created_by_display ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {!isLoading.value && !isError.value && total.value > 0 && (
          <div class="flex-shrink-0 pt-3 mt-3 border-t border-border">
            <Pagination
              page={page.value}
              pageSize={MOVEMENTS_PAGE_SIZE}
              total={total.value}
              onUpdate:page={(p: number) => (page.value = p)}
            />
          </div>
        )}
      </div>
    )
  },
})
