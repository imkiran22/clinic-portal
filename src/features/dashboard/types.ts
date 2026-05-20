export type LowStockProduct = {
  id: string
  name: string
  current_stock: number
  reorder_level: number
  sku: string | null
}

export type ExpiringProduct = {
  id: string
  name: string
  batch_number: string | null
  expiry_date: string // YYYY-MM-DD
  current_stock: number
}

export type FollowupRow = {
  id: string // visit id
  patient_id: string
  followup_date: string // YYYY-MM-DD
  patient: { id: string; name: string; legacy_client_no: number | null } | null
}

export type RecentSale = {
  id: string // movement id
  created_at: string
  quantity: number // signed, negative for sales
  product: { id: string; name: string } | null
  patient: { id: string; name: string } | null
}
