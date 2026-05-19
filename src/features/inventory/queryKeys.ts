export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: { q?: string; page?: number }) =>
    [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
}

export const movementKeys = {
  all: ['movements'] as const,
  byProduct: (productId: string) =>
    [...movementKeys.all, 'product', productId] as const,
}
