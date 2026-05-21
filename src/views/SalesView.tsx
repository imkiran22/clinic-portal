import { computed, defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import PatientPicker from '@/features/patients/components/PatientPicker'
import ProductPicker from '@/features/inventory/components/ProductPicker'
import Pagination from '@/components/shared/Pagination'
import {
  useSales,
  useSalesStats,
  SALES_PAGE_SIZE,
} from '@/features/sales/composables/useSales'
import type { SalesFilter } from '@/features/sales/types'
import type { Patient } from '@/features/patients/types'
import type { Product } from '@/features/inventory/types'

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return '—'
  }
}

export default defineComponent({
  name: 'SalesView',
  setup() {
    const router = useRouter()

    // Filter pickers hold their full objects so the UI can render the
    // selected name / number; the service only needs the ids.
    const patient = ref<Patient | null>(null)
    const product = ref<Product | null>(null)
    const dateFrom = ref('')
    const dateTo = ref('')
    const page = ref(1)

    const filter = computed<SalesFilter>(() => ({
      dateFrom: dateFrom.value || null,
      dateTo: dateTo.value || null,
      patientId: patient.value?.id ?? null,
      productId: product.value?.id ?? null,
    }))

    // Reset to page 1 whenever the filter changes — otherwise users land
    // on an empty page 4 after narrowing.
    watch(filter, () => {
      page.value = 1
    })

    const { data, isLoading, isError, error, isFetching } = useSales(
      filter,
      page,
    )
    const { data: stats, isLoading: statsLoading } = useSalesStats()

    const rows = computed(() => data.value?.rows ?? [])
    const total = computed(() => data.value?.total ?? 0)

    const hasAnyFilter = computed(
      () =>
        !!(
          filter.value.dateFrom ||
          filter.value.dateTo ||
          filter.value.patientId ||
          filter.value.productId
        ),
    )

    const clearFilters = () => {
      patient.value = null
      product.value = null
      dateFrom.value = ''
      dateTo.value = ''
    }

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-shrink-0 space-y-4 pb-4">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Sales</h1>
            <p class="text-sm text-muted-foreground mt-1">
              Every product dispensed across visits and walk-in sells.
            </p>
          </div>

          {/* Stats strip — today / week / month at a glance */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['today', 'thisWeek', 'thisMonth'] as const).map((bucket) => {
              const label =
                bucket === 'today'
                  ? 'Today'
                  : bucket === 'thisWeek'
                    ? 'This week'
                    : 'This month'
              const s = stats.value?.[bucket]
              return (
                <div
                  key={bucket}
                  class="rounded-md border border-border bg-card px-4 py-3"
                >
                  <div class="text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  {statsLoading.value ? (
                    <div class="h-7 w-24 mt-2 rounded bg-muted/60 animate-pulse" />
                  ) : (
                    <div class="mt-1 flex items-baseline gap-3">
                      <span class="text-xl font-semibold tabular-nums">
                        ₹{fmtMoney(s?.revenue ?? 0)}
                      </span>
                      <span class="text-xs text-muted-foreground tabular-nums">
                        {s?.count ?? 0} sale{(s?.count ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Filter bar */}
          <div class="rounded-md border border-border bg-card p-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label class="text-xs uppercase tracking-wide text-muted-foreground" for="sales-from">
                  From
                </label>
                <input
                  id="sales-from"
                  type="date"
                  value={dateFrom.value}
                  onInput={(e: Event) =>
                    (dateFrom.value = (e.target as HTMLInputElement).value)
                  }
                  class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label class="text-xs uppercase tracking-wide text-muted-foreground" for="sales-to">
                  To
                </label>
                <input
                  id="sales-to"
                  type="date"
                  value={dateTo.value}
                  onInput={(e: Event) =>
                    (dateTo.value = (e.target as HTMLInputElement).value)
                  }
                  class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label class="text-xs uppercase tracking-wide text-muted-foreground">
                  Patient
                </label>
                <div class="mt-1">
                  <PatientPicker
                    modelValue={patient.value}
                    onUpdate:modelValue={(p: Patient | null) =>
                      (patient.value = p)
                    }
                  />
                </div>
              </div>
              <div>
                <label class="text-xs uppercase tracking-wide text-muted-foreground">
                  Product
                </label>
                <div class="mt-1">
                  <ProductPicker
                    modelValue={product.value}
                    onUpdate:modelValue={(p: Product | null) =>
                      (product.value = p)
                    }
                    inStockOnly={false}
                    placeholder="Filter by product"
                  />
                </div>
              </div>
            </div>
            {hasAnyFilter.value && (
              <div class="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X class="size-3" />
                  <span>Clear filters</span>
                </button>
              </div>
            )}
          </div>

          {isError.value && (
            <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {(error.value as { message?: string })?.message ??
                'Failed to load sales.'}
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
                ? 'No sales match the current filters.'
                : 'No sales yet — they will appear here once products are dispensed.'}
            </div>
          ) : !isError.value && total.value > 0 ? (
            <div
              class={
                isFetching.value ? 'opacity-60 transition-opacity' : ''
              }
            >
              <div class="overflow-x-auto rounded-md border border-border">
                <table class="w-full text-sm">
                  <thead class="bg-muted/40 text-muted-foreground">
                    <tr class="text-left">
                      <th class="px-4 py-2 font-medium whitespace-nowrap">When</th>
                      <th class="px-4 py-2 font-medium">Patient</th>
                      <th class="px-4 py-2 font-medium">Product</th>
                      <th class="px-4 py-2 font-medium text-right">Qty</th>
                      <th class="px-4 py-2 font-medium text-right">Unit</th>
                      <th class="px-4 py-2 font-medium text-right">Line</th>
                      <th class="px-4 py-2 font-medium">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.value.map((r) => {
                      const qty = Math.abs(r.quantity)
                      const unit = r.product?.selling_price ?? 0
                      return (
                        <tr key={r.id} class="border-t border-border">
                          <td class="px-4 py-2 text-muted-foreground whitespace-nowrap">
                            {fmtDateTime(r.created_at)}
                          </td>
                          <td class="px-4 py-2">
                            {r.patient ? (
                              <button
                                type="button"
                                class="text-left hover:underline"
                                onClick={() =>
                                  router.push({
                                    name: 'patient-detail',
                                    params: { id: r.patient!.id },
                                  })
                                }
                              >
                                {r.patient.name}
                                {r.patient.legacy_client_no && (
                                  <span class="ml-1 text-xs text-muted-foreground tabular-nums">
                                    #{r.patient.legacy_client_no}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span class="text-muted-foreground">Walk-in</span>
                            )}
                          </td>
                          <td class="px-4 py-2">
                            {r.product ? (
                              <button
                                type="button"
                                class="text-left hover:underline"
                                onClick={() =>
                                  router.push({
                                    name: 'inventory-detail',
                                    params: { id: r.product!.id },
                                  })
                                }
                              >
                                {r.product.name}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td class="px-4 py-2 text-right tabular-nums font-medium">
                            {qty}
                          </td>
                          <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {fmtMoney(unit)}
                          </td>
                          <td class="px-4 py-2 text-right tabular-nums font-medium">
                            {fmtMoney(qty * unit)}
                          </td>
                          <td class="px-4 py-2 text-muted-foreground">
                            {r.created_by_display ?? '—'}
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
              pageSize={SALES_PAGE_SIZE}
              total={total.value}
              onUpdate:page={(p: number) => (page.value = p)}
            />
          </div>
        )}
      </div>
    )
  },
})
