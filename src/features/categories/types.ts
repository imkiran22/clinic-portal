export type Category = {
  id: string
  clinic_id: string
  name: string
  // Date the category became relevant to the clinic. Defaults to today
  // on insert; staff backdate when adding a category for stock that
  // arrived earlier. Distinct from created_at, which is the audit
  // timestamp of when the row was inserted in the system.
  added_on: string // YYYY-MM-DD
  created_at: string
  updated_at: string
  // Optional: how many products reference this category, embedded via count
  product_count?: number
}

export type CategoryInput = {
  name: string
  // Optional on create — omit to let the DB default (current_date).
  added_on?: string | null
}
