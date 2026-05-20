import { defineComponent, onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AlertTriangle, RefreshCcw } from 'lucide-vue-next'

// Vue's onErrorCaptured catches any render/setup/lifecycle error in the
// subtree. We show a fallback panel and reset on route change so the user
// isn't trapped — a broken /inventory shouldn't poison /dashboard.

export default defineComponent({
  name: 'ErrorBoundary',
  setup(_, { slots }) {
    const error = ref<Error | null>(null)
    const route = useRoute()

    onErrorCaptured((err) => {
      error.value = err as Error
      // Stop the error from propagating further so the app stays mounted.
      return false
    })

    // Clear the captured error when the user navigates away — they're past
    // the broken view.
    watch(
      () => route.fullPath,
      () => {
        if (error.value) error.value = null
      },
    )

    const retry = () => {
      error.value = null
    }

    return () => {
      if (error.value) {
        return (
          <div class="min-h-[60vh] flex items-center justify-center p-6">
            <div class="max-w-md w-full rounded-lg border border-destructive/40 bg-card p-6 space-y-4 text-center">
              <div class="mx-auto w-12 h-12 rounded-full bg-red-500/15 text-red-700 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle class="size-6" />
              </div>
              <div>
                <h2 class="text-lg font-semibold">Something went wrong</h2>
                <p class="text-sm text-muted-foreground mt-1">
                  This screen hit an error and couldn't render. Try again, or
                  navigate elsewhere.
                </p>
              </div>
              <div class="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 text-left font-mono break-words max-h-32 overflow-auto">
                {error.value.message ?? String(error.value)}
              </div>
              <button
                type="button"
                onClick={retry}
                class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <RefreshCcw class="size-4" />
                <span>Try again</span>
              </button>
            </div>
          </div>
        )
      }
      return slots.default?.()
    }
  },
})
