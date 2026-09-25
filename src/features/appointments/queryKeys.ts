import type { AppointmentsFilter, CalendarRange } from './types'

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filter: AppointmentsFilter, page: number) =>
    [...appointmentKeys.lists(), filter, page] as const,
  byPatient: (patientId: string) =>
    [...appointmentKeys.all, 'patient', patientId] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  today: (date: string) => [...appointmentKeys.all, 'today', date] as const,
  // Calendar window. Nested under `all` so every existing mutation's
  // invalidateQueries({ queryKey: appointmentKeys.all }) refreshes it.
  ranges: () => [...appointmentKeys.all, 'range'] as const,
  range: (r: CalendarRange) => [...appointmentKeys.ranges(), r] as const,
}
