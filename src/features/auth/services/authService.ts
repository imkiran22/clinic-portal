import type { AppSupabaseClient } from '@/lib/supabase'

export type Profile = {
  user_id: string
  clinic_id: string
  display_name: string
  role: 'admin' | 'doctor' | 'receptionist' | 'staff'
}

export const authService = {
  async signIn(sb: AppSupabaseClient, email: string, password: string) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signOut(sb: AppSupabaseClient) {
    const { error } = await sb.auth.signOut()
    if (error) throw error
  },

  async getSession(sb: AppSupabaseClient) {
    const { data, error } = await sb.auth.getSession()
    if (error) throw error
    return data.session
  },

  async getProfile(sb: AppSupabaseClient, userId: string): Promise<Profile | null> {
    const { data, error } = await sb
      .from('profiles')
      .select('user_id, clinic_id, display_name, role')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return (data as Profile | null) ?? null
  },

  /**
   * Lookup against profiles for the appointments doctor picker.
   * Restricted to role='doctor' — admins / receptionists shouldn't
   * appear here even if they sometimes log in to create appointments.
   * RLS on profiles already filters by clinic.
   *
   * The picker debounces input and calls this with a search fragment;
   * the AppointmentsView filter row calls it without one to enumerate
   * the full set for chips. Capped at 20 rows — a clinic with more
   * than 20 doctors can refine via the search box.
   */
  async listDoctors(
    sb: AppSupabaseClient,
    opts: { search?: string; limit?: number } = {},
  ): Promise<Profile[]> {
    let q = sb
      .from('profiles')
      .select('user_id, clinic_id, display_name, role')
      .eq('role', 'doctor')
      .order('display_name')
      .limit(opts.limit ?? 20)
    const s = opts.search?.trim()
    if (s) q = q.ilike('display_name', `%${s}%`)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as Profile[]
  },
}
