import {
  computed,
  defineComponent,
  nextTick,
  ref,
  watch,
  type PropType,
} from 'vue'
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'
import './appointmentsCalendar.css'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { Profile } from '@/features/auth/services/authService'
import {
  DAY_END,
  DAY_START,
  DEFAULT_DURATION,
  HIDDEN_WEEKDAYS,
  SLOT_MINUTES,
  clampDuration,
} from '../calendarConfig'
import type { Appointment, AppointmentReschedule } from '../types'

export type CalendarView = 'day' | 'week' | 'month'

export type SlotClick = { at: Date; doctorId: string | null }

export type RescheduleRequest = {
  appointment: Appointment
  patch: AppointmentReschedule
}

// Split id for appointments with no assigned doctor. vue-cal only
// reports a split when it's truthy, so this must be a non-empty string.
const UNASSIGNED = 'unassigned'

type Column = { id: string; label: string }

// What we hand vue-cal. Extra keys (appointmentId) survive its internal
// copy and come back on drop / resize / click payloads.
type CalEvent = {
  start: Date
  end: Date
  title: string
  class: string
  split?: string
  draggable: boolean
  resizable: boolean
  deletable: false
  appointmentId: string
}

function endOf(a: Appointment): Date {
  const start = new Date(a.scheduled_at)
  return new Date(
    start.getTime() + (a.duration_minutes ?? DEFAULT_DURATION) * 60_000,
  )
}

function initials(name: string): string {
  return name
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

// Explicit hour12 so blocks match the grid's 12h labels regardless of
// the browser locale (en-IN defaults to 24h).
const timeFmt = (d: Date) =>
  d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })

const TIME_CELL_HEIGHT = 44 // px per timeStep row

export default defineComponent({
  name: 'AppointmentsCalendar',
  props: {
    appointments: {
      type: Array as PropType<Appointment[]>,
      required: true,
    },
    doctors: { type: Array as PropType<Profile[]>, default: () => [] },
    view: { type: String as PropType<CalendarView>, required: true },
    selectedDate: { type: Date, required: true },
    // Mutation in flight — disables the confirm button.
    saving: { type: Boolean, default: false },
  },
  emits: [
    'update:view',
    'update:selectedDate',
    'slotClick',
    'eventClick',
    'reschedule',
  ],
  setup(props, { emit }) {
    const byId = computed(
      () => new Map(props.appointments.map((a) => [a.id, a])),
    )

    // Doctor columns = roster ∪ anyone actually assigned in this window.
    // useDoctors is role='doctor' and capped at 20, so a stale
    // assignment (profile changed role) would otherwise have no column
    // and vue-cal would silently not render the block.
    const columns = computed<Column[]>(() => {
      const cols = new Map<string, string>()
      for (const d of props.doctors) cols.set(d.user_id, d.display_name)
      for (const a of props.appointments) {
        if (a.assigned_doctor_id && !cols.has(a.assigned_doctor_id)) {
          cols.set(
            a.assigned_doctor_id,
            a.assigned_doctor?.display_name ?? 'Other doctor',
          )
        }
      }
      return [
        ...Array.from(cols, ([id, label]) => ({ id, label })),
        { id: UNASSIGNED, label: 'Unassigned' },
      ]
    })

    // Per-doctor columns only make sense in day view with >1 column
    // actually worth showing (a single doctor + empty "Unassigned" is
    // just a narrower day).
    const useSplits = computed(
      () => props.view === 'day' && columns.value.length >= 2,
    )

    const splitDays = computed(() =>
      useSplits.value
        ? columns.value.map((c) => ({
            id: c.id,
            label: c.label,
            class: c.id === UNASSIGNED ? 'appt-split--unassigned' : '',
          }))
        : [],
    )

    const events = computed<CalEvent[]>(() =>
      props.appointments.map((a) => {
        const editable = a.status === 'scheduled'
        const ev: CalEvent = {
          start: new Date(a.scheduled_at),
          end: endOf(a),
          title: a.patient?.name ?? 'Patient',
          class: `appt-block appt-block--${a.status}`,
          draggable: editable,
          resizable: editable,
          deletable: false,
          appointmentId: a.id,
        }
        if (useSplits.value) ev.split = a.assigned_doctor_id ?? UNASSIGNED
        return ev
      }),
    )

    // Bumped to force vue-cal to rebuild from `events` — needed when a
    // drop is cancelled, since vue-cal has already moved its internal
    // copy of the block and the prop itself hasn't changed.
    const renderKey = ref(0)
    const rootEl = ref<HTMLElement | null>(null)

    // vue-cal reports the split id (string from data-split); accept the
    // object form too in case that changes.
    // Rebuild vue-cal (see renderKey) without losing the scroll position.
    const rerender = () => {
      const top =
        rootEl.value?.querySelector<HTMLElement>('.vuecal__bg')?.scrollTop ?? 0
      renderKey.value++
      nextTick(() =>
        requestAnimationFrame(() => {
          const bg = rootEl.value?.querySelector<HTMLElement>('.vuecal__bg')
          if (bg) bg.scrollTop = top
        }),
      )
    }

    const splitToDoctor = (split: unknown): string | null => {
      const id =
        split && typeof split === 'object' && 'id' in split
          ? (split as { id: unknown }).id
          : split
      return typeof id === 'string' && id !== UNASSIGNED ? id : null
    }

    // Grid bounds stretch to fit out-of-hours bookings (the form allows
    // any time) so nothing in the window is silently clipped.
    const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
    const timeFrom = computed(() => {
      let m = DAY_START
      for (const a of props.appointments) {
        m = Math.min(m, Math.floor(minutesOfDay(new Date(a.scheduled_at)) / 60) * 60)
      }
      return m
    })
    const timeTo = computed(() => {
      let m = DAY_END
      for (const a of props.appointments) {
        const s = new Date(a.scheduled_at)
        const e = endOf(a)
        // Runs past midnight → clamp to end of day.
        const endMin =
          e.toDateString() === s.toDateString() ? minutesOfDay(e) : 24 * 60
        m = Math.max(m, Math.ceil(endMin / 60) * 60)
      }
      return Math.min(m, 24 * 60)
    })

    // Sunday is hidden (clinic closed) unless something is actually
    // booked on one, and never in day view (Today on a Sunday).
    const hiddenWeekdays = computed(() =>
      props.view === 'day' ||
      props.appointments.some((a) => new Date(a.scheduled_at).getDay() === 0)
        ? []
        : HIDDEN_WEEKDAYS,
    )

    const doctorName = (id: string | null) =>
      id ? (columns.value.find((c) => c.id === id)?.label ?? 'doctor') : null

    // ---------- slot click ----------
    const onCellClick = (
      payload: Date | { date: Date | null; split: unknown } | null,
    ) => {
      // vue-cal fills the date from the preceding mousedown; a keyboard
      // Enter (or any click without one) arrives with null — ignore it
      // rather than crash the view.
      const date = payload instanceof Date ? payload : (payload?.date ?? null)
      const split = payload instanceof Date ? null : (payload?.split ?? null)
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return

      if (props.view === 'month') {
        emit('update:selectedDate', date)
        emit('update:view', 'day')
        return
      }
      // Week-view day heading click arrives as bare midnight — treat it
      // as "open that day" rather than "book at 00:00".
      if (
        props.view === 'week' &&
        date.getHours() === 0 &&
        date.getMinutes() === 0
      ) {
        emit('update:selectedDate', date)
        emit('update:view', 'day')
        return
      }

      const at = new Date(date)
      const mins = at.getHours() * 60 + at.getMinutes()
      const snapped = Math.floor(mins / SLOT_MINUTES) * SLOT_MINUTES
      const clamped = Math.min(
        Math.max(snapped, timeFrom.value),
        timeTo.value - SLOT_MINUTES,
      )
      at.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0)
      emit('slotClick', {
        at,
        doctorId: useSplits.value ? splitToDoctor(split) : null,
      } satisfies SlotClick)
    }

    const onEventClick = (ev: CalEvent, e: Event) => {
      e?.stopPropagation?.()
      const appt = byId.value.get(ev.appointmentId)
      if (appt) emit('eventClick', appt)
    }

    // ---------- drag (confirm first) ----------
    const pendingMove = ref<RescheduleRequest | null>(null)

    const onEventDrop = (params: {
      event: CalEvent
      newSplit?: unknown
    }) => {
      const appt = byId.value.get(params.event.appointmentId)
      if (!appt) return
      const start = new Date(params.event.start)
      const doctorId =
        useSplits.value && 'newSplit' in params
          ? splitToDoctor(params.newSplit)
          : appt.assigned_doctor_id
      const unchanged =
        start.getTime() === new Date(appt.scheduled_at).getTime() &&
        doctorId === appt.assigned_doctor_id
      if (unchanged) return
      pendingMove.value = {
        appointment: appt,
        patch: {
          scheduled_at: start.toISOString(),
          duration_minutes: appt.duration_minutes ?? DEFAULT_DURATION,
          assigned_doctor_id: doctorId,
        },
      }
    }

    const confirmMove = () => {
      if (!pendingMove.value) return
      emit('reschedule', pendingMove.value)
      pendingMove.value = null
    }
    const cancelMove = () => {
      pendingMove.value = null
      rerender()
    }

    const moveMessage = computed(() => {
      const m = pendingMove.value
      if (!m) return ''
      const when = new Date(m.patch.scheduled_at)
      const day = when.toLocaleDateString([], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      const who = m.appointment.patient
      const patient = who
        ? `${who.name}${who.legacy_client_no ? ` (#${who.legacy_client_no})` : ''}`
        : 'this appointment'
      const doc =
        m.patch.assigned_doctor_id !== m.appointment.assigned_doctor_id
          ? m.patch.assigned_doctor_id
            ? ` with ${doctorName(m.patch.assigned_doctor_id)}`
            : ' as unassigned'
          : ''
      return `Move ${patient} to ${day}, ${timeFmt(when)}${doc}?`
    })

    // ---------- resize (applies immediately) ----------
    const onEventDurationChange = (params: { event: CalEvent }) => {
      const appt = byId.value.get(params.event.appointmentId)
      if (!appt) return
      const start = new Date(appt.scheduled_at)
      const raw =
        (new Date(params.event.end).getTime() - start.getTime()) / 60_000
      const duration = clampDuration(
        Math.round(raw / SLOT_MINUTES) * SLOT_MINUTES || SLOT_MINUTES,
      )
      if (duration === appt.duration_minutes) {
        rerender()
        return
      }
      emit('reschedule', {
        appointment: appt,
        patch: {
          scheduled_at: appt.scheduled_at,
          duration_minutes: duration,
          assigned_doctor_id: appt.assigned_doctor_id,
        },
      } satisfies RescheduleRequest)
    }

    // vue-cal's own navigation (e.g. keyboard) — keep the parent in sync.
    const onViewChange = (p: { id: string; startDate: Date }) => {
      if (p.id !== props.view && ['day', 'week', 'month'].includes(p.id)) {
        emit('update:view', p.id as CalendarView)
      }
    }

    // ---------- initial scroll ----------
    // A 9am–9pm grid doesn't fit on screen, so evening bookings would sit
    // below the fold. Scroll to the earliest appointment in view, else to
    // "now" when today is visible, else leave it at opening time.
    const scrollToRelevant = async () => {
      if (props.view === 'month') return
      await nextTick()
      // vue-cal renders its body a tick after mount.
      requestAnimationFrame(() => {
        const bg = rootEl.value?.querySelector<HTMLElement>('.vuecal__bg')
        if (!bg) return
        const starts = props.appointments.map((a) =>
          minutesOfDay(new Date(a.scheduled_at)),
        )
        let target: number | null = starts.length ? Math.min(...starts) : null
        if (target === null) {
          const now = new Date()
          const w = weekOrDayRange()
          if (now >= w.from && now < w.to) target = minutesOfDay(now)
        }
        if (target === null) return
        const rowMinutes = SLOT_MINUTES * 2
        const px = ((target - timeFrom.value) / rowMinutes) * TIME_CELL_HEIGHT
        bg.scrollTop = Math.max(0, px - TIME_CELL_HEIGHT)
      })
    }
    const weekOrDayRange = () => {
      const from = new Date(props.selectedDate)
      from.setHours(0, 0, 0, 0)
      if (props.view === 'week') {
        const dow = (from.getDay() + 6) % 7 // Mon = 0
        from.setDate(from.getDate() - dow)
      }
      const to = new Date(from)
      to.setDate(to.getDate() + (props.view === 'week' ? 7 : 1))
      return { from, to }
    }
    // Only on navigation (view / date) plus the first data that lands
    // for it — a later background refetch shouldn't yank the user's
    // scroll position.
    let pendingScroll = true
    watch(
      () => [props.view, props.selectedDate.getTime()],
      () => {
        pendingScroll = true
        scrollToRelevant()
      },
      { immediate: true },
    )
    watch(
      () => props.appointments,
      () => {
        if (!pendingScroll) return
        pendingScroll = false
        scrollToRelevant()
      },
    )

    // ---------- slots ----------
    // Block layout by length: a 15-min slot is ~20px tall, so it gets a
    // single line (name + start time); ~30 min gets two lines; longer
    // blocks get name / treatment / time range.
    const renderEvent = ({ event }: { event: CalEvent }) => {
      const a = byId.value.get(event.appointmentId)
      if (!a) return null
      const start = new Date(a.scheduled_at)
      const mins = a.duration_minutes ?? DEFAULT_DURATION
      const tier = mins <= 20 ? 'short' : mins <= 40 ? 'medium' : 'long'
      const doctorInitials =
        !useSplits.value && a.assigned_doctor?.display_name
          ? initials(a.assigned_doctor.display_name)
          : null

      const header = (
        <div class="appt-block__row">
          <span class="font-medium truncate">{a.patient?.name ?? 'Patient'}</span>
          {a.patient?.legacy_client_no && (
            <span class="appt-block__no opacity-70 tabular-nums shrink-0">
              #{a.patient.legacy_client_no}
            </span>
          )}
          {a.session_number !== null && (
            <span class="appt-block__badge shrink-0">S{a.session_number}</span>
          )}
          {/* Week columns are narrow: the block's position already shows
              the time, so give the space to the patient's name. */}
          {tier === 'short' && props.view !== 'week' && (
            <span class="appt-block__time ml-auto shrink-0 opacity-70 tabular-nums">
              {timeFmt(start)}
            </span>
          )}
          {doctorInitials && (
            <span
              class={[
                'shrink-0 opacity-70 text-[10px] font-semibold',
                tier === 'short' && props.view !== 'week' ? '' : 'ml-auto',
              ].join(' ')}
            >
              {doctorInitials}
            </span>
          )}
        </div>
      )

      return (
        <div
          class={`appt-block__inner appt-block__inner--${tier}`}
          title={`${a.patient?.name ?? ''} — ${a.treatment_description} (${timeFmt(start)} – ${timeFmt(endOf(a))})`}
        >
          {header}
          {tier === 'medium' && (
            <div class="truncate opacity-75">
              <span class="tabular-nums">{timeFmt(start)}</span>
              {a.treatment_description ? ` · ${a.treatment_description}` : ''}
            </div>
          )}
          {tier === 'long' && (
            <>
              <div class="truncate opacity-80">{a.treatment_description}</div>
              <div class="opacity-60 tabular-nums">
                {timeFmt(start)} – {timeFmt(endOf(a))}
              </div>
            </>
          )}
        </div>
      )
    }

    const renderEventsCount = ({ events }: { events: unknown[] }) =>
      events.length ? (
        <span class="appt-count">
          {events.length} appt{events.length === 1 ? '' : 's'}
        </span>
      ) : null

    return () => (
      <div ref={rootEl} class="appt-calendar h-full">
        <VueCal
          key={`${renderKey.value}-${props.view}-${useSplits.value}`}
          class="h-full"
          activeView={props.view}
          selectedDate={props.selectedDate}
          disableViews={['years', 'year']}
          hideTitleBar
          hideViewSelector
          hideWeekdays={hiddenWeekdays.value}
          events={events.value}
          splitDays={splitDays.value}
          stickySplitLabels={useSplits.value}
          // No minSplitWidth: it switches vue-cal to its overflow-x layout,
          // which moves the doctor headers inside the vertical scroller so
          // they scroll away. Columns share the width instead (3 fit fine
          // even on a phone).
          timeFrom={timeFrom.value}
          timeTo={timeTo.value}
          timeStep={SLOT_MINUTES * 2}
          timeCellHeight={TIME_CELL_HEIGHT}
          // Its slide/fade replays on every remount (we key by view) and
          // reads as flicker; the app elsewhere doesn't animate.
          transitions={false}
          snapToTime={SLOT_MINUTES}
          twelveHour
          watchRealTime
          eventsCountOnYearView={false}
          // Only drag + resize. `true` would also turn on click-hold
          // delete / create and inline title edit — those only change
          // vue-cal's local copy and would desync from the database.
          editableEvents={{
            drag: true,
            resize: true,
            create: false,
            delete: false,
            title: false,
          }}
          cellClickHold={false}
          dragToCreateEvent={false}
          dblclickToNavigate={false}
          onEventClick={onEventClick}
          onCellClick={onCellClick}
          onEventDrop={onEventDrop}
          onEventDurationChange={onEventDurationChange}
          onViewChange={onViewChange}
          v-slots={{
            event: renderEvent,
            'events-count': renderEventsCount,
          }}
        />

        <ConfirmDialog
          open={!!pendingMove.value}
          title="Move appointment"
          message={moveMessage.value}
          confirmLabel="Move"
          loading={props.saving}
          onUpdate:open={(v: boolean) => {
            if (!v) cancelMove()
          }}
          onConfirm={confirmMove}
        />
      </div>
    )
  },
})
