import type { AppSupabaseClient } from '@/lib/supabase'
import { getCurrentClinicId } from '@/lib/clinic'
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  AppointmentsFilter,
} from '../types'

export type AppointmentListResult = {
  rows: Appointment[]
  total: number
}

// Embedded joins:
//   patient — name/phone/client# alongside each row.
//   assigned_doctor — explicit FK hint so PostgREST disambiguates from
//   other profile FKs (e.g. created_by). The join is to profiles.user_id;
//   reading display_name straight from profiles means renaming a doctor
//   propagates to historical rows. If you want a "snapshot" name instead,
//   add an assigned_doctor_display column + trigger.
const SELECT_WITH_PATIENT =
  '*, patient:patients(id, name, legacy_client_no, phone), assigned_doctor:profiles!appointments_assigned_doctor_id_fkey(user_id, display_name, role)'

function startOfLocalDayIso(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toISOString()
}
function endOfLocalDayIso(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

/**
 * Resolve a free-text patient search to a set of patient IDs. PostgREST
 * can't OR across a joined table cleanly, so we do the patient lookup
 * separately and feed the IDs into appointments.in('patient_id', ...).
 *
 * Search syntax mirrors patientService.list:
 *   #1297 → legacy_client_no = 1297 only
 *   1297  → name OR phone substring OR legacy_client_no
 *   asha  → name substring
 *
 * Returns null when there's no search (caller should not filter), or an
 * array of ids (possibly empty, meaning "match nothing").
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
    if (!/^\d+$/.test(numStr)) return [] // "#abc" → match nothing
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

export const appointmentService = {
  async list(
    sb: AppSupabaseClient,
    args: AppointmentsFilter & { page: number; pageSize: number },
  ): Promise<AppointmentListResult> {
    const {
      patientSearch,
      statuses,
      doctorIds,
      dateFrom,
      dateTo,
      sortBy = 'scheduled_asc',
      page,
      pageSize,
    } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Patient search resolves to a set of ids first (PostgREST can't OR
    // across joined columns). If it returns an empty set the answer is
    // trivially zero rows; short-circuit so we don't fire the main query.
    let patientIds: string[] | null = null
    if (patientSearch && patientSearch.trim()) {
      patientIds = await resolvePatientIds(sb, patientSearch)
      if (patientIds && patientIds.length === 0) {
        return { rows: [], total: 0 }
      }
    }

    let q = sb
      .from('appointments_active')
      .select(SELECT_WITH_PATIENT, { count: 'exact' })
      .range(from, to)

    // Sort
    if (sortBy === 'scheduled_desc') {
      q = q.order('scheduled_at', { ascending: false })
    } else if (sortBy === 'created_desc') {
      q = q.order('created_at', { ascending: false })
    } else {
      q = q.order('scheduled_at', { ascending: true })
    }

    if (statuses && statuses.length > 0) {
      q = q.in('status', statuses)
    }
    if (doctorIds && doctorIds.length > 0) {
      q = q.in('assigned_doctor_id', doctorIds)
    }
    if (dateFrom) {
      q = q.gte('scheduled_at', startOfLocalDayIso(dateFrom))
    }
    if (dateTo) {
      q = q.lte('scheduled_at', endOfLocalDayIso(dateTo))
    }
    if (patientIds) {
      q = q.in('patient_id', patientIds)
    }

    const { data, error, count } = await q
    if (error) throw error
    return {
      rows: (data ?? []) as unknown as Appointment[],
      total: count ?? 0,
    }
  },

  async listForPatient(
    sb: AppSupabaseClient,
    patientId: string,
    limit = 50,
  ): Promise<Appointment[]> {
    const { data, error } = await sb
      .from('appointments_active')
      .select(SELECT_WITH_PATIENT)
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as unknown as Appointment[]
  },

  async today(
    sb: AppSupabaseClient,
    limit = 5,
  ): Promise<{ rows: Appointment[]; total: number }> {
    // Local-day range. The DB column is timestamptz so we hand it ISO
    // bounds; the client's local midnight is what staff would call "today".
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const day = `${yyyy}-${mm}-${dd}`

    const { data, error, count } = await sb
      .from('appointments_active')
      .select(SELECT_WITH_PATIENT, { count: 'exact' })
      .gte('scheduled_at', startOfLocalDayIso(day))
      .lte('scheduled_at', endOfLocalDayIso(day))
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(limit)
    if (error) throw error
    return {
      rows: (data ?? []) as unknown as Appointment[],
      total: count ?? 0,
    }
  },

  /**
   * Scheduled appointments for this patient today. Used by NewVisitView
   * to surface a "Link to existing appointment?" banner when a doctor
   * lands on the visit form for a patient who's also on the day's roster
   * — closes the gap where walk-in flow leaves the appointment stuck on
   * Scheduled. Returns soonest-first.
   */
  async listScheduledForPatientToday(
    sb: AppSupabaseClient,
    patientId: string,
  ): Promise<Appointment[]> {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const day = `${yyyy}-${mm}-${dd}`

    const { data, error } = await sb
      .from('appointments_active')
      .select(SELECT_WITH_PATIENT)
      .eq('patient_id', patientId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', startOfLocalDayIso(day))
      .lte('scheduled_at', endOfLocalDayIso(day))
      .order('scheduled_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as Appointment[]
  },

  async get(
    sb: AppSupabaseClient,
    id: string,
  ): Promise<Appointment | null> {
    const { data, error } = await sb
      .from('appointments_active')
      .select(SELECT_WITH_PATIENT)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Appointment | null) ?? null
  },

  async create(
    sb: AppSupabaseClient,
    input: AppointmentInput,
  ): Promise<Appointment> {
    const clinic_id = await getCurrentClinicId(sb)
    if (!clinic_id) throw new Error('No clinic profile for current user')

    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await sb
      .from('appointments')
      .insert({
        clinic_id,
        patient_id: input.patient_id,
        scheduled_at: input.scheduled_at,
        treatment_description: input.treatment_description,
        session_number: input.session_number,
        notes: input.notes,
        assigned_doctor_id: input.assigned_doctor_id,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    return data as Appointment
  },

  async update(
    sb: AppSupabaseClient,
    id: string,
    input: AppointmentInput,
  ): Promise<Appointment> {
    const { data, error } = await sb
      .from('appointments')
      .update({
        patient_id: input.patient_id,
        scheduled_at: input.scheduled_at,
        treatment_description: input.treatment_description,
        session_number: input.session_number,
        notes: input.notes,
        assigned_doctor_id: input.assigned_doctor_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Appointment
  },

  async setStatus(
    sb: AppSupabaseClient,
    id: string,
    status: AppointmentStatus,
    extras: { notes?: string | null; visit_id?: string | null } = {},
  ): Promise<Appointment> {
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (extras.notes !== undefined) patch.notes = extras.notes
    if (extras.visit_id !== undefined) patch.visit_id = extras.visit_id

    const { data, error } = await sb
      .from('appointments')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Appointment
  },

  async softDelete(sb: AppSupabaseClient, id: string): Promise<void> {
    // Will fail with 42501 for non-privileged users via the trigger
    // installed in migration 0018.
    const { error } = await sb
      .from('appointments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },
}
