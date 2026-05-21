import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/errors'
import { supplierService } from '../services/supplierService'
import { supplierKeys } from '../queryKeys'
import { productKeys } from '@/features/inventory/queryKeys'
import type { SupplierInput } from '../types'

export function useSuppliers() {
  return useQuery({
    queryKey: supplierKeys.list(),
    queryFn: () => supplierService.list(supabase),
    staleTime: 5 * 60_000,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SupplierInput) => supplierService.create(supabase, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.lists() })
      toast.success('Supplier added')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: SupplierInput }) =>
      supplierService.update(supabase, args.id, args.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.lists() })
      // Product rows show the embedded supplier name — refresh on rename.
      qc.invalidateQueries({ queryKey: productKeys.all })
      toast.success('Supplier renamed')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => supplierService.remove(supabase, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.lists() })
      qc.invalidateQueries({ queryKey: productKeys.all })
      toast.success('Supplier removed')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}
