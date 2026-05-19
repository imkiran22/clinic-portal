export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: { q?: string; page?: number }) =>
    [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
}
