import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project credentials.',
  )
}

// Untyped client for now — replace with createClient<Database>(...) once
// `npm run db:types` is wired and src/types/database.ts is generated.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type AppSupabaseClient = typeof supabase

// Tie the JWT auto-refresh to tab visibility, per Supabase's official
// recommendation for SPAs. Background tabs are aggressively throttled by
// modern browsers; if auto-refresh fires during throttling, the request
// can stall indefinitely with no way to cancel it, and every subsequent
// query queues on that stalled promise. By pausing the refresher while
// the tab is hidden we never let that stall happen — the worst case is
// that the access_token expires mid-hide, which startAutoRefresh()
// catches and refreshes cleanly on return.
//
// Ref: https://supabase.com/docs/reference/javascript/auth-startautorefresh
if (typeof document !== 'undefined') {
  // The client starts auto-refreshing on its own; make sure it matches
  // the current visibility on first load too.
  if (document.visibilityState === 'hidden') {
    void supabase.auth.stopAutoRefresh()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void supabase.auth.startAutoRefresh()
    } else {
      void supabase.auth.stopAutoRefresh()
    }
  })
}
