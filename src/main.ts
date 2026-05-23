import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import App from './App'
import '@/styles/globals.css'
import 'vue-sonner/style.css'
import '@vuepic/vue-datepicker/dist/main.css'

// Tab-resume strategy.
//
// The root-cause fix for "queries hang after alt-tab" lives in
// src/lib/supabase.ts — we pause supabase's JWT auto-refresh when the
// tab is hidden and resume it on visibility, per Supabase's official
// guidance for SPAs. That prevents the queue-stall that produced the
// hang in the first place (background-throttled refresh promise that
// can't be cancelled).
//
// This file adds two thin layers on top:
//   1. Soft nudge on resume — invalidate queries so stale lists don't
//      sit there from before the user looked away.
//   2. Stuck-query detector as a last-resort safety net — if 3 seconds
//      after the nudge any active query is still in initial-fetch
//      state, something slipped past the supabase fix; reload as the
//      only reliable cure. Skipped while a modal is open or the user
//      is on /visits/new so we never nuke unsaved form input.
//
// BFCache restore (browser back/forward pulling a frozen page from
// cache) always reloads when safe — frozen JS state is unrecoverable.

const STUCK_CHECK_MS = 3_000

function softNudge() {
  queryClient.invalidateQueries()
}

function hasStuckQueries(): boolean {
  return queryClient.getQueryCache().getAll().some((q) => {
    if (q.getObserversCount() === 0) return false
    return q.state.status === 'pending'
  })
}

// Refuse to reload (and lose unsaved input) when the user is mid-edit.
// Heuristic — update this list when new long-form pages or modal entry
// points get added:
//   - Any open Modal: rendered as [role=dialog][aria-modal=true]
//   - /visits/new — full-page form outside any modal
function isUnsafeToReload(): boolean {
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return true
  if (window.location.pathname === '/visits/new') return true
  return false
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    softNudge()
    window.setTimeout(() => {
      if (hasStuckQueries() && !isUnsafeToReload()) {
        window.location.reload()
      }
    }, STUCK_CHECK_MS)
  })

  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted && !isUnsafeToReload()) {
      window.location.reload()
    }
  })
}

createApp(App)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount('#app')
