import type { AppSupabaseClient } from '@/lib/supabase'
import type { MovementRow, MovementsFilter } from '../types'

export type MovementsListResult = { rows: MovementRow[]; total: number }

const MOVEMENT_SELECT =
  '*, product:products(id, name), patient:patients(id, name, legacy_client_no)'

function startOfLocalDayIso(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toISOString()
}
function endOfLocalDayIso(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export const movementsService = {
  async list(
    sb: AppSupabaseClient,
    args: { filter: MovementsFilter; page: number; pageSize: number },
  ): Promise<MovementsListResult> {
    const { filter, page, pageSize } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = sb
      .from('stock_movements')
      .select(MOVEMENT_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filter.dateFrom) {
      q = q.gte('created_at', startOfLocalDayIso(filter.dateFrom))
    }
    if (filter.dateTo) {
      q = q.lte('created_at', endOfLocalDayIso(filter.dateTo))
    }
    if (filter.types.length) {
      q = q.in('movement_type', filter.types)
    }
    if (filter.productIds.length) {
      q = q.in('product_id', filter.productIds)
    }

    const { data, error, count } = await q
    if (error) throw error
    return {
      rows: (data ?? []) as unknown as MovementRow[],
      total: count ?? 0,
    }
  },
}
