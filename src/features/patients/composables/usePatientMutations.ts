import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/errors'
import { patientService } from '../services/patientService'
import { patientKeys } from '../queryKeys'
import type { PatientInput } from '../types'

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientInput) => patientService.create(supabase, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() })
      toast.success('Patient created')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: PatientInput }) =>
      patientService.update(supabase, args.id, args.input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() })
      qc.setQueryData(patientKeys.detail(data.id), data)
      toast.success('Patient updated')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useSoftDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patientService.softDelete(supabase, id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() })
      qc.removeQueries({ queryKey: patientKeys.detail(id) })
      toast.success('Patient removed')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}
