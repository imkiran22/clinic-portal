import { computed, defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import DashboardCard from './DashboardCard'
import { useTodaysAppointments } from '@/features/appointments/composables/useAppointments'

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default defineComponent({
  name: 'TodaysAppointmentsCard',
  setup() {
    const router = useRouter()
    const { data, isLoading, error } = useTodaysAppointments()

    const accent = computed(() =>
      (data.value?.total ?? 0) > 0 ? ('info' as const) : ('default' as const),
    )

    return () => {
      const rows = data.value?.rows ?? []
      return (
        <DashboardCard
          title="Today's appointments"
          hint="Scheduled for today"
          count={data.value?.total ?? null}
          loading={isLoading.value}
          errorMessage={
            (error.value as { message?: string } | null)?.message ??
            (error.value ? 'Failed to load' : '')
          }
          accent={accent.value}
          viewAllLabel={
            (data.value?.total ?? 0) > 0
              ? "View today's roster"
              : 'Open appointments'
          }
          onViewAll={() => router.push({ name: 'appointments' })}
        >
          {{
            empty: () => 'No appointments on the books today.',
            default: () => (
              <ul class="divide-y divide-border">
                {rows.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => router.push({ name: 'appointments' })}
                      class="w-full px-2 py-2 text-left hover:bg-accent rounded-md flex items-start justify-between gap-3"
                    >
                      <div class="min-w-0">
                        <div class="text-sm truncate">
                          {a.patient?.name ?? 'Unknown patient'}
                        </div>
                        <div class="text-xs text-muted-foreground truncate">
                          {a.treatment_description}
                          {a.session_number !== null
                            ? ` · #${a.session_number}`
                            : ''}
                        </div>
                      </div>
                      <div class="text-xs tabular-nums text-muted-foreground shrink-0">
                        {fmtTime(a.scheduled_at)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ),
          }}
        </DashboardCard>
      )
    }
  },
})
