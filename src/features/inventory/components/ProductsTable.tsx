import { defineComponent, type PropType } from 'vue'
import { Pencil, Trash2, ArrowUpDown, ShoppingCart } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useCan } from '@/features/auth/composables/useCan'
import type { Product } from '../types'
import StockBadge from './StockBadge'
import ExpiryBadge from './ExpiryBadge'

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined || v === 0) return '—'
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default defineComponent({
  name: 'ProductsTable',
  props: {
    products: { type: Array as PropType<Product[]>, required: true },
    onEdit: {
      type: Function as PropType<(p: Product) => void>,
      required: true,
    },
    onDelete: {
      type: Function as PropType<(p: Product) => void>,
      required: true,
    },
    onRecordMovement: {
      type: Function as PropType<(p: Product) => void>,
      required: true,
    },
    onSell: {
      type: Function as PropType<(p: Product) => void>,
      required: true,
    },
  },
  setup(props) {
    const router = useRouter()
    const { canManageProducts } = useCan()
    const goToDetail = (id: string) =>
      router.push({ name: 'inventory-detail', params: { id } })

    return () => (
      <div class="overflow-x-auto rounded-md border border-border">
        <table class="w-full text-sm">
          <thead class="bg-muted/40 text-muted-foreground">
            <tr class="text-left">
              <th class="px-4 py-2 font-medium">Name</th>
              <th class="px-4 py-2 font-medium">Category</th>
              <th class="px-4 py-2 font-medium">Supplier</th>
              <th class="px-4 py-2 font-medium">SKU</th>
              <th class="px-4 py-2 font-medium text-right w-28">Stock</th>
              <th class="px-4 py-2 font-medium">Expiry</th>
              <th class="px-4 py-2 font-medium text-right">Price</th>
              <th class="px-4 py-2 font-medium w-40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.products.map((p) => (
              <tr
                key={p.id}
                class="border-t border-border hover:bg-accent/40 cursor-pointer transition-colors"
                onClick={() => goToDetail(p.id)}
              >
                <td class="px-4 py-2 font-medium">{p.name}</td>
                <td class="px-4 py-2 text-muted-foreground">
                  {p.category ?? '—'}
                </td>
                <td class="px-4 py-2 text-muted-foreground">
                  {p.supplier_name}
                </td>
                <td class="px-4 py-2 text-muted-foreground tabular-nums">
                  {p.sku ?? '—'}
                </td>
                <td class="px-4 py-2 text-right">
                  {p.current_stock <= 0 ? (
                    <StockBadge
                      current={p.current_stock}
                      reorderLevel={p.reorder_level}
                    />
                  ) : (
                    <span class="inline-flex items-center justify-end gap-2">
                      <span class="tabular-nums">{p.current_stock}</span>
                      <StockBadge
                        current={p.current_stock}
                        reorderLevel={p.reorder_level}
                      />
                    </span>
                  )}
                </td>
                <td class="px-4 py-2">
                  <span class="inline-flex items-center gap-2">
                    <span class="text-muted-foreground">
                      {p.expiry_date ?? '—'}
                    </span>
                    <ExpiryBadge expiryDate={p.expiry_date} />
                  </span>
                </td>
                <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">
                  {fmtMoney(p.selling_price)}
                </td>
                <td
                  class="px-4 py-2 text-right"
                  onClick={(e: MouseEvent) => e.stopPropagation()}
                >
                  <div class="inline-flex gap-1">
                    <button
                      type="button"
                      onClick={() => props.onSell(p)}
                      class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Sell to patient"
                      aria-label="Sell to patient"
                    >
                      <ShoppingCart class="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onRecordMovement(p)}
                      class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Record movement"
                      aria-label="Record movement"
                    >
                      <ArrowUpDown class="size-4" />
                    </button>
                    {canManageProducts.value && (
                      <>
                        <button
                          type="button"
                          onClick={() => props.onEdit(p)}
                          class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil class="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onDelete(p)}
                          class="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Remove"
                          aria-label="Remove"
                        >
                          <Trash2 class="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
})
