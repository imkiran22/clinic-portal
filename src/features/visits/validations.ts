import { z } from 'zod'
import type { PrescribedProduct, VisitCreateInput } from './types'

export const prescriptionLineSchema = z.object({
  product_id: z.string().min(1),
  quantity: z
    .string()
    .regex(/^[1-9]\d*$/, 'Quantity must be a positive whole number'),
})

export type PrescriptionLineValues = z.infer<typeof prescriptionLineSchema>

export const visitFormSchema = z.object({
  patient_id: z.string().uuid({ message: 'Please select a patient' }),
  doctor_notes: z.string(),
  treatment_details: z.string(),
  followup_date: z.string(), // 'YYYY-MM-DD' or ''
  lines: z.array(prescriptionLineSchema),
})

export type VisitFormValues = z.infer<typeof visitFormSchema>

export const emptyVisitForm: VisitFormValues = {
  patient_id: '',
  doctor_notes: '',
  treatment_details: '',
  followup_date: '',
  lines: [],
}

function trimOrNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

export function toVisitCreateInput(values: VisitFormValues): VisitCreateInput {
  const lines: PrescribedProduct[] = values.lines.map((l) => ({
    product_id: l.product_id,
    quantity: Number(l.quantity),
  }))
  return {
    patient_id: values.patient_id,
    doctor_notes: trimOrNull(values.doctor_notes),
    treatment_details: trimOrNull(values.treatment_details),
    followup_date: values.followup_date || null,
    prescribed_products: lines,
  }
}
