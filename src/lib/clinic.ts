import type { AppSupabaseClient } from '@/lib/supabase'

export async function getCurrentClinicId(
  sb: AppSupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  const { data, error } = await sb
    .from('profiles')
    .select('clinic_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return (data as { clinic_id: string }).clinic_id
}
