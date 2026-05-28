import { computed, defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SlidersHorizontal, X } from 'lucide-vue-next'
import MultiPatientPicker from '@/features/patients/components/MultiPatientPicker'
import MultiProductPicker from '@/features/inventory/components/MultiProductPicker'
import DatePicker from '@/components/shared/DatePicker'
import Modal from '@/components/shared/Modal'
import Pagination from '@/components/shared/Pagination'
import {
  useSales,
  useSalesStats,
  SALES_PAGE_SIZE,
} from '@/features/sales/composables/useSales'
import type { SalesFilter } from '@/features/sales/types'
import type { Patient } from '@/features/patients/types'
import type { Product } from '@/features/inventory/types'
import { formatDateTime as fmtDateTime } from '@/lib/datetime'

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Quick date-range presets — mirrors MovementsView. Sales are
// historical, so the chips lean backwards (no "tomorrow"). Default is
// All time; staff who want a window pick a chip explicitly.
type DateRangeMode =
  | 'today'
  | 'last7'
  | 'last30'
  | 'all'
  | 'custom'

const RANGE_OPTIONS: Array<{ value: DateRangeMode; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
]

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rangeFor(
  mode: Exclude<DateRangeMode, 'custom' | 'all'>,
): { from: string; to: string } {
  const now = new Date()
  const today = isoDay(now)
  if (mode === 'today') return { from: today, to: today }
  const start = new Date(now)
  start.setDate(start.getDate() - (mode === 'last7' ? 6 : 29))
  return { from: isoDay(start), to: today }
}

export default defineComponent({
  name: 'SalesView',
  setup() {
    const router = useRouter()

    // Filter pickers hold the full objects so chip labels render with
    // names / client numbers; the service only needs the ids.
    const patients = ref<Patient[]>([])
    const products = ref<Product[]>([])
    const dateFrom = ref('')
    const dateTo = ref('')
    const page = ref(1)

    const rangeMode = ref<DateRangeMode>('all')
    const setRange = (mode: DateRangeMode) => {
      rangeMode.value = mode
      if (mode === 'all') {
        dateFrom.value = ''
        dateTo.value = ''
        return
      }
      if (mode === 'custom') return
      const r = rangeFor(mode)
      dateFrom.value = r.from
      dateTo.value = r.to
    }
    watch([dateFrom, dateTo], ([from, to]) => {
      const mode = rangeMode.value
      if (mode === 'custom') return
      if (mode === 'all') {
        if (from || to) rangeMode.value = 'custom'
        return
      }
      const expected = rangeFor(mode)
      if (from !== expected.from || to !== expected.to) {
        rangeMode.value = 'custom'
      }
    })

    const moreFiltersOpen = ref(false)
    const extraFiltersCount = computed(() => {
      let n = 0
      if (patients.value.length > 0) n += 1
      if (products.value.length > 0) n += 1
      return n
    })

    const filter = computed<SalesFilter>(() => ({
      dateFrom: dateFrom.value || null,
      dateTo: dateTo.value || null,
      patientIds: patients.value.map((p) => p.id),
      productIds: products.value.map((p) => p.id),
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
          filter.value.patientIds.length ||
          filter.value.productIds.length
        ),
    )

    const clearFilters = () => {
      patients.value = []
      products.value = []
      setRange('all')
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

          {/* Primary filter row — same shape as /movements and
              /appointments. Date-range chips on the bar, Patient +
              Product live in the More-filters modal. */}
          <div class="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            <div class="flex items-center gap-1.5">
              {RANGE_OPTIONS.map((r) => {
                const active = rangeMode.value === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRange(r.value)}
                    class={[
                      'h-7 px-3 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
                      active
                        ? 'bg-accent text-accent-foreground border-transparent'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>

            {rangeMode.value === 'custom' && (
              <div class="flex items-center gap-1 text-xs text-muted-foreground">
                <div class="w-[120px]">
                  <DatePicker
                    modelValue={dateFrom.value}
                    onUpdate:modelValue={(v: string) => (dateFrom.value = v)}
                    placeholder="From"
                    size="sm"
                  />
                </div>
                <span class="opacity-60">→</span>
                <div class="w-[120px]">
                  <DatePicker
                    modelValue={dateTo.value}
                    onUpdate:modelValue={(v: string) => (dateTo.value = v)}
                    placeholder="To"
                    size="sm"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => (moreFiltersOpen.value = true)}
              class="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="More filters"
            >
              <SlidersHorizontal class="size-3.5" />
              <span>Filters</span>
              {extraFiltersCount.value > 0 && (
                <span class="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium tabular-nums">
                  {extraFiltersCount.value}
                </span>
              )}
            </button>

            {hasAnyFilter.value && (
              <button
                type="button"
                onClick={clearFilters}
                class="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Clear filters"
                aria-label="Clear filters"
              >
                <X class="size-3.5" />
              </button>
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

        <Modal
          open={moreFiltersOpen.value}
          title="More filters"
          size="max-w-md"
          onUpdate:open={(v: boolean) => (moreFiltersOpen.value = v)}
        >
          <div class="space-y-5">
            <div>
              <h3 class="text-sm font-medium mb-2">Patient</h3>
              <MultiPatientPicker
                modelValue={patients.value}
                onUpdate:modelValue={(ps: Patient[]) =>
                  (patients.value = ps)
                }
              />
            </div>

            <div>
              <h3 class="text-sm font-medium mb-2">Product</h3>
              <MultiProductPicker
                modelValue={products.value}
                onUpdate:modelValue={(ps: Product[]) =>
                  (products.value = ps)
                }
              />
            </div>

            <div class="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => (moreFiltersOpen.value = false)}
                class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      </div>
    )
  },
})
