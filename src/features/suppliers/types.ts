export type Supplier = {
  id: string
  clinic_id: string
  name: string
  created_at: string
  updated_at: string
  // Filled via embedded count(); used by the manage page to block deletion
  // of in-use suppliers and to show usage on each row.
  product_count?: number
}

export type SupplierInput = {
  name: string
}
