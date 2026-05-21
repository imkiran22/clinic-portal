import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { movementsService } from '../services/movementsService'
import { movementsKeys } from '../queryKeys'
import type { MovementsFilter } from '../types'

export const MOVEMENTS_PAGE_SIZE = 50

export function useMovements(
  filter: Ref<MovementsFilter>,
  page: Ref<number>,
) {
  return useQuery({
    queryKey: computed(() => movementsKeys.list(filter.value, page.value)),
    queryFn: () =>
      movementsService.list(supabase, {
        filter: filter.value,
        page: page.value,
        pageSize: MOVEMENTS_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })
}
