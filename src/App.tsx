import { defineComponent } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

export default defineComponent({
  name: 'App',
  setup() {
    return () => (
      <>
        <ErrorBoundary>
          <RouterView />
        </ErrorBoundary>
        <Toaster position="top-right" richColors closeButton />
      </>
    )
  },
})
