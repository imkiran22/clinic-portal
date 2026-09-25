import { computed, defineComponent, type PropType } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
} from 'date-fns'
import type { CalendarView } from './AppointmentsCalendar'

const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export function stepDate(
  date: Date,
  view: CalendarView,
  dir: 1 | -1,
): Date {
  if (view === 'day') {
    // Skip Sundays (hidden in the grid) so Next/Prev never lands on an
    // empty closed day.
    let d = addDays(date, dir)
    if (d.getDay() === 0) d = addDays(d, dir)
    return d
  }
  if (view === 'week') return addWeeks(date, dir)
  return addMonths(date, dir)
}

export default defineComponent({
  name: 'CalendarToolbar',
  props: {
    view: { type: String as PropType<CalendarView>, required: true },
    date: { type: Date, required: true },
    // Phones are locked to Day view — the week grid is unreadable at
    // ~375px.
    compact: { type: Boolean, default: false },
  },
  emits: ['update:view', 'update:date'],
  setup(props, { emit }) {
    const label = computed(() => {
      const d = props.date
      if (props.view === 'day') return format(d, 'EEE, d MMM yyyy')
      if (props.view === 'month') return format(d, 'MMMM yyyy')
      const s = startOfWeek(d, { weekStartsOn: 1 })
      const e = endOfWeek(d, { weekStartsOn: 1 })
      return isSameMonth(s, e)
        ? `${format(s, 'd')} – ${format(e, 'd MMM yyyy')}`
        : `${format(s, 'd MMM')} – ${format(e, 'd MMM yyyy')}`
    })

    const btn =
      'inline-flex items-center justify-center h-7 rounded-md border border-border bg-background text-xs hover:bg-accent'

    return () => (
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <div class="flex items-center gap-1">
          <button
            type="button"
            class={`${btn} w-7`}
            aria-label="Previous"
            onClick={() => emit('update:date', stepDate(props.date, props.view, -1))}
          >
            <ChevronLeft class="size-4" />
          </button>
          <button
            type="button"
            class={`${btn} px-3 font-medium`}
            onClick={() => emit('update:date', new Date())}
          >
            Today
          </button>
          <button
            type="button"
            class={`${btn} w-7`}
            aria-label="Next"
            onClick={() => emit('update:date', stepDate(props.date, props.view, 1))}
          >
            <ChevronRight class="size-4" />
          </button>
        </div>

        <span class="font-medium tabular-nums min-w-[10rem]">{label.value}</span>

        {!props.compact && (
          <div
            class="ml-auto inline-flex rounded-md border border-border p-0.5 bg-background"
            role="tablist"
            aria-label="Calendar view"
          >
            {VIEWS.map((v) => {
              const active = props.view === v.value
              return (
                <button
                  key={v.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => emit('update:view', v.value)}
                  class={[
                    'h-6 px-3 rounded text-xs font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  },
})
