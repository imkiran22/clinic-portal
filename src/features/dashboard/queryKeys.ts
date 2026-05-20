export const dashboardKeys = {
  all: ['dashboard'] as const,
  lowStock: () => [...dashboardKeys.all, 'low-stock'] as const,
  expiring: (withinDays: number) =>
    [...dashboardKeys.all, 'expiring', withinDays] as const,
  followups: (date: string) =>
    [...dashboardKeys.all, 'followups', date] as const,
  upcomingFollowups: (date: string, withinDays: number) =>
    [...dashboardKeys.all, 'followups-upcoming', date, withinDays] as const,
  recentSales: (limit: number) =>
    [...dashboardKeys.all, 'recent-sales', limit] as const,
}
