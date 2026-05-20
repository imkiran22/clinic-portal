import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { visitService } from '../services/visitService'
import { visitKeys } from '../queryKeys'

export const VISITS_PAGE_SIZE = 50

export function useVisits(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => visitKeys.list({ page: page.value })),
    queryFn: () =>
      visitService.list(supabase, {
        page: page.value,
        pageSize: VISITS_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useVisitsForPatient(patientId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => visitKeys.byPatient(patientId.value)),
    queryFn: () => visitService.listForPatient(supabase, patientId.value),
    enabled: computed(() => !!patientId.value),
  })
}

export function useVisit(id: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => visitKeys.detail(id.value ?? '')),
    queryFn: () => visitService.get(supabase, id.value as string),
    enabled: computed(() => !!id.value),
  })
}

export function useVisitMovements(visitId: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => visitKeys.movements(visitId.value ?? '')),
    queryFn: () => visitService.listMovements(supabase, visitId.value as string),
    enabled: computed(() => !!visitId.value),
  })
}
