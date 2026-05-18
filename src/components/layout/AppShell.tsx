import { defineComponent, ref } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default defineComponent({
  name: 'AppShell',
  setup() {
    const sidebarOpen = ref(false)

    return () => (
      <div class="flex min-h-screen bg-background text-foreground">
        <Sidebar open={sidebarOpen.value} onClose={() => (sidebarOpen.value = false)} />
        <div class="flex-1 flex flex-col min-w-0">
          <Topbar onToggleSidebar={() => (sidebarOpen.value = !sidebarOpen.value)} />
          <main class="flex-1 p-6 overflow-auto">
            <RouterView />
          </main>
        </div>
      </div>
    )
  },
})
