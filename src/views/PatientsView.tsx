import { computed, defineComponent, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { Plus, Search, X } from 'lucide-vue-next'
import {
  usePatients,
  PATIENTS_PAGE_SIZE,
} from '@/features/patients/composables/usePatients'
import { useSoftDeletePatient } from '@/features/patients/composables/usePatientMutations'
import PatientsTable from '@/features/patients/components/PatientsTable'
import PatientFormDialog from '@/features/patients/components/PatientFormDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DatePicker from '@/components/shared/DatePicker'
import Pagination from '@/components/shared/Pagination'
import type { Gender, Patient } from '@/features/patients/types'
import type { PatientsSortBy } from '@/features/patients/services/patientService'

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
]

const SORT_OPTIONS: Array<{ value: PatientsSortBy; label: string }> = [
  { value: 'name', label: 'Name (A → Z)' },
  { value: 'created_desc', label: 'Recently added' },
  { value: 'updated_desc', label: 'Recently updated' },
]

export default defineComponent({
  name: 'PatientsView',
  setup() {
    const searchInput = ref('')
    const debouncedSearch = refDebounced(searchInput, 300)
    const page = ref(1)

    const genders = ref<Gender[]>([])
    const dateFrom = ref('')
    const dateTo = ref('')
    const sortBy = ref<PatientsSortBy>('name')

    const filter = computed(() => ({
      genders: genders.value,
      dateFrom: dateFrom.value || null,
      dateTo: dateTo.value || null,
      sortBy: sortBy.value,
    }))

    // Reset to page 1 whenever search or filter changes — landing on
    // an empty page after narrowing is a guaranteed bad UX.
    watch([debouncedSearch, filter], () => {
      page.value = 1
    })

    const hasAnyFilter = computed(
      () =>
        genders.value.length > 0 ||
        !!dateFrom.value ||
        !!dateTo.value ||
        sortBy.value !== 'name',
    )

    const clearFilters = () => {
      genders.value = []
      dateFrom.value = ''
      dateTo.value = ''
      sortBy.value = 'name'
    }

    const toggleGender = (g: Gender) => {
      genders.value = genders.value.includes(g)
        ? genders.value.filter((x) => x !== g)
        : [...genders.value, g]
    }

    const { data, isLoading, isError, error, isFetching } = usePatients(
      debouncedSearch,
      page,
      filter,
    )

    const rows = computed(() => data.value?.rows ?? [])
    const total = computed(() => data.value?.total ?? 0)

    const formOpen = ref(false)
    const editing = ref<Patient | null>(null)

    const confirmOpen = ref(false)
    const deleting = ref<Patient | null>(null)
    const softDeleteMut = useSoftDeletePatient()

    const openNew = () => {
      editing.value = null
      formOpen.value = true
    }
    const openEdit = (p: Patient) => {
      editing.value = p
      formOpen.value = true
    }
    const requestDelete = (p: Patient) => {
      deleting.value = p
      confirmOpen.value = true
    }
    const performDelete = async () => {
      if (!deleting.value) return
      try {
        await softDeleteMut.mutateAsync(deleting.value.id)
        confirmOpen.value = false
        deleting.value = null
      } catch {
        // toast surfaced in mutation
      }
    }

    return () => (
      <div class="flex flex-col h-full">
        {/* Top region: header + search (fixed) */}
        <div class="flex-shrink-0 space-y-4 pb-4">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Patients</h1>
              <p class="text-sm text-muted-foreground mt-1">
                {isLoading.value
                  ? 'Loading…'
                  : `${total.value} patient${total.value === 1 ? '' : 's'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={openNew}
              class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus class="size-4" />
              <span>New patient</span>
            </button>
          </div>

          {/* Search + filters compacted into a single inline row.
              No card chrome — labels are inline, controls share the
              same row, and the row only grows vertically when there
              isn't enough horizontal space. */}
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
              {GENDER_OPTIONS.map((g) => {
                const active = genders.value.includes(g.value)
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGender(g.value)}
                    class={[
                      'h-7 px-3 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
                      active
                        ? 'bg-accent text-accent-foreground border-transparent'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>

            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <span class="opacity-70">Added</span>
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

            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Sort</span>
              <select
                aria-label="Sort patients by"
                value={sortBy.value}
                onChange={(e: Event) =>
                  (sortBy.value = (e.target as HTMLSelectElement)
                    .value as PatientsSortBy)
                }
                class="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

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
              {(error.value as { message?: string })?.message ?? 'Failed to load patients.'}
            </div>
          )}
        </div>

        {/* Middle region: scrollable list */}
        <div class="flex-1 min-h-0 overflow-auto">
          {isLoading.value && (
            <div class="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} class="h-10 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading.value && !isError.value && total.value === 0 && (
            <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              {debouncedSearch.value
                ? `No patients match "${debouncedSearch.value}".`
                : hasAnyFilter.value
                  ? 'No patients match the current filters.'
                  : 'No patients yet. Click "New patient" to add one.'}
            </div>
          )}

          {!isLoading.value && !isError.value && total.value > 0 && (
            <div class={isFetching.value ? 'opacity-60 transition-opacity' : ''}>
              <PatientsTable
                patients={rows.value}
                onEdit={openEdit}
                onDelete={requestDelete}
              />
            </div>
          )}
        </div>

        {/* Bottom region: pagination (fixed) */}
        {!isLoading.value && !isError.value && total.value > 0 && (
          <div class="flex-shrink-0 pt-3 mt-3 border-t border-border">
            <Pagination
              page={page.value}
              pageSize={PATIENTS_PAGE_SIZE}
              total={total.value}
              onUpdate:page={(p: number) => (page.value = p)}
            />
          </div>
        )}

        <PatientFormDialog
          open={formOpen.value}
          patient={editing.value}
          onUpdate:open={(v: boolean) => (formOpen.value = v)}
        />

        <ConfirmDialog
          open={confirmOpen.value}
          title="Remove patient"
          message={
            deleting.value
              ? `Remove "${deleting.value.name}"? This is a soft delete — visit history is preserved, but the patient won't appear in lists.`
              : ''
          }
          confirmLabel="Remove"
          destructive
          loading={softDeleteMut.isPending.value}
          onUpdate:open={(v: boolean) => (confirmOpen.value = v)}
          onConfirm={performDelete}
        />
      </div>
    )
  },
})
