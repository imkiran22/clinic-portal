import { z } from 'zod'
import type { MovementInput, MovementType, Product } from './types'

// ---------- Product form ----------
// category_id and supplier_id stay out of the Zod schema because their
// pickers manage their own value lifecycle as sibling reactive refs.
// VeeValidate validation isn't useful for the picker shape.
// Today as YYYY-MM-DD (clinic-local). DatePicker round-trips this format,
// so we default the received-on field to today.
function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  sku: z.string(),
  batch_number: z.string(),
  expiry_date: z.string(), // 'YYYY-MM-DD' from <input type="date"> or ''
  cost_price: z
    .string()
    .regex(/^$|^\d+(\.\d{1,2})?$/, 'Numbers only (up to 2 decimals)'),
  selling_price: z
    .string()
    .regex(/^$|^\d+(\.\d{1,2})?$/, 'Numbers only (up to 2 decimals)'),
  reorder_level: z.string().regex(/^$|^\d+$/, 'Whole numbers only'),
  notes: z.string(),
  initial_stock: z.string().regex(/^$|^\d+$/, 'Whole numbers only'),
  // Date the stock was received. YYYY-MM-DD; defaults to today on
  // new-product creation. Hidden on edit (the field stays on the product
  // row but isn't re-collected) — see ProductForm.
  received_on: z.string(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const emptyProductForm: ProductFormValues = {
  name: '',
  sku: '',
  batch_number: '',
  expiry_date: '',
  cost_price: '',
  selling_price: '',
  reorder_level: '',
  notes: '',
  initial_stock: '',
  received_on: todayIsoDate(),
}

function trimOrNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

export function toProductCreateInput(
  values: ProductFormValues,
  categoryId: string | null,
  supplierId: string,
) {
  return {
    name: values.name.trim(),
    sku: trimOrNull(values.sku),
    batch_number: trimOrNull(values.batch_number),
    expiry_date: values.expiry_date || null,
    supplier_id: supplierId,
    cost_price: values.cost_price === '' ? 0 : Number(values.cost_price),
    selling_price: values.selling_price === '' ? 0 : Number(values.selling_price),
    reorder_level: values.reorder_level === '' ? 0 : Number(values.reorder_level),
    category_id: categoryId,
    notes: trimOrNull(values.notes),
    initial_stock: values.initial_stock === '' ? 0 : Number(values.initial_stock),
    received_on: values.received_on || null,
  }
}

export function toProductUpdateInput(
  values: ProductFormValues,
  categoryId: string | null,
  supplierId: string,
) {
  // received_on is set at creation time and not re-collected on edit;
  // initial_stock has its own non-edit path (see ProductForm isEdit guard).
  const {
    initial_stock: _ignoredStock,
    received_on: _ignoredReceived,
    ...rest
  } = toProductCreateInput(values, categoryId, supplierId)
  return rest
}

export function fromProduct(p: Product): ProductFormValues {
  return {
    name: p.name,
    sku: p.sku ?? '',
    batch_number: p.batch_number ?? '',
    expiry_date: p.expiry_date ?? '',
    cost_price: p.cost_price === null ? '' : String(p.cost_price),
    selling_price: p.selling_price === null ? '' : String(p.selling_price),
    reorder_level: p.reorder_level === null ? '' : String(p.reorder_level),
    notes: p.notes ?? '',
    initial_stock: '',
    // Carry the existing value through so the (hidden) field has data,
    // but toProductUpdateInput strips it before submit.
    received_on: p.received_on ?? '',
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
