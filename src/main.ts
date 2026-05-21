import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import App from './App'
import '@/styles/globals.css'
import 'vue-sonner/style.css'

// Tab-resume strategy — tiered, with a stuck-state detector as fallback.
//
// Observed pattern (consistently reproducible 2026-05-22): user alt-tabs
// away to another app for ~30s, returns, types a search, the new query
// hangs with no network activity. Root cause is supabase-js's background
// JWT auto-refresh stalling while the tab is throttled — every later
// query queues on the wedged refresh promise. We have no public API to
// cancel that promise, so the only reliable cure is a page reload.
//
// Tiers:
//   - Hidden < QUICK_MS         → no action (real quick switch, no risk).
//   - Hidden < RELOAD_THRESHOLD → soft nudge (refresh auth, invalidate
//                                 queries). If something's still hung
//                                 3s later, fall through to a reload.
//   - Hidden ≥ RELOAD_THRESHOLD → reload immediately. Same flash the
//                                 user has been doing manually.
//
// BFCache restore (back/forward navigation pulling a frozen page from
// cache) always reloads — frozen JS state is the worst case.
import { supabase } from '@/lib/supabase'

const QUICK_MS = 5_000 // < 5s = no-op, browser kept the page warm
const RELOAD_THRESHOLD_MS = 20_000 // ≥ 20s = reload outright
const STUCK_CHECK_MS = 3_000 // re-check 3s after soft nudge

function softNudge() {
  void supabase.auth.getSession().catch(() => {})
  queryClient.invalidateQueries()
}

// True if any active observer is still in initial-fetch state (no data,
// not yet errored). That's the visible "spinner that never resolves."
function hasStuckQueries(): boolean {
  return queryClient.getQueryCache().getAll().some((q) => {
    if (q.getObserversCount() === 0) return false
    return q.state.status === 'pending'
  })
}

if (typeof document !== 'undefined') {
  let hiddenAt: number | null = null

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (document.visibilityState !== 'visible') return

    const idleMs = hiddenAt ? Date.now() - hiddenAt : 0
    hiddenAt = null

    if (idleMs < QUICK_MS) return

    if (idleMs >= RELOAD_THRESHOLD_MS) {
      window.location.reload()
      return
    }

    // 5–10s idle: try the cheap fix first, then verify.
    softNudge()
    window.setTimeout(() => {
      if (hasStuckQueries()) window.location.reload()
    }, STUCK_CHECK_MS)
  })

  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) {
      window.location.reload()
    }
  })
}

createApp(App)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount('#app')
