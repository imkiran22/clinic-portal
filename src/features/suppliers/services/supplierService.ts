import type { AppSupabaseClient } from '@/lib/supabase'
import { getCurrentClinicId } from '@/lib/clinic'
import type { Supplier, SupplierInput } from '../types'

export const supplierService = {
  async list(sb: AppSupabaseClient): Promise<Supplier[]> {
    // Embed product count so the manage UI can show usage + block
    // deletion of in-use suppliers without an extra round-trip.
    const { data, error } = await sb
      .from('product_suppliers')
      .select('*, products(count)')
      .order('name')
    if (error) throw error
    type Row = Omit<Supplier, 'product_count'> & {
      products?: { count: number }[]
    }
    return (data ?? []).map((r: Row) => ({
      ...r,
      product_count: r.products?.[0]?.count ?? 0,
    })) as Supplier[]
  },

  async create(sb: AppSupabaseClient, input: SupplierInput): Promise<Supplier> {
    const clinic_id = await getCurrentClinicId(sb)
    if (!clinic_id) throw new Error('No clinic profile for current user')

    const { data, error } = await sb
      .from('product_suppliers')
      .insert({ clinic_id, name: input.name.trim() })
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  async update(
    sb: AppSupabaseClient,
    id: string,
    input: SupplierInput,
  ): Promise<Supplier> {
    const { data, error } = await sb
      .from('product_suppliers')
      .update({ name: input.name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  async remove(sb: AppSupabaseClient, id: string): Promise<void> {
    // FK on products.supplier_id is ON DELETE RESTRICT (suppliers are
    // required on products, unlike categories which are nullable).
    // The DB will reject deletion of an in-use supplier with 23503,
    // and the UI also blocks via product_count > 0.
    const { error } = await sb
      .from('product_suppliers')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
