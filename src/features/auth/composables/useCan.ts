import { computed } from 'vue'
import { useAuth } from './useAuth'

// Capability flags derived from the current user's role.
//
// Two effective tiers — see migration 0014 for the DB-side mirror:
//   privileged  = admin | doctor  (full access)
//   limited     = receptionist | staff
//
// UI components use these to hide / disable actions the user can't take.
// The DB enforces the same rules so a curious user opening DevTools and
// hitting Supabase directly hits 42501 instead of side-stepping the UI.

export function useCan() {
  const { profile } = useAuth()

  const role = computed(() => profile.value?.role ?? null)
  const isPrivileged = computed(
    () => role.value === 'admin' || role.value === 'doctor',
  )

  return {
    role,
    isPrivileged,
    // Patients: limited can create / edit. Soft-delete is privileged only.
    canDeletePatient: isPrivileged,
    // Products: only privileged can add / edit / remove. Stock movements and
    // sells stay open to everyone.
    canManageProducts: isPrivileged,
    // Visits with prescriptions: clinical action, privileged only.
    canCreateVisit: isPrivileged,
  }
}
