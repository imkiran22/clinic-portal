import type { AppSupabaseClient } from '@/lib/supabase'
import { getCurrentClinicId } from '@/lib/clinic'
import type { Patient, PatientInput } from '../types'

export type ListResult = {
  rows: Patient[]
  total: number
}

export const patientService = {
  async list(
    sb: AppSupabaseClient,
    args: { search?: string; page: number; pageSize: number },
  ): Promise<ListResult> {
    const { search, page, pageSize } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = sb
      .from('patients_active')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to)

    const s = search?.trim()
    if (s) {
      const isNumeric = /^\d+$/.test(s)
      if (isNumeric) {
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

    const { data, error, count } = await q
    if (error) throw error
    return { rows: (data ?? []) as Patient[], total: count ?? 0 }
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
