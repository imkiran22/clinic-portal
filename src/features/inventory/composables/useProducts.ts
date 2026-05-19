import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { inventoryService } from '../services/inventoryService'
import { movementKeys, productKeys } from '../queryKeys'

export const PRODUCTS_PAGE_SIZE = 100

export function useProducts(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() =>
      productKeys.list({ q: search.value, page: page.value }),
    ),
    queryFn: () =>
      inventoryService.list(supabase, {
        search: search.value,
        page: page.value,
        pageSize: PRODUCTS_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => productKeys.detail(id.value)),
    queryFn: () => inventoryService.get(supabase, id.value),
    enabled: computed(() => !!id.value),
  })
}

export function useMovementsFor(productId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => movementKeys.byProduct(productId.value)),
    queryFn: () => inventoryService.listMovements(supabase, productId.value),
    enabled: computed(() => !!productId.value),
  })
}
