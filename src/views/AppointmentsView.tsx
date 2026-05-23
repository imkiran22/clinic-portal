import { computed, defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { Plus, Search, X } from 'lucide-vue-next'
import {
  useAppointments,
  APPOINTMENTS_PAGE_SIZE,
} from '@/features/appointments/composables/useAppointments'
import {
  useSetAppointmentStatus,
  useSoftDeleteAppointment,
} from '@/features/appointments/composables/useAppointmentMutations'
import AppointmentsTable from '@/features/appointments/components/AppointmentsTable'
import AppointmentFormDialog from '@/features/appointments/components/AppointmentFormDialog'
import CancelReasonDialog from '@/features/appointments/components/CancelReasonDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import type {
  Appointment,
  AppointmentStatus,
  AppointmentsSortBy,
} from '@/features/appointments/types'

const STATUS_OPTIONS: Array<{
  value: AppointmentStatus
  label: string
}> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SORT_OPTIONS: Array<{ value: AppointmentsSortBy; label: string }> = [
  { value: 'scheduled_asc', label: 'Soonest first' },
  { value: 'scheduled_desc', label: 'Latest first' },
  { value: 'created_desc', label: 'Recently added' },
]

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default defineComponent({
  name: 'AppointmentsView',
  setup() {
    const router = useRouter()

    // Default landing: today's scheduled roster. Staff most often want
    // "what's on the books today" the moment they open the page.
    const today = todayIsoDate()
    const searchInput = ref('')
    const debouncedSearch = refDebounced(searchInput, 300)
    const statuses = ref<AppointmentStatus[]>(['scheduled'])
    const dateFrom = ref(today)
    const dateTo = ref(today)
    const sortBy = ref<AppointmentsSortBy>('scheduled_asc')
    const page = ref(1)

    const filter = computed(() => ({
      patientSearch: debouncedSearch.value,
      statuses: statuses.value,
      dateFrom: dateFrom.value || null,
      dateTo: dateTo.value || null,
      sortBy: sortBy.value,
    }))

    watch(filter, () => {
      page.value = 1
    })

    const { data, isLoading, isError, error, isFetching } = useAppointments(
      filter,
      page,
    )

    const rows = computed(() => data.value?.rows ?? [])
    const total = computed(() => data.value?.total ?? 0)

    const hasNonDefaultFilter = computed(
      () =>
        debouncedSearch.value.trim().length > 0 ||
        statuses.value.length !== 1 ||
        statuses.value[0] !== 'scheduled' ||
        dateFrom.value !== today ||
        dateTo.value !== today ||
        sortBy.value !== 'scheduled_asc',
    )

    const resetFilters = () => {
      searchInput.value = ''
      statuses.value = ['scheduled']
      dateFrom.value = today
      dateTo.value = today
      sortBy.value = 'scheduled_asc'
    }

    const toggleStatus = (s: AppointmentStatus) => {
      statuses.value = statuses.value.includes(s)
        ? statuses.value.filter((x) => x !== s)
        : [...statuses.value, s]
    }

    // ---------- form / dialogs ----------
    const formOpen = ref(false)
    const editing = ref<Appointment | null>(null)

    const openNew = () => {
      editing.value = null
      formOpen.value = true
    }
    const openEdit = (a: Appointment) => {
      editing.value = a
      formOpen.value = true
    }

    const setStatusMut = useSetAppointmentStatus()
    const softDeleteMut = useSoftDeleteAppointment()

    const cancelTarget = ref<Appointment | null>(null)
    const cancelOpen = ref(false)
    const requestCancel = (a: Appointment) => {
      cancelTarget.value = a
      cancelOpen.value = true
    }
    const confirmCancel = async (notes: string) => {
      if (!cancelTarget.value) return
      try {
        await setStatusMut.mutateAsync({
          id: cancelTarget.value.id,
          status: 'cancelled',
          notes: notes.trim() || cancelTarget.value.notes,
          toastMessage: 'Appointment cancelled',
        })
        cancelOpen.value = false
        cancelTarget.value = null
      } catch {
        // toast surfaced
      }
    }

    const restore = async (a: Appointment) => {
      try {
        await setStatusMut.mutateAsync({
          id: a.id,
          status: 'scheduled',
          toastMessage: 'Restored to scheduled',
        })
      } catch {
        // toast surfaced
      }
    }

    const markDone = (a: Appointment) => {
      // Routes to the visit-create flow with the appointment context;
      // NewVisitView pre-fills patient + treatment and (on save) marks
      // the appointment done with visit_id set.
      router.push({
        name: 'visit-new',
        query: { appointment_id: a.id },
      })
    }

    const deleting = ref<Appointment | null>(null)
    const deleteOpen = ref(false)
    const requestDelete = (a: Appointment) => {
      deleting.value = a
      deleteOpen.value = true
    }
    const performDelete = async () => {
      if (!deleting.value) return
      try {
        await softDeleteMut.mutateAsync(deleting.value.id)
        deleteOpen.value = false
        deleting.value = null
      } catch {
        // toast surfaced
      }
    }

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-shrink-0 space-y-3 pb-3">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Appointments</h1>
              <p class="text-sm text-muted-foreground mt-1">
                {isLoading.value
                  ? 'Loading…'
                  : `${total.value} appointment${total.value === 1 ? '' : 's'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={openNew}
              class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus class="size-4" />
              <span>New appointment</span>
            </button>
          </div>

          {/* Compact inline filter row — mirrors PatientsView. */}
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div class="relative w-full max-w-sm">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by name, phone, or #client number"
                value={searchInput.value}
                onInput={(e: Event) =>
                  (searchInput.value = (e.target as HTMLInputElement).value)
                }
                class="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div class="flex items-center gap-1.5">
              {STATUS_OPTIONS.map((s) => {
                const active = statuses.value.includes(s.value)
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleStatus(s.value)}
                    class={[
                      'h-7 px-3 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground border-transparent'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>

            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>When</span>
              <input
                aria-label="From date"
                type="date"
                value={dateFrom.value}
                onInput={(e: Event) =>
                  (dateFrom.value = (e.target as HTMLInputElement).value)
                }
                class="h-7 w-[140px] rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span>→</span>
              <input
                aria-label="To date"
                type="date"
                value={dateTo.value}
                onInput={(e: Event) =>
                  (dateTo.value = (e.target as HTMLInputElement).value)
                }
                class="h-7 w-[140px] rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Sort</span>
              <select
                aria-label="Sort appointments by"
                value={sortBy.value}
                onChange={(e: Event) =>
                  (sortBy.value = (e.target as HTMLSelectElement)
                    .value as AppointmentsSortBy)
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

            {hasNonDefaultFilter.value && (
              <button
                type="button"
                onClick={resetFilters}
                class="inline-flex items-center gap-1 px-2 h-7 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X class="size-3" />
                <span>Reset to today</span>
              </button>
            )}
          </div>

          {isError.value && (
            <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {(error.value as { message?: string })?.message ??
                'Failed to load appointments.'}
            </div>
          )}
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          {isLoading.value ? (
            <div class="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} class="h-12 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : !isError.value && total.value === 0 ? (
            <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              {debouncedSearch.value
                ? `No appointments match "${debouncedSearch.value}".`
                : 'No appointments match the current filters.'}
            </div>
          ) : !isError.value && total.value > 0 ? (
            <div
              class={isFetching.value ? 'opacity-60 transition-opacity' : ''}
            >
              <AppointmentsTable
                appointments={rows.value}
                onEdit={openEdit}
                onMarkDone={markDone}
                onCancel={requestCancel}
                onRestore={restore}
                onSoftDelete={requestDelete}
              />
            </div>
          ) : null}
        </div>

        {!isLoading.value && !isError.value && total.value > 0 && (
          <div class="flex-shrink-0 pt-3 mt-3 border-t border-border">
            <Pagination
              page={page.value}
              pageSize={APPOINTMENTS_PAGE_SIZE}
              total={total.value}
              onUpdate:page={(p: number) => (page.value = p)}
            />
          </div>
        )}

        <AppointmentFormDialog
          open={formOpen.value}
          appointment={editing.value}
          onUpdate:open={(v: boolean) => (formOpen.value = v)}
        />

        <CancelReasonDialog
          open={cancelOpen.value}
          initialNotes={cancelTarget.value?.notes ?? ''}
          loading={setStatusMut.isPending.value}
          onUpdate:open={(v: boolean) => (cancelOpen.value = v)}
          onConfirm={confirmCancel}
        />

        <ConfirmDialog
          open={deleteOpen.value}
          title="Remove appointment"
          message={
            deleting.value
              ? `Remove this appointment for "${deleting.value.patient?.name ?? 'patient'}"? This is a soft delete — history is preserved but it won't appear in lists.`
              : ''
          }
          confirmLabel="Remove"
          destructive
          loading={softDeleteMut.isPending.value}
          onUpdate:open={(v: boolean) => (deleteOpen.value = v)}
          onConfirm={performDelete}
        />
      </div>
    )
  },
})
