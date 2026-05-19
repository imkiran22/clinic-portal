import { z } from 'zod'
import type { MovementInput, MovementType, Product } from './types'

// ---------- Product form ----------
export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  sku: z.string(),
  batch_number: z.string(),
  expiry_date: z.string(), // 'YYYY-MM-DD' from <input type="date"> or ''
  supplier_name: z.string().min(1, 'Supplier is required'),
  cost_price: z
    .string()
    .regex(/^$|^\d+(\.\d{1,2})?$/, 'Numbers only (up to 2 decimals)'),
  selling_price: z
    .string()
    .regex(/^$|^\d+(\.\d{1,2})?$/, 'Numbers only (up to 2 decimals)'),
  reorder_level: z.string().regex(/^$|^\d+$/, 'Whole numbers only'),
  category: z.string(),
  notes: z.string(),
  initial_stock: z.string().regex(/^$|^\d+$/, 'Whole numbers only'),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const emptyProductForm: ProductFormValues = {
  name: '',
  sku: '',
  batch_number: '',
  expiry_date: '',
  supplier_name: '',
  cost_price: '',
  selling_price: '',
  reorder_level: '',
  category: '',
  notes: '',
  initial_stock: '',
}

function trimOrNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

export function toProductCreateInput(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    sku: trimOrNull(values.sku),
    batch_number: trimOrNull(values.batch_number),
    expiry_date: values.expiry_date || null,
    supplier_name: values.supplier_name.trim(),
    cost_price: values.cost_price === '' ? 0 : Number(values.cost_price),
    selling_price: values.selling_price === '' ? 0 : Number(values.selling_price),
    reorder_level: values.reorder_level === '' ? 0 : Number(values.reorder_level),
    category: trimOrNull(values.category),
    notes: trimOrNull(values.notes),
    initial_stock: values.initial_stock === '' ? 0 : Number(values.initial_stock),
  }
}

export function toProductUpdateInput(values: ProductFormValues) {
  const { initial_stock: _ignored, ...rest } = toProductCreateInput(values)
  return rest
}

export function fromProduct(p: Product): ProductFormValues {
  return {
    name: p.name,
    sku: p.sku ?? '',
    batch_number: p.batch_number ?? '',
    expiry_date: p.expiry_date ?? '',
    supplier_name: p.supplier_name,
    cost_price: p.cost_price === null ? '' : String(p.cost_price),
    selling_price: p.selling_price === null ? '' : String(p.selling_price),
    reorder_level: p.reorder_level === null ? '' : String(p.reorder_level),
    category: p.category ?? '',
    notes: p.notes ?? '',
    initial_stock: '',
  }
}

// ---------- Movement form ----------
export const movementFormSchema = z.object({
  movement_type: z.enum([
    'PURCHASE',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'DAMAGE',
    'EXPIRED',
  ]),
  quantity: z
    .string()
    .regex(/^[1-9]\d*$/, 'Enter a positive whole number'),
  remarks: z.string(),
})

export type MovementFormValues = z.infer<typeof movementFormSchema>

export const emptyMovementForm: MovementFormValues = {
  movement_type: 'PURCHASE',
  quantity: '',
  remarks: '',
}

export function toMovementInput(
  productId: string,
  values: MovementFormValues,
): MovementInput {
  const qty = Number(values.quantity)
  let signedQty: number
  let enumType: MovementType
  switch (values.movement_type) {
    case 'PURCHASE':
      signedQty = qty
      enumType = 'PURCHASE'
      break
    case 'ADJUSTMENT_IN':
      signedQty = qty
      enumType = 'ADJUSTMENT'
      break
    case 'ADJUSTMENT_OUT':
      signedQty = -qty
      enumType = 'ADJUSTMENT'
      break
    case 'DAMAGE':
      signedQty = -qty
      enumType = 'DAMAGE'
      break
    case 'EXPIRED':
      signedQty = -qty
      enumType = 'EXPIRED'
      break
  }
  return {
    product_id: productId,
    movement_type: enumType,
    quantity: signedQty,
    remarks: trimOrNull(values.remarks),
  }
}
