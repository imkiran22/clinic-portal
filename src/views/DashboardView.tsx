import { defineComponent } from 'vue'
import LowStockCard from '@/features/dashboard/components/LowStockCard'
import ExpiringSoonCard from '@/features/dashboard/components/ExpiringSoonCard'
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
            Today at a glance — stock pressure, expiring batches, follow-ups,
            and the latest sales.
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <LowStockCard />
          <ExpiringSoonCard />
          <TodaysFollowupsCard />
          <RecentSalesCard />
          <div class="sm:col-span-2 xl:col-span-4">
            <UpcomingFollowupsCard />
          </div>
        </div>
      </div>
    )
  },
})
