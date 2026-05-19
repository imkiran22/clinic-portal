import type { AppSupabaseClient } from '@/lib/supabase'
import { getCurrentClinicId } from '@/lib/clinic'
import type {
  MovementInput,
  Product,
  ProductCreateInput,
  ProductInput,
  StockMovement,
} from '../types'

export type ListResult = { rows: Product[]; total: number }

export const inventoryService = {
  async list(
    sb: AppSupabaseClient,
    args: { search?: string; page: number; pageSize: number },
  ): Promise<ListResult> {
    const { search, page, pageSize } = args
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = sb
      .from('products_active')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to)

    const s = search?.trim()
    if (s) {
      q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,category.ilike.%${s}%`)
    }

    const { data, error, count } = await q
    if (error) throw error
    return { rows: (data ?? []) as Product[], total: count ?? 0 }
  },

  async get(sb: AppSupabaseClient, id: string): Promise<Product | null> {
    const { data, error } = await sb
      .from('products_active')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as Product | null) ?? null
  },

  async createWithStock(
    sb: AppSupabaseClient,
    input: ProductCreateInput,
  ): Promise<Product> {
    const { data, error } = await sb.rpc('create_product_with_stock', {
      p_name: input.name,
      p_sku: input.sku,
      p_batch_number: input.batch_number,
      p_expiry_date: input.expiry_date,
      p_supplier_name: input.supplier_name,
      p_cost_price: input.cost_price,
      p_selling_price: input.selling_price,
      p_reorder_level: input.reorder_level,
      p_category: input.category,
      p_notes: input.notes,
      p_initial_stock: input.initial_stock,
    })
    if (error) throw error
    return data as Product
  },

  async update(
    sb: AppSupabaseClient,
    id: string,
    input: ProductInput,
  ): Promise<Product> {
    const { data, error } = await sb
      .from('products')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Product
  },

  async softDelete(sb: AppSupabaseClient, id: string): Promise<void> {
    const { error } = await sb
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async recordMovement(
    sb: AppSupabaseClient,
    input: MovementInput,
  ): Promise<StockMovement> {
    const clinic_id = await getCurrentClinicId(sb)
    if (!clinic_id) throw new Error('No clinic profile for current user')

    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await sb
      .from('stock_movements')
      .insert({
        clinic_id,
        product_id: input.product_id,
        movement_type: input.movement_type,
        quantity: input.quantity,
        remarks: input.remarks,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    return data as StockMovement
  },

  async sellProduct(
    sb: AppSupabaseClient,
    args: {
      product_id: string
      patient_id: string
      visit_id?: string | null
      quantity: number
      remarks?: string | null
    },
  ): Promise<StockMovement> {
    const { data, error } = await sb.rpc('sell_product', {
      p_product_id: args.product_id,
      p_patient_id: args.patient_id,
      p_visit_id: args.visit_id ?? null,
      p_quantity: args.quantity,
      p_remarks: args.remarks ?? null,
    })
    if (error) throw error
    return data as StockMovement
  },

  async listMovements(
    sb: AppSupabaseClient,
    productId: string,
    limit = 100,
  ): Promise<StockMovement[]> {
    // Embed the patient via the FK relationship so sale rows can show
    // who the product was sold to. Soft-deleted patients still resolve
    // because RLS on `patients` is tenant-scoped only — `deleted_at`
    // filtering lives in the patients_active view, not at the table.
    const { data, error } = await sb
      .from('stock_movements')
      .select('*, patient:patients(id, name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as StockMovement[]
  },
}
