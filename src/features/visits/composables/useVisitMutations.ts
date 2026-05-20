import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/errors'
import { visitService } from '../services/visitService'
import { visitKeys } from '../queryKeys'
import { productKeys, movementKeys } from '@/features/inventory/queryKeys'
import type { VisitCreateInput } from '../types'

export function useCreateVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: VisitCreateInput) =>
      visitService.createWithPrescriptions(supabase, input),
    onSuccess: (visit, input) => {
      qc.invalidateQueries({ queryKey: visitKeys.lists() })
      qc.invalidateQueries({ queryKey: visitKeys.byPatient(visit.patient_id) })
      // Prescribed lines turned into SALE movements — refresh stock + movement
      // history for any product the visit touched.
      if (input.prescribed_products.length > 0) {
        qc.invalidateQueries({ queryKey: productKeys.lists() })
        for (const line of input.prescribed_products) {
          qc.invalidateQueries({ queryKey: productKeys.detail(line.product_id) })
          qc.invalidateQueries({
            queryKey: movementKeys.byProduct(line.product_id),
          })
        }
      }
      toast.success(
        input.prescribed_products.length > 0
          ? `Visit saved · ${input.prescribed_products.length} product${input.prescribed_products.length === 1 ? '' : 's'} dispensed`
          : 'Visit saved',
      )
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}
