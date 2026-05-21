import type { MovementsFilter } from './types'

export const movementsKeys = {
  all: ['stock-movements'] as const,
  lists: () => [...movementsKeys.all, 'list'] as const,
  list: (filter: MovementsFilter, page: number) =>
    [...movementsKeys.lists(), filter, page] as const,
}
