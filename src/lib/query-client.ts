import { QueryClient } from '@tanstack/vue-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Refetch when the user returns to the tab — caps how stale data can be
      // and, just as importantly, wakes up any query that got parked while the
      // tab was idle (otherwise pages can sit at "Loading…" indefinitely).
      refetchOnWindowFocus: true,
      // 'always' opts out of the online/offline pause behaviour. The clinic is
      // always online; the default networkMode would otherwise pause queries
      // whenever the browser's online heuristic flickered, and on bfcache
      // restore those paused queries never resumed.
      networkMode: 'always',
      retry: 1,
    },
    mutations: {
      retry: 0,
      networkMode: 'always',
    },
  },
})
