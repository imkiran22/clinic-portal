import { defineComponent } from 'vue'
import LowStockCard from '@/features/dashboard/components/LowStockCard'
import ExpiringSoonCard from '@/features/dashboard/components/ExpiringSoonCard'
import TodaysAppointmentsCard from '@/features/dashboard/components/TodaysAppointmentsCard'
import TodaysFollowupsCard from '@/features/dashboard/components/TodaysFollowupsCard'
import UpcomingFollowupsCard from '@/features/dashboard/components/UpcomingFollowupsCard'
import RecentSalesCard from '@/features/dashboard/components/RecentSalesCard'

export default defineComponent({
  name: 'DashboardView',
  setup() {
    return () => (
      <div class="space-y-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p class="text-sm text-muted-foreground mt-1">
            Today at a glance — appointments, stock pressure, expiring
            batches, follow-ups, and the latest sales.
          </p>
        </div>
        {/* Row 1: 5 single-col cards at xl (today-appointments first
            because that's the morning action). The wide row-2 card
            spans the same 5 columns so the right edge aligns. */}
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <TodaysAppointmentsCard />
          <TodaysFollowupsCard />
          <LowStockCard />
          <ExpiringSoonCard />
          <RecentSalesCard />
          <div class="sm:col-span-2 xl:col-span-5">
            <UpcomingFollowupsCard />
          </div>
        </div>
      </div>
    )
  },
})
