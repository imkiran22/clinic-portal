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
}
