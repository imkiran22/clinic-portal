export type Gender = 'male' | 'female' | 'other'
export type PatientRole = 'admin' | 'doctor' | 'receptionist' | 'staff'

export type Patient = {
  id: string
  clinic_id: string
  name: string
  age: number | null
  gender: Gender | null
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  legacy_client_no: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type PatientInput = {
  name: string
  age: number | null
  gender: Gender | null
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  legacy_client_no: number | null
}
