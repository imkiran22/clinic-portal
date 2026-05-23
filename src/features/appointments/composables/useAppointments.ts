import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { appointmentService } from '../services/appointmentService'
import { appointmentKeys } from '../queryKeys'
import type { AppointmentsFilter } from '../types'

export const APPOINTMENTS_PAGE_SIZE = 50

export function useAppointments(
  filter: Ref<AppointmentsFilter>,
  page: Ref<number>,
) {
  return useQuery({
    queryKey: computed(() => appointmentKeys.list(filter.value, page.value)),
    queryFn: () =>
      appointmentService.list(supabase, {
        ...filter.value,
        page: page.value,
        pageSize: APPOINTMENTS_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useAppointmentsForPatient(patientId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => appointmentKeys.byPatient(patientId.value)),
    queryFn: () =>
      appointmentService.listForPatient(supabase, patientId.value),
    enabled: computed(() => !!patientId.value),
  })
}

export function useAppointment(id: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => appointmentKeys.detail(id.value ?? '')),
    queryFn: () =>
      appointmentService.get(supabase, id.value as string),
    enabled: computed(() => !!id.value),
  })
}

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useTodaysAppointments() {
  return useQuery({
    queryKey: appointmentKeys.today(todayIsoDate()),
    queryFn: () => appointmentService.today(supabase),
  })
}
