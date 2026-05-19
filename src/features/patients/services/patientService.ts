import type { AppSupabaseClient } from '@/lib/supabase'
import { getCurrentClinicId } from '@/lib/clinic'
import type { Patient, PatientInput } from '../types'

const LIST_LIMIT = 1000

export const patientService = {
  async list(sb: AppSupabaseClient, search?: string): Promise<Patient[]> {
    let q = sb
      .from('patients_active')
      .select('*')
      .order('name')
      .limit(LIST_LIMIT)

    const s = search?.trim()
    if (s) {
      const isNumeric = /^\d+$/.test(s)
      if (isNumeric) {
        // Numeric search always hits phone substring + name substring; the
        // legacy_client_no clause is skipped when s would overflow int4
        // (e.g., a 10-digit phone number).
        const PG_INT4_MAX = 2_147_483_647
        const clauses = [`name.ilike.%${s}%`, `phone.ilike.%${s}%`]
        const asInt = Number(s)
        if (Number.isFinite(asInt) && asInt >= 1 && asInt <= PG_INT4_MAX) {
          clauses.push(`legacy_client_no.eq.${asInt}`)
        }
        q = q.or(clauses.join(','))
      } else {
        q = q.ilike('name', `%${s}%`)
      }
    }

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as Patient[]
  },

  async get(sb: AppSupabaseClient, id: string): Promise<Patient | null> {
    const { data, error } = await sb
      .from('patients_active')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as Patient | null) ?? null
  },

  async create(sb: AppSupabaseClient, input: PatientInput): Promise<Patient> {
    const clinic_id = await getCurrentClinicId(sb)
    if (!clinic_id) throw new Error('No clinic profile for current user')

    const { data, error } = await sb
      .from('patients')
      .insert({ ...input, clinic_id })
      .select()
      .single()
    if (error) throw error
    return data as Patient
  },

  async update(sb: AppSupabaseClient, id: string, input: PatientInput): Promise<Patient> {
    const { data, error } = await sb
      .from('patients')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Patient
  },

  async softDelete(sb: AppSupabaseClient, id: string): Promise<void> {
    const { error } = await sb
      .from('patients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },
}
