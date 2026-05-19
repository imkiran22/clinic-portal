import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/errors'
import { inventoryService } from '../services/inventoryService'
import { movementKeys, productKeys } from '../queryKeys'
import type { MovementInput, ProductCreateInput, ProductInput } from '../types'

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductCreateInput) =>
      inventoryService.createWithStock(supabase, input),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: productKeys.lists() })
      // If initial_stock > 0, the RPC also inserted a PURCHASE movement.
      qc.invalidateQueries({ queryKey: movementKeys.byProduct(product.id) })
      toast.success('Product created')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: ProductInput }) =>
      inventoryService.update(supabase, args.id, args.input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: productKeys.lists() })
      qc.setQueryData(productKeys.detail(data.id), data)
      toast.success('Product updated')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useSoftDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => inventoryService.softDelete(supabase, id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: productKeys.lists() })
      qc.removeQueries({ queryKey: productKeys.detail(id) })
      toast.success('Product removed')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useRecordMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MovementInput) =>
      inventoryService.recordMovement(supabase, input),
    onSuccess: (movement) => {
      qc.invalidateQueries({ queryKey: productKeys.lists() })
      qc.invalidateQueries({ queryKey: productKeys.detail(movement.product_id) })
      qc.invalidateQueries({
        queryKey: movementKeys.byProduct(movement.product_id),
      })
      toast.success('Movement recorded')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}
