import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import App from './App'
import '@/styles/globals.css'

createApp(App)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount('#app')
