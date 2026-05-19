import { computed, defineComponent } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

export default defineComponent({
  name: 'Pagination',
  props: {
    page: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  emits: ['update:page'],
  setup(props, { emit }) {
    const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
    const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
    const to = computed(() => Math.min(props.page * props.pageSize, props.total))

    const canPrev = computed(() => props.page > 1)
    const canNext = computed(() => props.page < totalPages.value)

    return () => (
      <div class="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>
          {props.total === 0
            ? 'No results'
            : `Showing ${from.value}–${to.value} of ${props.total}`}
        </div>
        <div class="flex items-center gap-2">
          <span class="hidden sm:inline">
            Page {props.page} of {totalPages.value}
          </span>
          <button
            type="button"
            disabled={!canPrev.value}
            onClick={() => emit('update:page', props.page - 1)}
            class="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border text-sm hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <ChevronLeft class="size-4" />
            <span class="hidden sm:inline">Prev</span>
          </button>
          <button
            type="button"
            disabled={!canNext.value}
            onClick={() => emit('update:page', props.page + 1)}
            class="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border text-sm hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <span class="hidden sm:inline">Next</span>
            <ChevronRight class="size-4" />
          </button>
        </div>
      </div>
    )
  },
})
