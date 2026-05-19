import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { patientService } from '../services/patientService'
import { patientKeys } from '../queryKeys'

export function usePatients(search: Ref<string>) {
  return useQuery({
    queryKey: computed(() => patientKeys.list({ q: search.value })),
    queryFn: () => patientService.list(supabase, search.value),
  })
}

export function usePatient(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => patientKeys.detail(id.value)),
    queryFn: () => patientService.get(supabase, id.value),
    enabled: computed(() => !!id.value),
  })
}
