import { computed, defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import DashboardCard from './DashboardCard'
import { useUpcomingFollowups } from '../composables/useDashboard'

function startOfLocalDay(d = new Date()): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function relativeDayLabel(isoDate: string): string {
  const today = startOfLocalDay()
  const target = startOfLocalDay(new Date(isoDate + 'T00:00:00'))
  const days = Math.round(
    (target.getTime() - today.getTime()) / 86_400_000,
  )
  if (days === 1) return 'Tomorrow'
  if (days === 2) return 'Day after tomorrow'
  // Beyond that, a short calendar form is easier to scan than "+N days".
  return target.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default defineComponent({
  name: 'UpcomingFollowupsCard',
  setup() {
    const router = useRouter()
    const { data, isLoading, error } = useUpcomingFollowups()

    const accent = computed(() =>
      (data.value?.total ?? 0) > 0 ? ('info' as const) : ('default' as const),
    )

    return () => (
      <DashboardCard
        title="Upcoming follow-ups"
        hint="Next 3 days"
        count={data.value?.total ?? null}
        loading={isLoading.value}
        errorMessage={
          (error.value as { message?: string } | null)?.message ??
          (error.value ? 'Failed to load' : '')
        }
        accent={accent.value}
        viewAllLabel={
          (data.value?.total ?? 0) > 5
            ? `View all ${data.value!.total} in patients`
            : ''
        }
        onViewAll={() => router.push({ name: 'patients' })}
      >
        {{
          empty: () => 'Quiet week ahead.',
          default: () => (
            <ul class="divide-y divide-border">
              {(data.value?.rows ?? []).map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push({
                        name: 'patient-detail',
                        params: { id: f.patient_id },
                      })
                    }
                    class="w-full px-2 py-2 text-left hover:bg-accent rounded-md flex items-center justify-between gap-3"
                  >
                    <span class="text-sm truncate">
                      {f.patient?.name ?? 'Unknown patient'}
                    </span>
                    <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                      {relativeDayLabel(f.followup_date)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ),
        }}
      </DashboardCard>
    )
  },
})
