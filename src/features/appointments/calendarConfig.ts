// Calendar grid constants. Clinic hours aren't stored anywhere yet, so
// they live here; move to a clinic-settings table when doctors need
// per-day hours or breaks.

// Minutes from midnight.
export const DAY_START = 9 * 60
export const DAY_END = 21 * 60

// Grid row height + drag/resize snap.
export const SLOT_MINUTES = 15

export const DEFAULT_DURATION = 30
export const DURATION_PRESETS = [15, 30, 45, 60, 90] as const

// Mirrors the CHECK constraint in migration 0024.
export const MIN_DURATION = 5
export const MAX_DURATION = DAY_END - DAY_START

// vue-cal weekday indexes: 1 = Mon … 7 = Sun. Clinic is closed Sundays.
export const HIDDEN_WEEKDAYS = [7]

export function clampDuration(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_DURATION
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(minutes)))
}
