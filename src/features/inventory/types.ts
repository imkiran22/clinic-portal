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
  supplier_id: string
  cost_price: number
  selling_price: number
  current_stock: number
  reorder_level: number
  category_id: string | null
  notes: string | null
  // Date the stock was actually received. Defaults to today on insert;
  // staff override when entering a product a day or two late.
  received_on: string // YYYY-MM-DD
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Embedded via select join — resolves display names when listing or
  // fetching a product.
  category?: { id: string; name: string } | null
  supplier?: { id: string; name: string } | null
}

export type ProductInput = {
  name: string
  sku: string | null
  batch_number: string | null
  expiry_date: string | null
  supplier_id: string
  cost_price: number
  selling_price: number
  reorder_level: number
  category_id: string | null
  notes: string | null
}

export type ProductCreateInput = ProductInput & {
  initial_stock: number
  // Backdate the "received" date when entering older stock. Empty / omitted
  // → server uses current_date.
  received_on: string | null
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
  // Embedded via select join — present on rows that reference a patient
  // (SALE, PROCEDURE_USAGE). NULL for inventory-only movements.
  patient?: { id: string; name: string } | null
  // Embedded when listing a visit's movements — resolves product details
  // for the dispensed-lines view.
  product?: { id: string; name: string; selling_price: number } | null
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
