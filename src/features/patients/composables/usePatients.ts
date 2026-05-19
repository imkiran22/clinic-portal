import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { patientService } from '../services/patientService'
import { patientKeys } from '../queryKeys'

export const PATIENTS_PAGE_SIZE = 100

export function usePatients(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() =>
      patientKeys.list({ q: search.value, page: page.value }),
    ),
    queryFn: () =>
      patientService.list(supabase, {
        search: search.value,
        page: page.value,
        pageSize: PATIENTS_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => patientKeys.detail(id.value)),
    queryFn: () => patientService.get(supabase, id.value),
    enabled: computed(() => !!id.value),
  })
}
