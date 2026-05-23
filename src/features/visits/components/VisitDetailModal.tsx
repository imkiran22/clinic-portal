import { computed, defineComponent, type PropType } from 'vue'
import Modal from '@/components/shared/Modal'
import { useVisitMovements } from '../composables/useVisits'
import { formatDateTime as fmtDateTime } from '@/lib/datetime'
import type { Visit } from '../types'

function fmtDay(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-GB')
  } catch {
    return '—'
  }
}

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default defineComponent({
  name: 'VisitDetailModal',
  props: {
    open: { type: Boolean, required: true },
    visit: { type: Object as PropType<Visit | null>, default: null },
  },
  emits: ['update:open'],
  setup(props, { emit }) {
    const visitId = computed(() => (props.open ? props.visit?.id ?? null : null))
    const { data: movements, isLoading } = useVisitMovements(visitId)

    const total = computed(() => {
      const rows = movements.value ?? []
      return rows.reduce((sum, m) => {
        const unit = m.product?.selling_price ?? 0
        // Movements for sales have negative quantity; absolute value = dispensed units.
        return sum + Math.abs(m.quantity) * unit
      }, 0)
    })

    return () => (
      <Modal
        open={props.open}
        title={props.visit ? `Visit · ${fmtDateTime(props.visit.visit_date)}` : 'Visit'}
        size="max-w-2xl"
        onUpdate:open={(v: boolean) => emit('update:open', v)}
      >
        {props.visit && (
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-xs uppercase tracking-wide text-muted-foreground">
                  Patient
                </div>
                <div class="mt-0.5">
                  {props.visit.patient?.name ?? '—'}
                  {props.visit.patient?.legacy_client_no && (
                    <span class="ml-1 text-xs text-muted-foreground tabular-nums">
                      #{props.visit.patient.legacy_client_no}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wide text-muted-foreground">
                  Follow-up
                </div>
                <div class="mt-0.5">{fmtDay(props.visit.followup_date)}</div>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wide text-muted-foreground">
                  Recorded by
                </div>
                <div class="mt-0.5">{props.visit.created_by_display ?? '—'}</div>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wide text-muted-foreground">
                  Recorded at
                </div>
                <div class="mt-0.5">{fmtDateTime(props.visit.created_at)}</div>
              </div>
            </div>

            <div>
              <div class="text-xs uppercase tracking-wide text-muted-foreground">
                Doctor notes
              </div>
              <div class="mt-1 text-sm whitespace-pre-wrap">
                {props.visit.doctor_notes?.trim() || (
                  <span class="text-muted-foreground italic">No notes</span>
                )}
              </div>
            </div>

            <div>
              <div class="text-xs uppercase tracking-wide text-muted-foreground">
                Treatment details
              </div>
              <div class="mt-1 text-sm whitespace-pre-wrap">
                {props.visit.treatment_details?.trim() || (
                  <span class="text-muted-foreground italic">—</span>
                )}
              </div>
            </div>

            <div>
              <div class="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Products dispensed
              </div>
              {isLoading.value ? (
                <div class="space-y-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} class="h-9 rounded-md bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : (movements.value ?? []).length === 0 ? (
                <div class="rounded-md border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
                  Consultation only — no products dispensed.
                </div>
              ) : (
                <div class="overflow-x-auto rounded-md border border-border">
                  <table class="w-full text-sm">
                    <thead class="bg-muted/40 text-muted-foreground">
                      <tr class="text-left">
                        <th class="px-3 py-2 font-medium">Product</th>
                        <th class="px-3 py-2 font-medium text-right">Qty</th>
                        <th class="px-3 py-2 font-medium text-right">Unit</th>
                        <th class="px-3 py-2 font-medium text-right">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(movements.value ?? []).map((m) => {
                        const qty = Math.abs(m.quantity)
                        const unit = m.product?.selling_price ?? 0
                        return (
                          <tr key={m.id} class="border-t border-border">
                            <td class="px-3 py-2">{m.product?.name ?? '—'}</td>
                            <td class="px-3 py-2 text-right tabular-nums">
                              {qty}
                            </td>
                            <td class="px-3 py-2 text-right tabular-nums">
                              {fmtMoney(unit)}
                            </td>
                            <td class="px-3 py-2 text-right tabular-nums font-medium">
                              {fmtMoney(qty * unit)}
                            </td>
                          </tr>
                        )
                      })}
                      <tr class="border-t border-border bg-muted/20">
                        <td colspan={3} class="px-3 py-2 text-right text-muted-foreground">
                          Total
                        </td>
                        <td class="px-3 py-2 text-right tabular-nums font-semibold">
                          {fmtMoney(total.value)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => emit('update:open', false)}
                class="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    )
  },
})
