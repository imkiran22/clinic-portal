import { z } from 'zod'
import type { AppointmentInput } from './types'

// patient_id and the combined timestamp live outside the schema — the
// PatientPicker and date/time inputs each manage their own value and
// VeeValidate's per-field validation isn't useful for them.

export const appointmentFormSchema = z.object({
  // YYYY-MM-DD from <input type="date">
  scheduled_date: z.string().min(1, 'Date is required'),
  // HH:MM from <input type="time">
  scheduled_time: z.string().min(1, 'Time is required'),
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
  scheduled_date: '',
  scheduled_time: '',
  treatment_description: '',
  session_number: '',
  notes: '',
}

function trimOrNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

/** Combine a local YYYY-MM-DD + HH:MM into an ISO timestamp the DB stores. */
export function combineLocalDateTime(date: string, time: string): string {
  const [h, m] = time.split(':').map((n) => Number(n))
  const d = new Date(date + 'T00:00:00')
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
  return d.toISOString()
}

export function toAppointmentInput(
  values: AppointmentFormValues,
  patientId: string,
): AppointmentInput {
  return {
    patient_id: patientId,
    scheduled_at: combineLocalDateTime(
      values.scheduled_date,
      values.scheduled_time,
    ),
    treatment_description: values.treatment_description.trim(),
    session_number:
      values.session_number === '' ? null : Number(values.session_number),
    notes: trimOrNull(values.notes),
  }
}

/** Split an ISO timestamp back into local date + time for edit forms. */
export function splitToLocalParts(iso: string): {
  date: string
  time: string
} {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` }
}
