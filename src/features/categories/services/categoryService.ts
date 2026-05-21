import type { AppSupabaseClient } from '@/lib/supabase'
import { getCurrentClinicId } from '@/lib/clinic'
import type { Category, CategoryInput } from '../types'

export const categoryService = {
  async list(sb: AppSupabaseClient): Promise<Category[]> {
    // Include a denormalised product count so the manage UI can show usage
    // and prevent deletion of in-use categories without an extra round-trip.
    const { data, error } = await sb
      .from('product_categories')
      .select('*, products(count)')
      .order('name')
    if (error) throw error
    type Row = Omit<Category, 'product_count'> & {
      products?: { count: number }[]
    }
    return (data ?? []).map((r: Row) => ({
      ...r,
      product_count: r.products?.[0]?.count ?? 0,
    })) as Category[]
  },

  async create(sb: AppSupabaseClient, input: CategoryInput): Promise<Category> {
    const clinic_id = await getCurrentClinicId(sb)
    if (!clinic_id) throw new Error('No clinic profile for current user')

    const { data, error } = await sb
      .from('product_categories')
      .insert({ clinic_id, name: input.name.trim() })
      .select()
      .single()
    if (error) throw error
    return data as Category
  },

  async update(
    sb: AppSupabaseClient,
    id: string,
    input: CategoryInput,
  ): Promise<Category> {
    const { data, error } = await sb
      .from('product_categories')
      .update({ name: input.name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Category
  },

  async remove(sb: AppSupabaseClient, id: string): Promise<void> {
    // FK on products.category_id is ON DELETE SET NULL, so deleting a
    // category in use will simply uncategorise those products. We block
    // this in the UI via product_count > 0, but the DB stays safe.
    const { error } = await sb
      .from('product_categories')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
