import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/errors'
import { categoryService } from '../services/categoryService'
import { categoryKeys } from '../queryKeys'
import { productKeys } from '@/features/inventory/queryKeys'
import type { CategoryInput } from '../types'

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => categoryService.list(supabase),
    staleTime: 5 * 60_000,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) => categoryService.create(supabase, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.lists() })
      toast.success('Category added')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: CategoryInput }) =>
      categoryService.update(supabase, args.id, args.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.lists() })
      // Product rows show the embedded category name, so they need to refresh
      // when a rename lands.
      qc.invalidateQueries({ queryKey: productKeys.all })
      toast.success('Category renamed')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoryService.remove(supabase, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.lists() })
      qc.invalidateQueries({ queryKey: productKeys.all })
      toast.success('Category removed')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}
