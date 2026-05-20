import { computed, defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import DashboardCard from './DashboardCard'
import { useTodaysFollowups } from '../composables/useDashboard'

export default defineComponent({
  name: 'TodaysFollowupsCard',
  setup() {
    const router = useRouter()
    const { data, isLoading, error } = useTodaysFollowups()

    const accent = computed(() =>
      (data.value?.total ?? 0) > 0 ? ('info' as const) : ('default' as const),
    )

    return () => (
      <DashboardCard
        title="Today's follow-ups"
        hint="Patients due back today"
        count={data.value?.total ?? null}
        loading={isLoading.value}
        errorMessage={(error.value as { message?: string } | null)?.message ?? (error.value ? "Failed to load" : "")}
        accent={accent.value}
        viewAllLabel={
          (data.value?.total ?? 0) > 5
            ? `View all ${data.value!.total} in patients`
            : ''
        }
        onViewAll={() => router.push({ name: 'patients' })}
      >
        {{
          empty: () => 'Nobody on the books today.',
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
                    {f.patient?.legacy_client_no && (
                      <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                        #{f.patient.legacy_client_no}
                      </span>
                    )}
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
