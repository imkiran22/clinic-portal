import { defineComponent, onMounted, reactive, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CalendarClock, Link2 } from 'lucide-vue-next'
import PatientPicker from '@/features/patients/components/PatientPicker'
import PrescriptionLines, {
  type PrescriptionLine,
} from '@/features/visits/components/PrescriptionLines'
import { useCreateVisit } from '@/features/visits/composables/useVisitMutations'
import { patientService } from '@/features/patients/services/patientService'
import { appointmentService } from '@/features/appointments/services/appointmentService'
import { useSetAppointmentStatus } from '@/features/appointments/composables/useAppointmentMutations'
import { supabase } from '@/lib/supabase'
import { useCan } from '@/features/auth/composables/useCan'
import { useAuth } from '@/features/auth/composables/useAuth'
import { formatDateTime } from '@/lib/datetime'
import DatePicker from '@/components/shared/DatePicker'
import type { Patient } from '@/features/patients/types'
import type { Appointment } from '@/features/appointments/types'

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
    const setApptStatusMut = useSetAppointmentStatus()
    const { canCreateVisit } = useCan()
    const { ready } = useAuth()

    // Optional context — set when arriving from an appointment row.
    // On successful visit save we mark the appointment 'done' and store
    // the visit id on it so the audit trail links both ways.
    const linkedAppointment = ref<Appointment | null>(null)

    // When a doctor picks a patient who has scheduled appointments
    // today (and we don't already have a link from ?appointment_id),
    // surface a "Link to existing appointment?" banner. Explicit click
    // — never silent — so two patients with the same first name don't
    // merge into someone else's slot.
    const suggestedAppointments = ref<Appointment[]>([])

    // Direct URL access guard — limited users typing /visits/new bounce home.
    // Wait for auth to resolve before deciding; otherwise we'd redirect during
    // the initial render when role is still unknown.
    watchEffect(() => {
      if (ready.value && !canCreateVisit.value) {
        router.replace({ name: 'visits' })
      }
    })

    const state = reactive<FormState>({
      patient: null,
      doctor_notes: '',
      treatment_details: '',
      followup_date: '',
      lines: [],
    })

    const formError = ref<string | null>(null)
    const lineErrors = ref<(string | null)[]>([])

    // Re-query today's scheduled appointments whenever the selected
    // patient changes. Skip when the visit is already linked (came in
    // via ?appointment_id) — we know which one it is in that case.
    watch(
      () => state.patient?.id ?? null,
      async (patientId) => {
        if (!patientId || linkedAppointment.value) {
          suggestedAppointments.value = []
          return
        }
        try {
          suggestedAppointments.value =
            await appointmentService.listScheduledForPatientToday(
              supabase,
              patientId,
            )
        } catch {
          // Silent fallback — the banner is a convenience, not a
          // blocker. Doctor can still save and manually mark the
          // appointment done later.
          suggestedAppointments.value = []
        }
      },
      { immediate: false },
    )

    // Linking from the banner: pull treatment context across so the
    // form mirrors the regular Mark-done flow.
    const linkSuggested = (a: Appointment) => {
      linkedAppointment.value = a
      suggestedAppointments.value = []
      if (!state.treatment_details.trim()) {
        const sessionSuffix =
          a.session_number !== null ? ` (session #${a.session_number})` : ''
        state.treatment_details = a.treatment_description + sessionSuffix
      }
    }

    // Optional deep-link query params:
    //   ?patient_id=...    — pre-select a patient (UUID or legacy_client_no)
    //   ?appointment_id=...— came from an appointment row; pre-fill patient
    //                        + treatment_details and remember the link so
    //                        we can mark the appointment done on save.
    onMounted(async () => {
      const apptId = route.query.appointment_id
      if (typeof apptId === 'string' && apptId) {
        try {
          const a = await appointmentService.get(supabase, apptId)
          if (a) {
            linkedAppointment.value = a
            if (a.patient) {
              state.patient = a.patient as unknown as Patient
            }
            const sessionSuffix =
              a.session_number !== null ? ` (session #${a.session_number})` : ''
            state.treatment_details = a.treatment_description + sessionSuffix
            // Done — no need to fall through to the patient-only fetch.
            return
          }
        } catch {
          /* ignore — show the form unlinked */
        }
      }

      const pid = route.query.patient_id
      if (typeof pid !== 'string' || !pid) return
      try {
        const p = /^\d+$/.test(pid)
          ? await patientService.getByLegacyNo(supabase, Number(pid))
          : await patientService.get(supabase, pid)
        if (p) state.patient = p
      } catch {
        /* ignore — picker stays empty, user can pick manually */
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
        const visit = await createMut.mutateAsync({
          patient_id: state.patient!.id,
          doctor_notes: trimOrNull(state.doctor_notes),
          treatment_details: trimOrNull(state.treatment_details),
          followup_date: state.followup_date || null,
          prescribed_products: state.lines.map((l) => ({
            product_id: l.product!.id,
            quantity: Number(l.quantity),
          })),
        })

        // If we arrived from an appointment, mark it done with the
        // visit linked. Fire-and-forget: if this fails the visit
        // still exists and staff can mark the appointment manually.
        if (linkedAppointment.value) {
          try {
            await setApptStatusMut.mutateAsync({
              id: linkedAppointment.value.id,
              status: 'done',
              visit_id: visit.id,
              toastMessage: 'Appointment marked done',
            })
          } catch {
            // toast surfaced by mutation
          }
          router.push({ name: 'appointments' })
        } else {
          router.push({ name: 'visits' })
        }
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

        {linkedAppointment.value && (
          <div class="rounded-md border border-sky-500/40 bg-sky-500/5 px-3 py-2 text-sm flex items-start gap-2 text-sky-900 dark:text-sky-200">
            <CalendarClock class="size-4 mt-0.5 shrink-0" />
            <div>
              <strong>Linked to appointment</strong> for{' '}
              {linkedAppointment.value.patient?.name ?? 'patient'}
              {linkedAppointment.value.patient?.legacy_client_no && (
                <span class="ml-1 text-xs tabular-nums opacity-80">
                  #{linkedAppointment.value.patient.legacy_client_no}
                </span>
              )}
              <span class="text-muted-foreground">
                {' '}· {formatDateTime(linkedAppointment.value.scheduled_at)}
              </span>
              <div class="text-xs opacity-80 mt-0.5">
                Saving this visit will mark the appointment as done.
              </div>
            </div>
          </div>
        )}

        {!linkedAppointment.value && suggestedAppointments.value.length > 0 && (
          <div class="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm space-y-2 text-amber-900 dark:text-amber-200">
            <div class="flex items-start gap-2">
              <CalendarClock class="size-4 mt-0.5 shrink-0" />
              <div class="flex-1">
                <strong>
                  {suggestedAppointments.value.length === 1
                    ? 'This patient has a scheduled appointment today.'
                    : `This patient has ${suggestedAppointments.value.length} scheduled appointments today.`}
                </strong>
                <div class="text-xs opacity-80 mt-0.5">
                  Link it so saving this visit also marks the appointment Done.
                  Otherwise it'll stay Scheduled.
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 pl-6">
              {suggestedAppointments.value.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => linkSuggested(a)}
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-xs font-medium"
                >
                  <Link2 class="size-3.5" />
                  <span>
                    {formatDateTime(a.scheduled_at)} · {a.treatment_description}
                    {a.session_number !== null
                      ? ` (#${a.session_number})`
                      : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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
              <label class="text-sm font-medium">Follow-up date</label>
              <div class="mt-1">
                <DatePicker
                  modelValue={state.followup_date}
                  onUpdate:modelValue={(v: string) =>
                    (state.followup_date = v)
                  }
                  placeholder="Optional"
                />
              </div>
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
