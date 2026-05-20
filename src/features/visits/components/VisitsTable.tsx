import { defineComponent, type PropType } from 'vue'
import { Pill } from 'lucide-vue-next'
import type { Visit } from '../types'

function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return '—'
  }
}

function formatDay(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString()
  } catch {
    return '—'
  }
}

function truncate(s: string | null | undefined, n: number) {
  if (!s) return null
  const t = s.trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

export default defineComponent({
  name: 'VisitsTable',
  props: {
    visits: { type: Array as PropType<Visit[]>, required: true },
    showPatient: { type: Boolean, default: true },
  },
  emits: ['open'],
  setup(props, { emit }) {
    return () => (
      <div class="overflow-x-auto rounded-md border border-border">
        <table class="w-full text-sm">
          <thead class="bg-muted/40 text-muted-foreground">
            <tr class="text-left">
              <th class="px-4 py-2 font-medium whitespace-nowrap">When</th>
              {props.showPatient && (
                <th class="px-4 py-2 font-medium">Patient</th>
              )}
              <th class="px-4 py-2 font-medium">Notes</th>
              <th class="px-4 py-2 font-medium text-center">Items</th>
              <th class="px-4 py-2 font-medium whitespace-nowrap">Follow-up</th>
              <th class="px-4 py-2 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {props.visits.map((v) => {
              const lineCount = Array.isArray(v.prescribed_products)
                ? v.prescribed_products.length
                : 0
              const note = truncate(v.doctor_notes, 60)
              return (
                <tr
                  key={v.id}
                  onClick={() => emit('open', v)}
                  class="border-t border-border cursor-pointer hover:bg-accent/40"
                >
                  <td class="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDate(v.visit_date)}
                  </td>
                  {props.showPatient && (
                    <td class="px-4 py-2">
                      <div class="font-medium">
                        {v.patient?.name ?? '—'}
                      </div>
                      {v.patient?.legacy_client_no && (
                        <div class="text-xs text-muted-foreground tabular-nums">
                          #{v.patient.legacy_client_no}
                        </div>
                      )}
                    </td>
                  )}
                  <td class="px-4 py-2 text-muted-foreground">
                    {note ?? <span class="italic">No notes</span>}
                  </td>
                  <td class="px-4 py-2 text-center">
                    {lineCount > 0 ? (
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 tabular-nums">
                        <Pill class="size-3" />
                        {lineCount}
                      </span>
                    ) : (
                      <span class="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td class="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDay(v.followup_date)}
                  </td>
                  <td class="px-4 py-2 text-muted-foreground">
                    {v.created_by_display ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  },
})
