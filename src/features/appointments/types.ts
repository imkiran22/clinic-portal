export type AppointmentStatus = 'scheduled' | 'done' | 'cancelled'

export type Appointment = {
  id: string
  clinic_id: string
  patient_id: string
  scheduled_at: string // ISO timestamptz from server
  treatment_description: string
  session_number: number | null
  status: AppointmentStatus
  notes: string | null
  visit_id: string | null
  assigned_doctor_id: string | null
  created_by: string | null
  created_by_display: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Embedded via select join when listing — gives staff the patient
  // name + client# without a separate fetch.
  patient?: {
    id: string
    name: string
    legacy_client_no: number | null
    phone: string
  } | null
  // Embedded when an assigned doctor is set. Joined to profiles so the
  // displayed name stays current if a doctor renames themselves.
  assigned_doctor?: {
    user_id: string
    display_name: string
    role: string
  } | null
}

export type AppointmentInput = {
  patient_id: string
  // ISO timestamp the server stores; derived from <input type="datetime-local">.
  scheduled_at: string
  treatment_description: string
  session_number: number | null
  notes: string | null
  assigned_doctor_id: string | null
}

export type AppointmentsFilter = {
  // Patient search — same syntax as PatientsView (#1297 = legacy_client_no
  // only; numeric/text = name + phone + client# substring).
  patientSearch?: string
  statuses?: AppointmentStatus[]
  // Multi-select of profiles.user_id values. Empty = all doctors.
  doctorIds?: string[]
  // YYYY-MM-DD local calendar day. null = no bound.
  dateFrom?: string | null
  dateTo?: string | null
  sortBy?: AppointmentsSortBy
}

export type AppointmentsSortBy =
  | 'scheduled_asc'
  | 'scheduled_desc'
  | 'created_desc'
