import type { AppSupabaseClient } from '@/lib/supabase'
import type { StockMovement } from '@/features/inventory/types'
import type { Visit, VisitCreateInput, VisitsFilter } from '../types'

export type VisitListResult = { rows: Visit[]; total: number }

const VISIT_SELECT_WITH_PATIENT =
  '*, patient:patients(id, name, legacy_client_no)'

function startOfLocalDayIso(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toISOString()
}
function endOfLocalDayIso(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

/**
 * Resolve a patient search to ids — same syntax as appointmentService.
 * PostgREST can't OR across a joined column cleanly, so we run the
 * patient lookup separately and feed the ids back as `in('patient_id')`.
 */
async function resolvePatientIds(
  sb: AppSupabaseClient,
  search: string,
): Promise<string[] | null> {
  const s = search.trim()
  if (!s) return null
  const PG_INT4_MAX = 2_147_483_647
  let q = sb.from('patients_active').select('id').limit(500)
  if (s.startsWith('#')) {
    const numStr = s.slice(1).trim()
    if (!/^\d+$/.test(numStr)) return []
    const n = Number(numStr)
    if (!Number.isFinite(n) || n < 1 || n > PG_INT4_MAX) return []
    q = q.eq('legacy_client_no', n)
  } else if (/^\d+$/.test(s)) {
    const clauses = [`name.ilike.%${s}%`, `phone.ilike.%${s}%`]
    const n = Number(s)
    if (Number.isFinite(n) && n >= 1 && n <= PG_INT4_MAX) {
      clauses.push(`legacy_client_no.eq.${n}`)
    }
    q = q.or(clauses.join(','))
  } else {
    q = q.ilike('name', `%${s}%`)
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((r) => r.id as string)
}

export const visitService = {
  async list(
    sb: AppSupabaseClient,
    args: VisitsFilter & { page: number; pageSize: number },
  ): Promise<VisitListResult> {
    const {
      patientSearch,
      dateFrom,
      dateTo,
      patientIds: pickedPatientIds,
      page,
      pageSize,
    } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Combine the free-text patient search with the multi-pick. If
    // search returns zero matches we can short-circuit; if both are
    // populated we intersect.
    let patientIds: string[] | null = null
    if (patientSearch && patientSearch.trim()) {
      patientIds = await resolvePatientIds(sb, patientSearch)
      if (patientIds && patientIds.length === 0) {
        return { rows: [], total: 0 }
      }
    }
    if (pickedPatientIds && pickedPatientIds.length > 0) {
      patientIds = patientIds
        ? patientIds.filter((id) => pickedPatientIds.includes(id))
        : pickedPatientIds.slice()
      if (patientIds.length === 0) return { rows: [], total: 0 }
    }

    let q = sb
      .from('visits')
      .select(VISIT_SELECT_WITH_PATIENT, { count: 'exact' })
      .order('visit_date', { ascending: false })
      .range(from, to)

    if (dateFrom) q = q.gte('visit_date', startOfLocalDayIso(dateFrom))
    if (dateTo) q = q.lte('visit_date', endOfLocalDayIso(dateTo))
    if (patientIds) q = q.in('patient_id', patientIds)

    const { data, error, count } = await q
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
