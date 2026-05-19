export type MovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'PROCEDURE_USAGE'
  | 'DAMAGE'
  | 'EXPIRED'
  | 'ADJUSTMENT'

export type Product = {
  id: string
  clinic_id: string
  name: string
  sku: string | null
  batch_number: string | null
  expiry_date: string | null // ISO date YYYY-MM-DD
  supplier_name: string
  cost_price: number
  selling_price: number
  current_stock: number
  reorder_level: number
  category: string | null
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ProductInput = {
  name: string
  sku: string | null
  batch_number: string | null
  expiry_date: string | null
  supplier_name: string
  cost_price: number
  selling_price: number
  reorder_level: number
  category: string | null
  notes: string | null
}

export type ProductCreateInput = ProductInput & {
  initial_stock: number
}

export type StockMovement = {
  id: string
  clinic_id: string
  product_id: string
  patient_id: string | null
  visit_id: string | null
  movement_type: MovementType
  quantity: number // signed: + inflow / − outflow
  remarks: string | null
  created_by: string | null
  created_by_display: string | null
  created_at: string
}

// UI movement type — five options that map to four enum values in DB.
// ADJUSTMENT_IN / ADJUSTMENT_OUT both store as ADJUSTMENT with signed qty.
export type MovementFormType =
  | 'PURCHASE'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE'
  | 'EXPIRED'

export type MovementInput = {
  product_id: string
  movement_type: MovementType
  quantity: number // signed; final DB value
  remarks: string | null
}
