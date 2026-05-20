import type { AppSupabaseClient } from '@/lib/supabase'
import type {
  ExpiringProduct,
  FollowupRow,
  LowStockProduct,
  RecentSale,
} from '../types'

const DEFAULT_LIMIT = 5

function todayIsoDate(): string {
  // YYYY-MM-DD in local time — visits.followup_date is a DATE (no tz),
  // so we compare against the local calendar day.
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function plusDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const dashboardService = {
  async lowStock(
    sb: AppSupabaseClient,
    limit = DEFAULT_LIMIT,
  ): Promise<{ rows: LowStockProduct[]; total: number }> {
    // products_low_stock view bakes in `current_stock <= reorder_level
    // AND reorder_level > 0` — PostgREST can't compare two columns inline.
    const { data, error, count } = await sb
      .from('products_low_stock')
      .select('id, name, current_stock, reorder_level, sku', { count: 'exact' })
      .order('current_stock', { ascending: true })
      .limit(limit)
    if (error) throw error
    return {
      rows: (data ?? []) as LowStockProduct[],
      total: count ?? 0,
    }
  },

  async expiring(
    sb: AppSupabaseClient,
    withinDays = 60,
    limit = DEFAULT_LIMIT,
  ): Promise<{ rows: ExpiringProduct[]; total: number }> {
    // Within the next N days AND still has stock. Already-expired batches
    // are excluded from the "expiring soon" card — they're a separate
    // category (consider EXPIRED movements to write off).
    const today = todayIsoDate()
    const cutoff = plusDays(today, withinDays)
    const { data, error, count } = await sb
      .from('products_active')
      .select(
        'id, name, batch_number, expiry_date, current_stock',
        { count: 'exact' },
      )
      .gt('current_stock', 0)
      .gte('expiry_date', today)
      .lte('expiry_date', cutoff)
      .order('expiry_date', { ascending: true })
      .limit(limit)
    if (error) throw error
    return {
      rows: (data ?? []) as ExpiringProduct[],
      total: count ?? 0,
    }
  },

  async todaysFollowups(
    sb: AppSupabaseClient,
    limit = DEFAULT_LIMIT,
  ): Promise<{ rows: FollowupRow[]; total: number }> {
    const today = todayIsoDate()
    const { data, error, count } = await sb
      .from('visits')
      .select(
        'id, patient_id, followup_date, patient:patients(id, name, legacy_client_no)',
        { count: 'exact' },
      )
      .eq('followup_date', today)
      .order('visit_date', { ascending: false })
      .limit(limit)
    if (error) throw error
    return {
      rows: (data ?? []) as unknown as FollowupRow[],
      total: count ?? 0,
    }
  },

  async upcomingFollowups(
    sb: AppSupabaseClient,
    withinDays = 7,
    limit = DEFAULT_LIMIT,
  ): Promise<{ rows: FollowupRow[]; total: number }> {
    // "Upcoming" = strictly after today, through the next N days. Today's
    // bucket is its own card so we don't double-count.
    const today = todayIsoDate()
    const cutoff = plusDays(today, withinDays)
    const { data, error, count } = await sb
      .from('visits')
      .select(
        'id, patient_id, followup_date, patient:patients(id, name, legacy_client_no)',
        { count: 'exact' },
      )
      .gt('followup_date', today)
      .lte('followup_date', cutoff)
      .order('followup_date', { ascending: true })
      .limit(limit)
    if (error) throw error
    return {
      rows: (data ?? []) as unknown as FollowupRow[],
      total: count ?? 0,
    }
  },

  async recentSales(
    sb: AppSupabaseClient,
    limit = 10,
  ): Promise<RecentSale[]> {
    const { data, error } = await sb
      .from('stock_movements')
      .select(
        'id, created_at, quantity, product:products(id, name), patient:patients(id, name)',
      )
      .eq('movement_type', 'SALE')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as unknown as RecentSale[]
  },
}
