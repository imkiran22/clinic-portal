export type PrescribedProduct = {
  product_id: string
  quantity: number
}

export type Visit = {
  id: string
  clinic_id: string
  patient_id: string
  visit_date: string
  doctor_notes: string | null
  treatment_details: string | null
  prescribed_products: PrescribedProduct[]
  followup_date: string | null
  created_by: string | null
  created_by_display: string | null
  created_at: string
  // Embedded via select join when listing
  patient?: { id: string; name: string; legacy_client_no: number | null } | null
}

export type VisitCreateInput = {
  patient_id: string
  doctor_notes: string | null
  treatment_details: string | null
  followup_date: string | null
  prescribed_products: PrescribedProduct[]
}

export type VisitsFilter = {
  // Free-text patient search. Mirrors AppointmentsView's syntax —
  //   #1297 → legacy_client_no = 1297 only
  //   1297  → name / phone substring / legacy_client_no
  //   asha  → name substring
  patientSearch?: string
  // YYYY-MM-DD calendar days. null = no bound.
  dateFrom?: string | null
  dateTo?: string | null
  // Multi-patient pick from the More-filters modal. Empty = no filter.
  patientIds?: string[]
}
