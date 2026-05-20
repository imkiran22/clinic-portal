export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  list: (filters: { page?: number }) =>
    [...visitKeys.lists(), filters] as const,
  byPatient: (patientId: string) =>
    [...visitKeys.all, 'patient', patientId] as const,
  details: () => [...visitKeys.all, 'detail'] as const,
  detail: (id: string) => [...visitKeys.details(), id] as const,
  movements: (visitId: string) =>
    [...visitKeys.all, 'movements', visitId] as const,
}
