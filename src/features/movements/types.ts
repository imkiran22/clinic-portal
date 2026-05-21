import type { MovementType } from '@/features/inventory/types'

export type MovementRow = {
  id: string
  created_at: string
  movement_type: MovementType
  quantity: number // signed: + inflow, − outflow
  remarks: string | null
  created_by_display: string | null
  product: { id: string; name: string } | null
  // Only populated for SALE / PROCEDURE_USAGE rows.
  patient: {
    id: string
    name: string
    legacy_client_no: number | null
  } | null
}

export type MovementsFilter = {
  // YYYY-MM-DD (local). null = no bound.
  dateFrom: string | null
  dateTo: string | null
  // Multi-select. Empty = no filter (all types shown).
  types: MovementType[]
  productIds: string[]
}
