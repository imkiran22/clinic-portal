import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/errors'
import { appointmentService } from '../services/appointmentService'
import { appointmentKeys } from '../queryKeys'
import type {
  Appointment,
  AppointmentInput,
  AppointmentReschedule,
  AppointmentStatus,
} from '../types'

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AppointmentInput) =>
      appointmentService.create(supabase, input),
    onSuccess: (appt) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all })
      qc.invalidateQueries({
        queryKey: appointmentKeys.byPatient(appt.patient_id),
      })
      toast.success('Appointment added')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: AppointmentInput }) =>
      appointmentService.update(supabase, args.id, args.input),
    onSuccess: (appt) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all })
      qc.invalidateQueries({
        queryKey: appointmentKeys.byPatient(appt.patient_id),
      })
      qc.setQueryData(appointmentKeys.detail(appt.id), appt)
      toast.success('Appointment updated')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

/**
 * Calendar drag / resize. Optimistic: the block stays where it was
 * dropped while the request runs; on failure every cached calendar
 * window is restored and the error toasts.
 */
export function useRescheduleAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: AppointmentReschedule }) =>
      appointmentService.reschedule(supabase, args.id, args.patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: appointmentKeys.ranges() })
      const snapshots = qc.getQueriesData<Appointment[]>({
        queryKey: appointmentKeys.ranges(),
      })
      qc.setQueriesData<Appointment[]>(
        { queryKey: appointmentKeys.ranges() },
        (rows) =>
          rows?.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...patch,
                  // Keep the embedded doctor in step so the block's
                  // column/initials don't flicker until refetch.
                  assigned_doctor:
                    patch.assigned_doctor_id === a.assigned_doctor_id
                      ? a.assigned_doctor
                      : null,
                }
              : a,
          ),
      )
      return { snapshots }
    },
    onError: (err, _args, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(toUserError(err))
    },
    onSuccess: (appt) => {
      qc.invalidateQueries({
        queryKey: appointmentKeys.byPatient(appt.patient_id),
      })
      toast.success('Appointment moved')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}

export function useSetAppointmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      status: AppointmentStatus
      notes?: string | null
      visit_id?: string | null
      // Optional success toast override; default is "Status updated".
      toastMessage?: string
    }) =>
      appointmentService.setStatus(supabase, args.id, args.status, {
        notes: args.notes,
        visit_id: args.visit_id,
      }),
    onSuccess: (appt, args) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all })
      qc.invalidateQueries({
        queryKey: appointmentKeys.byPatient(appt.patient_id),
      })
      qc.setQueryData(appointmentKeys.detail(appt.id), appt)
      toast.success(args.toastMessage ?? 'Appointment status updated')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}

export function useSoftDeleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      appointmentService.softDelete(supabase, id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all })
      qc.removeQueries({ queryKey: appointmentKeys.detail(id) })
      toast.success('Appointment removed')
    },
    onError: (err) => toast.error(toUserError(err)),
  })
}
