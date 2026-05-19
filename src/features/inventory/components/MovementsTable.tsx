import { defineComponent, type PropType } from 'vue'
import type { StockMovement } from '../types'

function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return '—'
  }
}

function typeLabel(t: string) {
  return t
    .replace('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function pillClass(t: string, qty: number) {
  if (t === 'PURCHASE' || (t === 'ADJUSTMENT' && qty > 0)) {
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
  }
  return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
}

export default defineComponent({
  name: 'MovementsTable',
  props: {
    movements: { type: Array as PropType<StockMovement[]>, required: true },
  },
  setup(props) {
    return () => {
      if (props.movements.length === 0) {
        return (
          <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground text-sm">
            No movements yet. Use "Record Movement" to add the first one.
          </div>
        )
      }
      return (
        <div class="overflow-x-auto rounded-md border border-border">
          <table class="w-full text-sm">
            <thead class="bg-muted/40 text-muted-foreground">
              <tr class="text-left">
                <th class="px-4 py-2 font-medium">When</th>
                <th class="px-4 py-2 font-medium">Type</th>
                <th class="px-4 py-2 font-medium text-right">Qty</th>
                <th class="px-4 py-2 font-medium">Patient</th>
                <th class="px-4 py-2 font-medium">By</th>
                <th class="px-4 py-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {props.movements.map((m) => (
                <tr key={m.id} class="border-t border-border">
                  <td class="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDate(m.created_at)}
                  </td>
                  <td class="px-4 py-2">
                    <span
                      class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${pillClass(m.movement_type, m.quantity)}`}
                    >
                      {typeLabel(m.movement_type)}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-right tabular-nums font-medium">
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td class="px-4 py-2 text-muted-foreground">
                    {m.patient?.name ?? '—'}
                  </td>
                  <td class="px-4 py-2 text-muted-foreground">
                    {m.created_by_display ?? '—'}
                  </td>
                  <td class="px-4 py-2 text-muted-foreground">
                    {m.remarks ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  },
})
