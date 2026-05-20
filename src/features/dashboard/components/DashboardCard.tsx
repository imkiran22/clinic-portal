import { defineComponent, type PropType, type Slot } from 'vue'

type CardAccent = 'default' | 'warn' | 'danger' | 'info'

const accentBorder: Record<CardAccent, string> = {
  default: 'border-border',
  warn: 'border-amber-500/40',
  danger: 'border-red-500/40',
  info: 'border-sky-500/40',
}

// Mirrors the inventory StockBadge palette so colors stay legible in both
// light and dark themes (text-destructive collapses to a dark red in dark mode).
const accentBadge: Record<CardAccent, string> = {
  default: 'bg-muted text-muted-foreground',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-400',
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
}

export default defineComponent({
  name: 'DashboardCard',
  props: {
    title: { type: String, required: true },
    hint: { type: String, default: '' },
    count: { type: Number as PropType<number | null>, default: null },
    loading: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
    accent: { type: String as PropType<CardAccent>, default: 'default' },
    viewAllLabel: { type: String, default: '' },
  },
  emits: ['viewAll'],
  setup(props, { slots, emit }) {
    return () => {
      const hasError = !!props.errorMessage
      const empty =
        !props.loading && !hasError && (props.count === 0 || props.count == null)
      return (
        <div
          class={`rounded-lg border ${accentBorder[props.accent]} bg-card flex flex-col`}
        >
          <div class="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{props.title}</div>
              {props.hint && (
                <div class="text-xs text-muted-foreground mt-0.5">
                  {props.hint}
                </div>
              )}
            </div>
            {props.loading ? (
              <div class="h-6 w-10 rounded-md bg-muted/60 animate-pulse" />
            ) : hasError ? (
              <span class="px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-700 dark:text-red-400">
                Error
              </span>
            ) : (
              <span
                class={`px-2 py-0.5 rounded text-sm font-semibold tabular-nums ${accentBadge[props.accent]}`}
              >
                {props.count ?? 0}
              </span>
            )}
          </div>

          <div class="flex-1 min-h-0 px-2 py-2">
            {props.loading && (
              <div class="space-y-1 px-2 py-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} class="h-7 rounded-md bg-muted/40 animate-pulse" />
                ))}
              </div>
            )}
            {!props.loading && hasError && (
              <div class="px-2 py-3 text-sm text-red-700 dark:text-red-400">
                {props.errorMessage}
              </div>
            )}
            {!props.loading && !hasError && empty && (
              <div class="px-2 py-6 text-center text-sm text-muted-foreground">
                {slots.empty ? (slots.empty as Slot)() : 'Nothing to show.'}
              </div>
            )}
            {!props.loading && !hasError && !empty && slots.default?.()}
          </div>

          {props.viewAllLabel && (
            <button
              type="button"
              onClick={() => emit('viewAll')}
              class="border-t border-border px-4 py-2 text-xs text-muted-foreground hover:bg-accent text-left"
            >
              {props.viewAllLabel} →
            </button>
          )}
        </div>
      )
    }
  },
})
