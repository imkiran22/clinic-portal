import type { AppSupabaseClient } from '@/lib/supabase'
import { getCurrentClinicId } from '@/lib/clinic'
import type { Gender, Patient, PatientInput } from '../types'

export type PatientsSortBy = 'name' | 'created_desc' | 'updated_desc'

export type PatientsFilter = {
  search?: string
  genders?: Gender[]
  // YYYY-MM-DD local calendar day; null = no bound.
  dateFrom?: string | null
  dateTo?: string | null
  sortBy?: PatientsSortBy
}

export type ListResult = {
  rows: Patient[]
  total: number
}

function startOfLocalDayIso(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toISOString()
}
function endOfLocalDayIso(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export const patientService = {
  async list(
    sb: AppSupabaseClient,
    args: PatientsFilter & { page: number; pageSize: number },
  ): Promise<ListResult> {
    const {
      search,
      genders,
      dateFrom,
      dateTo,
      sortBy = 'name',
      page,
      pageSize,
    } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = sb
      .from('patients_active')
      .select('*', { count: 'exact' })
      .range(from, to)

    // Sort
    if (sortBy === 'created_desc') {
      q = q.order('created_at', { ascending: false })
    } else if (sortBy === 'updated_desc') {
      q = q.order('updated_at', { ascending: false })
    } else {
      q = q.order('name')
    }

    // Gender filter
    if (genders && genders.length > 0) {
      q = q.in('gender', genders)
    }

    // Date-added range (created_at). Bounds are inclusive local-day.
    if (dateFrom) {
      q = q.gte('created_at', startOfLocalDayIso(dateFrom))
    }
    if (dateTo) {
      q = q.lte('created_at', endOfLocalDayIso(dateTo))
    }

    const s = search?.trim()
    if (s) {
      const PG_INT4_MAX = 2_147_483_647

      // "#1297" scopes the search to client number only — skips name +
      // phone matching, which otherwise pollutes results when the number
      // happens to appear inside someone's phone string.
      if (s.startsWith('#')) {
        const numStr = s.slice(1).trim()
        if (/^\d+$/.test(numStr)) {
          const asInt = Number(numStr)
          if (Number.isFinite(asInt) && asInt >= 1 && asInt <= PG_INT4_MAX) {
            q = q.eq('legacy_client_no', asInt)
          } else {
            // out-of-range int — return nothing
            q = q.eq('legacy_client_no', -1)
          }
        } else {
          // "#abc" or empty — return nothing rather than fall back to
          // an unfiltered list which would surprise the user.
          q = q.eq('legacy_client_no', -1)
        }
      } else if (/^\d+$/.test(s)) {
        // Plain numeric search — match name + phone substring + client #.
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

  async getByLegacyNo(
    sb: AppSupabaseClient,
    legacyNo: number,
  ): Promise<Patient | null> {
    const { data, error } = await sb
      .from('patients_active')
      .select('*')
      .eq('legacy_client_no', legacyNo)
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
