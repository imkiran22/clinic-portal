import { ref, readonly } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService, type Profile } from '@/features/auth/services/authService'

const session = ref<Session | null>(null)
const profile = ref<Profile | null>(null)
const ready = ref(false)

let initialized = false

async function init() {
  if (initialized) return
  initialized = true

  const current = await authService.getSession(supabase)
  session.value = current
  profile.value = current ? await authService.getProfile(supabase, current.user.id) : null
  ready.value = true

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    session.value = newSession
    profile.value = newSession
      ? await authService.getProfile(supabase, newSession.user.id)
      : null
  })
}

export function useAuth() {
  void init()
  return {
    session: readonly(session),
    profile: readonly(profile),
    ready: readonly(ready),
  }
}
