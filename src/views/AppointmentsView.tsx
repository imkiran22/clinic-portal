import { computed, defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced, useLocalStorage, useMediaQuery } from '@vueuse/core'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import {
  CalendarDays,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-vue-next'
import Modal from '@/components/shared/Modal'
import {
  useAppointments,
  useAppointmentsRange,
  APPOINTMENTS_PAGE_SIZE,
} from '@/features/appointments/composables/useAppointments'
import {
  useRescheduleAppointment,
  useSetAppointmentStatus,
  useSoftDeleteAppointment,
} from '@/features/appointments/composables/useAppointmentMutations'
import AppointmentsCalendar, {
  type CalendarView,
  type RescheduleRequest,
  type SlotClick,
} from '@/features/appointments/components/AppointmentsCalendar'
import CalendarToolbar from '@/features/appointments/components/CalendarToolbar'
import AppointmentsTable from '@/features/appointments/components/AppointmentsTable'
import AppointmentFormDialog from '@/features/appointments/components/AppointmentFormDialog'
import CancelReasonDialog from '@/features/appointments/components/CancelReasonDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DatePicker from '@/components/shared/DatePicker'
import Pagination from '@/components/shared/Pagination'
import { useDoctors } from '@/features/auth/composables/useDoctors'
import type { Profile } from '@/features/auth/services/authService'
import type {
  Appointment,
  AppointmentStatus,
  AppointmentsSortBy,
  CalendarRange,
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

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayIsoDate(): string {
  return isoDay(new Date())
}

// Quick-range presets. Each returns [from, to] as YYYY-MM-DD strings
// for the local timezone. "custom" is handled separately — when that
// mode is active the date pickers are revealed and the user picks
// from / to directly.
type DateRangeMode = 'today' | 'tomorrow' | 'week' | 'custom'

function rangeFor(mode: Exclude<DateRangeMode, 'custom'>): {
  from: string
  to: string
} {
  const now = new Date()
  if (mode === 'today') {
    const d = isoDay(now)
    return { from: d, to: d }
  }
  if (mode === 'tomorrow') {
    const t = new Date(now)
    t.setDate(t.getDate() + 1)
    const d = isoDay(t)
    return { from: d, to: d }
  }
  // 'week' — today through Saturday (assuming Mon–Sat clinic week);
  // if today is Sunday we still show today through next Saturday.
  const start = isoDay(now)
  const endDate = new Date(now)
  const dow = endDate.getDay() // 0 = Sun, 6 = Sat
  const daysToSat = (6 - dow + 7) % 7
  endDate.setDate(endDate.getDate() + daysToSat)
  return { from: start, to: isoDay(endDate) }
}

// Visible window for each calendar view. Month covers the whole grid
// (leading/trailing days of adjacent months) so their counts are real.
function calendarWindow(view: CalendarView, d: Date): { from: Date; to: Date } {
  if (view === 'day') {
    const from = startOfDay(d)
    return { from, to: addDays(from, 1) }
  }
  if (view === 'week') {
    const from = startOfWeek(d, { weekStartsOn: 1 })
    return { from, to: addDays(from, 7) }
  }
  const from = startOfWeek(startOfMonth(d), { weekStartsOn: 1 })
  const to = addDays(endOfWeek(endOfMonth(d), { weekStartsOn: 1 }), 1)
  return { from: startOfDay(from), to: startOfDay(to) }
}

type PageMode = 'list' | 'calendar'

const LIST_DEFAULT_STATUSES: AppointmentStatus[] = ['scheduled']
// Calendar is a diary — show what already happened too (muted blocks).
const CALENDAR_DEFAULT_STATUSES: AppointmentStatus[] = ['scheduled', 'done']

function sameStatuses(a: AppointmentStatus[], b: AppointmentStatus[]) {
  return a.length === b.length && a.every((s) => b.includes(s))
}

const RANGE_OPTIONS: Array<{ value: DateRangeMode; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This week' },
  { value: 'custom', label: 'Custom' },
]

export default defineComponent({
  name: 'AppointmentsView',
  setup() {
    const router = useRouter()

    // Default landing: today's scheduled roster. Staff most often want
    // "what's on the books today" the moment they open the page.
    const today = todayIsoDate()
    const searchInput = ref('')
    const debouncedSearch = refDebounced(searchInput, 300)
    // List / Calendar toggle — per-viewer convenience, so localStorage.
    const mode = useLocalStorage<PageMode>('appointments:mode', 'list')
    const isCalendar = computed(() => mode.value === 'calendar')

    // Each mode keeps its own status selection (different defaults).
    const listStatuses = ref<AppointmentStatus[]>([...LIST_DEFAULT_STATUSES])
    const calStatuses = ref<AppointmentStatus[]>([
      ...CALENDAR_DEFAULT_STATUSES,
    ])
    const statuses = computed<AppointmentStatus[]>({
      get: () => (isCalendar.value ? calStatuses.value : listStatuses.value),
      set: (v) => {
        if (isCalendar.value) calStatuses.value = v
        else listStatuses.value = v
      },
    })
    const defaultStatuses = computed(() =>
      isCalendar.value ? CALENDAR_DEFAULT_STATUSES : LIST_DEFAULT_STATUSES,
    )
    const doctorIds = ref<string[]>([])
    const dateFrom = ref(today)
    const dateTo = ref(today)
    const sortBy = ref<AppointmentsSortBy>('scheduled_asc')
    const page = ref(1)

    // Quick-range chip state. When the user picks Today/Tomorrow/Week,
    // dateFrom + dateTo are derived; the pickers stay hidden. Custom
    // mode reveals the pickers and the user owns dateFrom/dateTo. Picking
    // a date manually also flips us into custom — see watchers below.
    const rangeMode = ref<DateRangeMode>('today')
    const setRange = (mode: DateRangeMode) => {
      rangeMode.value = mode
      if (mode === 'custom') return
      const r = rangeFor(mode)
      dateFrom.value = r.from
      dateTo.value = r.to
    }
    // If the user edits a picker while a quick range is active,
    // assume they want custom — flips the chip so the change sticks
    // visually and the pickers stay open.
    watch([dateFrom, dateTo], ([from, to]) => {
      if (rangeMode.value === 'custom') return
      const expected = rangeFor(rangeMode.value)
      if (from !== expected.from || to !== expected.to) {
        rangeMode.value = 'custom'
      }
    })

    const { data: doctors } = useDoctors()

    // Status / doctor / sort live in a "More filters" modal so the
    // main row stays focused on the common controls (search + date
    // range). The badge on the trigger button shows how many of these
    // are non-default, so a glance tells staff whether the view is
    // narrowed.
    const moreFiltersOpen = ref(false)
    const extraFiltersCount = computed(() => {
      let n = 0
      if (!sameStatuses(statuses.value, defaultStatuses.value)) n += 1
      if (doctorIds.value.length > 0) n += 1
      // Sort has no meaning on a time grid.
      if (!isCalendar.value && sortBy.value !== 'scheduled_asc') n += 1
      return n
    })

    // Bound to listStatuses directly (not the mode-aware `statuses`) so
    // flipping to Calendar doesn't change the list's key / reset its page.
    const filter = computed(() => ({
      patientSearch: debouncedSearch.value,
      statuses: listStatuses.value,
      doctorIds: doctorIds.value,
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

    const hasNonDefaultFilter = computed(() => {
      const common =
        debouncedSearch.value.trim().length > 0 ||
        !sameStatuses(statuses.value, defaultStatuses.value) ||
        doctorIds.value.length > 0
      if (isCalendar.value) return common
      return (
        common ||
        dateFrom.value !== today ||
        dateTo.value !== today ||
        sortBy.value !== 'scheduled_asc'
      )
    })

    const resetFilters = () => {
      searchInput.value = ''
      statuses.value = [...defaultStatuses.value]
      doctorIds.value = []
      if (isCalendar.value) return
      sortBy.value = 'scheduled_asc'
      setRange('today')
    }

    // ---------- calendar ----------
    const calView = useLocalStorage<CalendarView>(
      'appointments:calendar-view',
      'week',
    )
    const calDate = ref(new Date())
    // Below md the week grid is unreadable; phones get Day only.
    const isNarrow = useMediaQuery('(max-width: 767px)')
    const effectiveView = computed<CalendarView>(() =>
      isNarrow.value ? 'day' : calView.value,
    )

    const calRange = computed<CalendarRange>(() => {
      const w = calendarWindow(effectiveView.value, calDate.value)
      return {
        from: w.from.toISOString(),
        to: w.to.toISOString(),
        patientSearch: debouncedSearch.value,
        statuses: calStatuses.value,
        doctorIds: doctorIds.value,
      }
    })
    const {
      data: calData,
      isLoading: calLoading,
      isError: calIsError,
      error: calError,
      isFetching: calFetching,
    } = useAppointmentsRange(calRange, isCalendar)
    const calRows = computed(() => calData.value ?? [])

    const rescheduleMut = useRescheduleAppointment()
    const onReschedule = (r: RescheduleRequest) => {
      rescheduleMut.mutate({ id: r.appointment.id, patch: r.patch })
    }

    const toggleStatus = (s: AppointmentStatus) => {
      statuses.value = statuses.value.includes(s)
        ? statuses.value.filter((x) => x !== s)
        : [...statuses.value, s]
    }

    const toggleDoctor = (id: string) => {
      doctorIds.value = doctorIds.value.includes(id)
        ? doctorIds.value.filter((x) => x !== id)
        : [...doctorIds.value, id]
    }

    // ---------- form / dialogs ----------
    const formOpen = ref(false)
    const editing = ref<Appointment | null>(null)
    // Calendar pre-fills (slot click) + whether the dialog should carry
    // row actions (opened from a calendar block rather than the table).
    const slotAt = ref<Date | null>(null)
    const slotDoctor = ref<Profile | null>(null)
    const fromCalendar = ref(false)

    const openNew = () => {
      editing.value = null
      slotAt.value = null
      slotDoctor.value = null
      fromCalendar.value = false
      formOpen.value = true
    }
    const openEdit = (a: Appointment) => {
      editing.value = a
      fromCalendar.value = false
      formOpen.value = true
    }
    const openFromBlock = (a: Appointment) => {
      editing.value = a
      fromCalendar.value = true
      formOpen.value = true
    }
    const openFromSlot = (s: SlotClick) => {
      editing.value = null
      fromCalendar.value = false
      slotAt.value = s.at
      slotDoctor.value = s.doctorId
        ? ((doctors.value ?? []).find((d) => d.user_id === s.doctorId) ??
          (calRows.value.find((a) => a.assigned_doctor_id === s.doctorId)
            ?.assigned_doctor as Profile | undefined) ??
          null)
        : null
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
                {isCalendar.value
                  ? calLoading.value
                    ? 'Loading…'
                    : `${calRows.value.length} in view`
                  : isLoading.value
                    ? 'Loading…'
                    : `${total.value} appointment${total.value === 1 ? '' : 's'}`}
              </p>
            </div>
            <div class="flex items-center gap-2">
            <div
              class="inline-flex rounded-md border border-border p-0.5 bg-background"
              role="tablist"
              aria-label="Appointments layout"
            >
              {(
                [
                  { value: 'list', label: 'List', icon: List },
                  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
                ] as const
              ).map((m) => {
                const active = mode.value === m.value
                const Icon = m.icon
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={m.label}
                    onClick={() => (mode.value = m.value)}
                    class={[
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    <Icon class="size-4" />
                    <span class="hidden sm:inline">{m.label}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={openNew}
              class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap hover:bg-primary/90"
            >
              <Plus class="size-4" />
              <span>New appointment</span>
            </button>
            </div>
          </div>

          {/* Primary filter row — search + date range chips only.
              Status / doctor / sort live in the More-filters modal so
              the bar stays clean for the common "show me today's
              roster" flow. */}
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

            {!isCalendar.value && (
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
            )}

            {!isCalendar.value && rangeMode.value === 'custom' && (
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

            {hasNonDefaultFilter.value && (
              <button
                type="button"
                onClick={resetFilters}
                class="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Reset filters to today"
                aria-label="Reset filters"
              >
                <X class="size-3.5" />
              </button>
            )}
          </div>

          {isCalendar.value && (
            <CalendarToolbar
              view={effectiveView.value}
              date={calDate.value}
              compact={isNarrow.value}
              onUpdate:view={(v: CalendarView) => (calView.value = v)}
              onUpdate:date={(d: Date) => (calDate.value = d)}
            />
          )}

          {(isCalendar.value ? calIsError.value : isError.value) && (
            <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {((isCalendar.value ? calError.value : error.value) as {
                message?: string
              })?.message ?? 'Failed to load appointments.'}
            </div>
          )}
        </div>

        {isCalendar.value ? (
          <div
            class={[
              'flex-1 min-h-[480px]',
              calFetching.value && !calLoading.value
                ? 'opacity-80 transition-opacity'
                : '',
            ].join(' ')}
          >
            {calLoading.value ? (
              <div class="h-full rounded-md bg-muted/40 animate-pulse" />
            ) : (
              <AppointmentsCalendar
                appointments={calRows.value}
                doctors={doctors.value ?? []}
                view={effectiveView.value}
                selectedDate={calDate.value}
                saving={rescheduleMut.isPending.value}
                onUpdate:view={(v: CalendarView) => (calView.value = v)}
                onUpdate:selectedDate={(d: Date) => (calDate.value = d)}
                onSlotClick={openFromSlot}
                onEventClick={openFromBlock}
                onReschedule={onReschedule}
              />
            )}
          </div>
        ) : (
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
        )}

        {!isCalendar.value && !isLoading.value && !isError.value && total.value > 0 && (
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
          initialScheduledAt={slotAt.value}
          initialDoctor={slotDoctor.value}
          showStatusActions={fromCalendar.value}
          onUpdate:open={(v: boolean) => (formOpen.value = v)}
          onMarkDone={(a: Appointment) => {
            formOpen.value = false
            markDone(a)
          }}
          onCancelAppt={(a: Appointment) => {
            formOpen.value = false
            requestCancel(a)
          }}
          onRestore={(a: Appointment) => {
            formOpen.value = false
            restore(a)
          }}
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

        <Modal
          open={moreFiltersOpen.value}
          title="More filters"
          size="max-w-md"
          onUpdate:open={(v: boolean) => (moreFiltersOpen.value = v)}
        >
          <div class="space-y-5">
            <div>
              <h3 class="text-sm font-medium mb-2">Status</h3>
              <div class="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => {
                  const active = statuses.value.includes(s.value)
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleStatus(s.value)}
                      class={[
                        'h-7 px-3 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
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
            </div>

            {(doctors.value?.length ?? 0) > 0 && (
              <div>
                <h3 class="text-sm font-medium mb-2">Doctor</h3>
                <div class="flex flex-wrap gap-1.5">
                  {(doctors.value ?? []).map((d) => {
                    const active = doctorIds.value.includes(d.user_id)
                    return (
                      <button
                        key={d.user_id}
                        type="button"
                        onClick={() => toggleDoctor(d.user_id)}
                        class={[
                          'h-7 px-3 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
                          active
                            ? 'bg-accent text-accent-foreground border-transparent'
                            : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                        ].join(' ')}
                      >
                        {d.display_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {!isCalendar.value && (
            <div>
              <h3 class="text-sm font-medium mb-2">Sort by</h3>
              <select
                aria-label="Sort appointments by"
                value={sortBy.value}
                onChange={(e: Event) =>
                  (sortBy.value = (e.target as HTMLSelectElement)
                    .value as AppointmentsSortBy)
                }
                class="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            )}

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
