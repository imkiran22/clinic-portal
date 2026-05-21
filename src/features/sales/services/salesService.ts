import type { AppSupabaseClient } from '@/lib/supabase'
import type {
  SaleRow,
  SalesFilter,
  SalesStats,
  SalesBucketStats,
} from '../types'

export type SalesListResult = { rows: SaleRow[]; total: number }

const SALE_SELECT =
  '*, patient:patients(id, name, legacy_client_no), product:products(id, name, selling_price)'

// Local-day → ISO conversion. `created_at` is timestamptz so we anchor
// the boundaries to the user's local midnight rather than UTC.
function startOfLocalDayIso(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toISOString()
}
function endOfLocalDayIso(ymd: string): string {
  // 23:59:59.999 of the given local day
  const d = new Date(ymd + 'T00:00:00')
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function startOfTodayLocal(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeekLocal(): Date {
  // Week starts Monday — common convention in India.
  const d = startOfTodayLocal()
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function startOfMonthLocal(): Date {
  const d = startOfTodayLocal()
  d.setDate(1)
  return d
}

export const salesService = {
  async list(
    sb: AppSupabaseClient,
    args: { filter: SalesFilter; page: number; pageSize: number },
  ): Promise<SalesListResult> {
    const { filter, page, pageSize } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = sb
      .from('stock_movements')
      .select(SALE_SELECT, { count: 'exact' })
      .eq('movement_type', 'SALE')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filter.dateFrom) {
      q = q.gte('created_at', startOfLocalDayIso(filter.dateFrom))
    }
    if (filter.dateTo) {
      q = q.lte('created_at', endOfLocalDayIso(filter.dateTo))
    }
    if (filter.patientId) {
      q = q.eq('patient_id', filter.patientId)
    }
    if (filter.productId) {
      q = q.eq('product_id', filter.productId)
    }

    const { data, error, count } = await q
    if (error) throw error
    return {
      rows: (data ?? []) as unknown as SaleRow[],
      total: count ?? 0,
    }
  },

  async stats(sb: AppSupabaseClient): Promise<SalesStats> {
    // Fetch this-month-to-now once and bucket client-side. For a small
    // clinic that's bounded by usage; if it ever grows past a few
    // thousand rows we can move the aggregation to an RPC.
    const since = startOfMonthLocal().toISOString()
    const { data, error } = await sb
      .from('stock_movements')
      .select('created_at, quantity, product:products(selling_price)')
      .eq('movement_type', 'SALE')
      .gte('created_at', since)
    if (error) throw error

    const rows = (data ?? []) as unknown as Array<{
      created_at: string
      quantity: number
      // Supabase types embedded relations as arrays even for ?-to-one
      // FKs, so accept either shape and normalise below.
      product:
        | { selling_price: number }
        | { selling_price: number }[]
        | null
    }>

    const todayCutoff = startOfTodayLocal().getTime()
    const weekCutoff = startOfWeekLocal().getTime()
    const monthCutoff = startOfMonthLocal().getTime()

    const empty = (): SalesBucketStats => ({ count: 0, revenue: 0 })
    const out = { today: empty(), thisWeek: empty(), thisMonth: empty() }

    for (const r of rows) {
      const t = new Date(r.created_at).getTime()
      const qty = Math.abs(r.quantity)
      const prod = Array.isArray(r.product) ? r.product[0] : r.product
      const unit = prod?.selling_price ?? 0
      const line = qty * unit

      if (t >= monthCutoff) {
        out.thisMonth.count += 1
        out.thisMonth.revenue += line
      }
      if (t >= weekCutoff) {
        out.thisWeek.count += 1
        out.thisWeek.revenue += line
      }
      if (t >= todayCutoff) {
        out.today.count += 1
        out.today.revenue += line
      }
    }
    return out
  },
}
