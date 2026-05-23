// Shared date/time formatters. Centralised because `Date.toLocaleString()`
// without options falls back to the browser's locale — en-GB shows
// 24-hour time, en-US flips the day/month order, etc. The clinic
// standardised on DD/MM/YYYY dates + 12-hour AM/PM time, so every
// display site goes through one of these helpers.
//
// Use:
//   - `formatDateTime(iso)` → "23/05/2026, 10:30 AM"
//   - `formatTime(iso)`     → "10:30 AM"
//   - `formatDate(iso)`     → "23/05/2026"
//
// All three accept null/undefined and return a placeholder ("—" or "")
// instead of crashing on a bad value.

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
}

export function formatDateTime(
  iso: string | null | undefined,
  fallback = '—',
): string {
  if (!iso) return fallback
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return fallback
    const date = d.toLocaleDateString('en-GB') // DD/MM/YYYY
    const time = d.toLocaleTimeString('en-US', TIME_OPTS) // h:mm AM/PM
    return `${date}, ${time}`
  } catch {
    return fallback
  }
}

export function formatTime(
  iso: string | null | undefined,
  fallback = '',
): string {
  if (!iso) return fallback
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleTimeString('en-US', TIME_OPTS)
  } catch {
    return fallback
  }
}

export function formatDate(
  iso: string | null | undefined,
  fallback = '—',
): string {
  if (!iso) return fallback
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleDateString('en-GB')
  } catch {
    return fallback
  }
}
