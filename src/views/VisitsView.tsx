import { computed, defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import {
  useVisits,
  VISITS_PAGE_SIZE,
} from '@/features/visits/composables/useVisits'
import VisitsTable from '@/features/visits/components/VisitsTable'
import VisitDetailModal from '@/features/visits/components/VisitDetailModal'
import Pagination from '@/components/shared/Pagination'
import type { Visit } from '@/features/visits/types'

export default defineComponent({
  name: 'VisitsView',
  setup() {
    const router = useRouter()
    const page = ref(1)

    const { data, isLoading, isError, error, isFetching } = useVisits(page)

    const rows = computed(() => data.value?.rows ?? [])
    const total = computed(() => data.value?.total ?? 0)

    const selectedVisit = ref<Visit | null>(null)
    const detailOpen = ref(false)

    const openVisit = (v: Visit) => {
      selectedVisit.value = v
      detailOpen.value = true
    }

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-shrink-0 space-y-4 pb-4">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Visits</h1>
              <p class="text-sm text-muted-foreground mt-1">
                {isLoading.value
                  ? 'Loading…'
                  : `${total.value} visit${total.value === 1 ? '' : 's'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push({ name: 'visit-new' })}
              class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus class="size-4" />
              <span>New visit</span>
            </button>
          </div>

          {isError.value && (
            <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {(error.value as { message?: string })?.message ??
                'Failed to load visits.'}
            </div>
          )}
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          {isLoading.value && (
            <div class="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} class="h-12 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading.value && !isError.value && total.value === 0 && (
            <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              No visits yet. Click "New visit" to record the first one.
            </div>
          )}

          {!isLoading.value && !isError.value && total.value > 0 && (
            <div class={isFetching.value ? 'opacity-60 transition-opacity' : ''}>
              <VisitsTable visits={rows.value} onOpen={openVisit} />
            </div>
          )}
        </div>

        {!isLoading.value && !isError.value && total.value > 0 && (
          <div class="flex-shrink-0 pt-3 mt-3 border-t border-border">
            <Pagination
              page={page.value}
              pageSize={VISITS_PAGE_SIZE}
              total={total.value}
              onUpdate:page={(p: number) => (page.value = p)}
            />
          </div>
        )}

        <VisitDetailModal
          open={detailOpen.value}
          visit={selectedVisit.value}
          onUpdate:open={(v: boolean) => (detailOpen.value = v)}
        />
      </div>
    )
  },
})
