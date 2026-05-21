export type SaleRow = {
  id: string
  created_at: string
  quantity: number // signed, always negative for SALE movements
  remarks: string | null
  created_by_display: string | null
  patient: {
    id: string
    name: string
    legacy_client_no: number | null
  } | null
  // Resolved at read time — historical totals will shift if a product's
  // selling_price changes later. Acceptable trade-off; if "frozen" totals
  // become necessary we'll snapshot unit_price onto stock_movements.
  product: { id: string; name: string; selling_price: number } | null
}

export type SalesFilter = {
  // YYYY-MM-DD (local calendar day). Empty / null = no bound.
  dateFrom: string | null
  dateTo: string | null
  patientId: string | null
  productId: string | null
}

export type SalesBucketStats = {
  count: number
  revenue: number
}

export type SalesStats = {
  today: SalesBucketStats
  thisWeek: SalesBucketStats
  thisMonth: SalesBucketStats
}
