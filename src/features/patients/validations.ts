import { z } from 'zod'
import type { PatientInput } from './types'

// String-typed form schema. HTML inputs return strings; we coerce to typed
// values in toPatientInput() below.
export const patientFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters'),
  age: z
    .string()
    .regex(/^$|^\d+$/, 'Numbers only')
    .refine(
      (v) => v === '' || (Number(v) >= 0 && Number(v) <= 130),
      'Age must be 0–130',
    ),
  gender: z.union([z.literal(''), z.literal('male'), z.literal('female'), z.literal('other')]),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  email: z
    .string()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Invalid email'),
  address: z.string(),
  notes: z.string(),
  // Required — staff own the numbering by hand. Earlier we let the
  // database auto-assign blanks via a trigger, but that created
  // discrepancies whenever a staff member typed the next number from
  // their paper register and the DB had silently picked a different
  // one. Now the field is explicit; the DB just enforces uniqueness.
  legacy_client_no: z
    .string()
    .min(1, 'Client # is required')
    .regex(/^\d+$/, 'Numbers only')
    .refine((v) => Number(v) >= 1, 'Must be positive'),
})

export type PatientFormValues = z.infer<typeof patientFormSchema>

export const emptyPatientForm: PatientFormValues = {
  name: '',
  age: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  legacy_client_no: '',
}

export function toPatientInput(values: PatientFormValues): PatientInput {
  return {
    name: values.name.trim(),
    age: values.age === '' ? null : Number(values.age),
    gender: values.gender === '' ? null : values.gender,
    phone: values.phone,
    email: values.email.trim() === '' ? null : values.email.trim(),
    address: values.address.trim() === '' ? null : values.address.trim(),
    notes: values.notes.trim() === '' ? null : values.notes.trim(),
    // Schema guarantees non-empty + numeric by this point.
    legacy_client_no: Number(values.legacy_client_no),
  }
}

export function fromPatient(p: {
  name: string
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  legacy_client_no: number | null
}): PatientFormValues {
  return {
    name: p.name,
    age: p.age === null ? '' : String(p.age),
    gender: p.gender ?? '',
    phone: p.phone,
    email: p.email ?? '',
    address: p.address ?? '',
    notes: p.notes ?? '',
    legacy_client_no: p.legacy_client_no === null ? '' : String(p.legacy_client_no),
  }
}
