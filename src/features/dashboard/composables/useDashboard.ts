import { useQuery } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { dashboardService } from '../services/dashboardService'
import { dashboardKeys } from '../queryKeys'

// Each card runs its own query so the slowest one doesn't hold up the others.
// All four are dispatched in parallel by Vue Query when the view mounts.

export function useLowStock() {
  return useQuery({
    queryKey: dashboardKeys.lowStock(),
    queryFn: () => dashboardService.lowStock(supabase),
  })
}

const EXPIRING_WINDOW_DAYS = 60

export function useExpiringSoon() {
  return useQuery({
    queryKey: dashboardKeys.expiring(EXPIRING_WINDOW_DAYS),
    queryFn: () => dashboardService.expiring(supabase, EXPIRING_WINDOW_DAYS),
  })
}

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useTodaysFollowups() {
  return useQuery({
    queryKey: dashboardKeys.followups(todayIsoDate()),
    queryFn: () => dashboardService.todaysFollowups(supabase),
  })
}

const UPCOMING_WINDOW_DAYS = 3

export function useUpcomingFollowups() {
  return useQuery({
    queryKey: dashboardKeys.upcomingFollowups(
      todayIsoDate(),
      UPCOMING_WINDOW_DAYS,
    ),
    queryFn: () =>
      dashboardService.upcomingFollowups(supabase, UPCOMING_WINDOW_DAYS),
  })
}

const RECENT_SALES_LIMIT = 10

export function useRecentSales() {
  return useQuery({
    queryKey: dashboardKeys.recentSales(RECENT_SALES_LIMIT),
    queryFn: () => dashboardService.recentSales(supabase, RECENT_SALES_LIMIT),
  })
}
