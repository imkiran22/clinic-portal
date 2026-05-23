import { defineComponent, type PropType } from 'vue'
import type { AppointmentStatus } from '../types'

// Match the same palette as existing pills elsewhere — sky for "ongoing"
// states (Scheduled, like Today's follow-ups), emerald for completed
// positives (Done), muted neutral for terminal-non-positive (Cancelled).
const STYLES: Record<AppointmentStatus, { label: string; pill: string }> = {
  scheduled: {
    label: 'Scheduled',
    pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  done: {
    label: 'Done',
    pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-muted text-muted-foreground',
  },
}

export default defineComponent({
  name: 'AppointmentStatusPill',
  props: {
    status: { type: String as PropType<AppointmentStatus>, required: true },
  },
  setup(props) {
    return () => {
      const meta = STYLES[props.status]
      return (
        <span
          class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.pill}`}
        >
          {meta.label}
        </span>
      )
    }
  },
})
