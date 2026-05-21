import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { salesService } from '../services/salesService'
import { salesKeys } from '../queryKeys'
import type { SalesFilter } from '../types'

export const SALES_PAGE_SIZE = 50

export function useSales(filter: Ref<SalesFilter>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => salesKeys.list(filter.value, page.value)),
    queryFn: () =>
      salesService.list(supabase, {
        filter: filter.value,
        page: page.value,
        pageSize: SALES_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useSalesStats() {
  return useQuery({
    queryKey: salesKeys.stats(),
    queryFn: () => salesService.stats(supabase),
    // Aggregates change with each new sale; refetch on focus catches
    // updates if the user leaves the page and comes back.
    staleTime: 60_000,
  })
}
