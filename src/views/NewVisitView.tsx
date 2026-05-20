import { defineComponent, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import PatientPicker from '@/features/patients/components/PatientPicker'
import PrescriptionLines, {
  type PrescriptionLine,
} from '@/features/visits/components/PrescriptionLines'
import { useCreateVisit } from '@/features/visits/composables/useVisitMutations'
import { patientService } from '@/features/patients/services/patientService'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/features/patients/types'

type FormState = {
  patient: Patient | null
  doctor_notes: string
  treatment_details: string
  followup_date: string
  lines: PrescriptionLine[]
}

function trimOrNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

export default defineComponent({
  name: 'NewVisitView',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const createMut = useCreateVisit()

    const state = reactive<FormState>({
      patient: null,
      doctor_notes: '',
      treatment_details: '',
      followup_date: '',
      lines: [],
    })

    const formError = ref<string | null>(null)
    const lineErrors = ref<(string | null)[]>([])

    // Optional ?patient_id=... — pre-select the patient when arriving from
    // PatientDetailView. Silent failure is fine; the picker stays empty.
    onMounted(async () => {
      const pid = route.query.patient_id
      if (typeof pid === 'string' && pid) {
        try {
          const p = await patientService.get(supabase, pid)
          if (p) state.patient = p
        } catch {
          /* ignore */
        }
      }
    })

    const validate = (): boolean => {
      formError.value = null
      lineErrors.value = state.lines.map(() => null)

      if (!state.patient) {
        formError.value = 'Please select a patient'
        return false
      }

      let ok = true
      state.lines.forEach((line, idx) => {
        if (!line.product) {
          lineErrors.value[idx] = 'Pick a product'
          ok = false
          return
        }
        const q = Number(line.quantity)
        if (!Number.isInteger(q) || q < 1) {
          lineErrors.value[idx] = 'Quantity must be a positive whole number'
          ok = false
          return
        }
        if (q > line.product.current_stock) {
          lineErrors.value[idx] = `Only ${line.product.current_stock} in stock`
          ok = false
        }
      })

      // Catch duplicate product lines — the RPC would happily double-charge
      // stock, but the user almost certainly meant a single line with a
      // higher quantity.
      const seen = new Map<string, number>()
      state.lines.forEach((line, idx) => {
        if (!line.product) return
        const prev = seen.get(line.product.id)
        if (prev !== undefined) {
          lineErrors.value[idx] = 'Same product is already on line ' + (prev + 1)
          ok = false
        } else {
          seen.set(line.product.id, idx)
        }
      })

      return ok
    }

    const onSubmit = async (e: Event) => {
      e.preventDefault()
      if (!validate()) return

      try {
        await createMut.mutateAsync({
          patient_id: state.patient!.id,
          doctor_notes: trimOrNull(state.doctor_notes),
          treatment_details: trimOrNull(state.treatment_details),
          followup_date: state.followup_date || null,
          prescribed_products: state.lines.map((l) => ({
            product_id: l.product!.id,
            quantity: Number(l.quantity),
          })),
        })
        router.push({ name: 'visits' })
      } catch {
        // toast surfaced by mutation; RPC raises name the failing line
      }
    }

    return () => (
      <div class="space-y-4 max-w-3xl">
        <button
          type="button"
          onClick={() => router.push({ name: 'visits' })}
          class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="size-4" />
          <span>Back to visits</span>
        </button>

        <div>
          <h1 class="text-2xl font-semibold tracking-tight">New visit</h1>
          <p class="text-sm text-muted-foreground mt-1">
            Record the visit and dispense prescribed products in one go. If any
            line is short on stock, the whole visit rolls back.
          </p>
        </div>

        <form onSubmit={onSubmit} class="space-y-5" novalidate>
          <div>
            <label class="text-sm font-medium">
              Patient <span class="text-destructive ml-0.5">*</span>
            </label>
            <div class="mt-1">
              <PatientPicker
                modelValue={state.patient}
                onUpdate:modelValue={(p: Patient | null) =>
                  (state.patient = p)
                }
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium" for="visit-followup">
                Follow-up date
              </label>
              <input
                id="visit-followup"
                type="date"
                value={state.followup_date}
                onInput={(e: Event) =>
                  (state.followup_date = (e.target as HTMLInputElement).value)
                }
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label class="text-sm font-medium" for="visit-notes">
              Doctor notes
            </label>
            <textarea
              id="visit-notes"
              rows={3}
              value={state.doctor_notes}
              onInput={(e: Event) =>
                (state.doctor_notes = (e.target as HTMLTextAreaElement).value)
              }
              placeholder="Diagnosis, observations, advice…"
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          <div>
            <label class="text-sm font-medium" for="visit-treatment">
              Treatment details
            </label>
            <textarea
              id="visit-treatment"
              rows={2}
              value={state.treatment_details}
              onInput={(e: Event) =>
                (state.treatment_details = (
                  e.target as HTMLTextAreaElement
                ).value)
              }
              placeholder="Procedures performed during the visit…"
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          <div>
            <div class="flex items-baseline justify-between mb-2">
              <h2 class="text-sm font-medium">Prescribed products</h2>
              <p class="text-xs text-muted-foreground">
                Each line dispenses the product from stock atomically.
              </p>
            </div>
            <PrescriptionLines
              modelValue={state.lines}
              errors={lineErrors.value}
              onUpdate:modelValue={(next: PrescriptionLine[]) => {
                state.lines = next
                lineErrors.value = next.map(() => null)
              }}
            />
          </div>

          {formError.value && (
            <p class="text-sm text-destructive" role="alert">
              {formError.value}
            </p>
          )}

          <div class="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.push({ name: 'visits' })}
              class="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending.value}
              class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
            >
              {createMut.isPending.value ? 'Saving…' : 'Save visit'}
            </button>
          </div>
        </form>
      </div>
    )
  },
})
