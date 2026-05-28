import { computed, defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { Plus, Search, SlidersHorizontal, X } from 'lucide-vue-next'
import {
  useVisits,
  VISITS_PAGE_SIZE,
} from '@/features/visits/composables/useVisits'
import VisitsTable from '@/features/visits/components/VisitsTable'
import VisitDetailModal from '@/features/visits/components/VisitDetailModal'
import MultiPatientPicker from '@/features/patients/components/MultiPatientPicker'
import DatePicker from '@/components/shared/DatePicker'
import Modal from '@/components/shared/Modal'
import Pagination from '@/components/shared/Pagination'
import { useCan } from '@/features/auth/composables/useCan'
import type { Visit } from '@/features/visits/types'
import type { Patient } from '@/features/patients/types'

// Quick date-range presets — same set as MovementsView / SalesView.
// Visits are historical so the chips lean backwards; default is All
// time so the page lands on the full history.
type DateRangeMode = 'today' | 'last7' | 'last30' | 'all' | 'custom'

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
  name: 'VisitsView',
  setup() {
    const router = useRouter()
    const page = ref(1)

    // ---------- filter state ----------
    const searchInput = ref('')
    const debouncedSearch = refDebounced(searchInput, 300)
    const patients = ref<Patient[]>([])
    const dateFrom = ref('')
    const dateTo = ref('')

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
    // Editing a picker while a preset chip is active flips us into
    // custom so the change sticks visually.
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
      return n
    })

    const filter = computed(() => ({
      patientSearch: debouncedSearch.value,
      dateFrom: dateFrom.value || null,
      dateTo: dateTo.value || null,
      patientIds: patients.value.map((p) => p.id),
    }))

    // Reset to page 1 whenever the filter changes — otherwise users
    // land on an empty page 4 after narrowing.
    watch(filter, () => {
      page.value = 1
    })

    const hasAnyFilter = computed(
      () =>
        debouncedSearch.value.trim().length > 0 ||
        patients.value.length > 0 ||
        rangeMode.value !== 'all',
    )

    const clearFilters = () => {
      searchInput.value = ''
      patients.value = []
      setRange('all')
    }

    // ---------- data ----------
    const { data, isLoading, isError, error, isFetching } = useVisits(
      filter,
      page,
    )

    const rows = computed(() => data.value?.rows ?? [])
    const total = computed(() => data.value?.total ?? 0)

    const { canCreateVisit } = useCan()

    const selectedVisit = ref<Visit | null>(null)
    const detailOpen = ref(false)

    const openVisit = (v: Visit) => {
      selectedVisit.value = v
      detailOpen.value = true
    }

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-shrink-0 space-y-3 pb-3">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Visits</h1>
              <p class="text-sm text-muted-foreground mt-1">
                {isLoading.value
                  ? 'Loading…'
                  : `${total.value} visit${total.value === 1 ? '' : 's'}`}
              </p>
            </div>
            {canCreateVisit.value && (
              <button
                type="button"
                onClick={() => router.push({ name: 'visit-new' })}
                class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Plus class="size-4" />
                <span>New visit</span>
              </button>
            )}
          </div>

          {/* Compact filter row — same pattern as Appointments / Sales. */}
          <div class="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            <div class="relative w-[240px]">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search name / phone / #id"
                value={searchInput.value}
                onInput={(e: Event) =>
                  (searchInput.value = (e.target as HTMLInputElement).value)
                }
                class="h-7 w-full pl-8 pr-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

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
                'Failed to load visits.'}
            </div>
          )}
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          {isLoading.value && (
            <div class="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} class="h-12 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading.value && !isError.value && total.value === 0 && (
            <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              {hasAnyFilter.value
                ? 'No visits match the current filters.'
                : 'No visits yet. Click "New visit" to record the first one.'}
            </div>
          )}

          {!isLoading.value && !isError.value && total.value > 0 && (
            <div class={isFetching.value ? 'opacity-60 transition-opacity' : ''}>
              <VisitsTable visits={rows.value} onOpen={openVisit} />
            </div>
          )}
        </div>

        {!isLoading.value && !isError.value && total.value > 0 && (
          <div class="flex-shrink-0 pt-3 mt-3 border-t border-border">
            <Pagination
              page={page.value}
              pageSize={VISITS_PAGE_SIZE}
              total={total.value}
              onUpdate:page={(p: number) => (page.value = p)}
            />
          </div>
        )}

        <VisitDetailModal
          open={detailOpen.value}
          visit={selectedVisit.value}
          onUpdate:open={(v: boolean) => (detailOpen.value = v)}
        />

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
