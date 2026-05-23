import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { authService } from '../services/authService'

// Doctor roster for the clinic — role='doctor' only (no admins, no
// receptionists). Used by:
//   - AppointmentsView filter chips: call with no search (all rows).
//   - DoctorPicker dropdown: pass a debounced search ref so each
//     keystroke fires an ilike query against profiles.display_name.
//
// The query key includes the search fragment, so the chips and the
// per-search picker results cache independently.

export function useDoctors(search?: MaybeRefOrGetter<string>) {
  const term = computed(() => (search ? toValue(search) : '').trim())
  return useQuery({
    queryKey: computed(() => ['profiles', 'doctors', term.value] as const),
    queryFn: () =>
      authService.listDoctors(supabase, { search: term.value, limit: 20 }),
    // Server-side hits are cheap on a small `profiles` table; a short
    // window dedupes back-to-back keystrokes after the debounce.
    staleTime: 30_000,
  })
}
