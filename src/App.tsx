import { defineComponent } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'

export default defineComponent({
  name: 'App',
  setup() {
    return () => (
      <>
        <RouterView />
        <Toaster position="top-right" richColors closeButton />
      </>
    )
  },
})
