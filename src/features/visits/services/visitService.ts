import type { AppSupabaseClient } from '@/lib/supabase'
import type { StockMovement } from '@/features/inventory/types'
import type { Visit, VisitCreateInput } from '../types'

export type VisitListResult = { rows: Visit[]; total: number }

const VISIT_SELECT_WITH_PATIENT =
  '*, patient:patients(id, name, legacy_client_no)'

export const visitService = {
  async list(
    sb: AppSupabaseClient,
    args: { page: number; pageSize: number },
  ): Promise<VisitListResult> {
    const { page, pageSize } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await sb
      .from('visits')
      .select(VISIT_SELECT_WITH_PATIENT, { count: 'exact' })
      .order('visit_date', { ascending: false })
      .range(from, to)
    if (error) throw error
    return { rows: (data ?? []) as unknown as Visit[], total: count ?? 0 }
  },

  async listForPatient(
    sb: AppSupabaseClient,
    patientId: string,
  ): Promise<Visit[]> {
    const { data, error } = await sb
      .from('visits')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data ?? []) as Visit[]
  },

  async get(sb: AppSupabaseClient, id: string): Promise<Visit | null> {
    const { data, error } = await sb
      .from('visits')
      .select(VISIT_SELECT_WITH_PATIENT)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Visit | null) ?? null
  },

  async listMovements(
    sb: AppSupabaseClient,
    visitId: string,
  ): Promise<StockMovement[]> {
    // Visit-detail view needs product names for each dispensed line.
    // stock_movements is the source of truth for what was actually sold,
    // so we read from there rather than re-resolving the JSONB blob.
    const { data, error } = await sb
      .from('stock_movements')
      .select('*, product:products(id, name, selling_price)')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as StockMovement[]
  },

  async createWithPrescriptions(
    sb: AppSupabaseClient,
    input: VisitCreateInput,
  ): Promise<Visit> {
    const { data, error } = await sb.rpc('create_visit_with_prescriptions', {
      p_patient_id: input.patient_id,
      p_doctor_notes: input.doctor_notes,
      p_treatment_details: input.treatment_details,
      p_followup_date: input.followup_date,
      p_prescribed_products: input.prescribed_products,
    })
    if (error) throw error
    return data as Visit
  },
}
