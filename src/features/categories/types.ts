export type Category = {
  id: string
  clinic_id: string
  name: string
  created_at: string
  updated_at: string
  // Optional: how many products reference this category, embedded via count
  product_count?: number
}

export type CategoryInput = {
  name: string
}
