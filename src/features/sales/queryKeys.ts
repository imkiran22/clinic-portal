import type { SalesFilter } from './types'

export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filter: SalesFilter, page: number) =>
    [...salesKeys.lists(), filter, page] as const,
  stats: () => [...salesKeys.all, 'stats'] as const,
}
