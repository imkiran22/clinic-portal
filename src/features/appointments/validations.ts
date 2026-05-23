import { z } from 'zod'
import type { AppointmentInput } from './types'

// patient_id, assigned_doctor_id and the scheduled timestamp live
// outside the Zod schema — they're held as sibling reactive refs in
// the form (PatientPicker, DoctorPicker, VueDatePicker). VeeValidate's
// per-field validation doesn't help for those non-text controls.

export const appointmentFormSchema = z.object({
  treatment_description: z
    .string()
    .min(1, 'Treatment is required')
    .max(200),
  // Optional positive integer ("3rd", "4th" sessions). Blank = no session.
  session_number: z.string().regex(/^$|^[1-9]\d*$/, 'Whole number only'),
  notes: z.string(),
})

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>

export const emptyAppointmentForm: AppointmentFormValues = {
  treatment_description: '',
  session_number: '',
  notes: '',
}

function trimOrNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

/**
 * "Now, rounded up to the next half-hour" — used as the default value
 * for the new-appointment date picker. Staff usually book within the
 * working day; this gives them a sensible starting point.
 */
export function nextHalfHour(): Date {
  const d = new Date()
  d.setSeconds(0, 0)
  const minutes = d.getMinutes()
  // Round up to the next 0/30 boundary. If we're exactly on one, push
  // 30 forward so the suggestion is meaningfully in the future.
  const add = minutes === 0 || minutes === 30 ? 30 : 30 - (minutes % 30)
  d.setMinutes(minutes + add)
  return d
}

export function toAppointmentInput(
  values: AppointmentFormValues,
  patientId: string,
  scheduledAt: Date,
  assignedDoctorId: string | null,
): AppointmentInput {
  return {
    patient_id: patientId,
    // Date.toISOString() emits UTC, which is what the `timestamptz`
    // column stores. The picker hands us a local-time Date object, so
    // this conversion is one-step and timezone-correct.
    scheduled_at: scheduledAt.toISOString(),
    treatment_description: values.treatment_description.trim(),
    session_number:
      values.session_number === '' ? null : Number(values.session_number),
    notes: trimOrNull(values.notes),
    assigned_doctor_id: assignedDoctorId,
  }
}
