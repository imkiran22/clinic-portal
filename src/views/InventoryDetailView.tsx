import { computed, defineComponent, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowUpDown,
  Pencil,
  ShoppingCart,
  Trash2,
} from 'lucide-vue-next'
import {
  useMovementsFor,
  useProduct,
} from '@/features/inventory/composables/useProducts'
import { useSoftDeleteProduct } from '@/features/inventory/composables/useProductMutations'
import ProductFormDialog from '@/features/inventory/components/ProductFormDialog'
import RecordMovementDialog from '@/features/inventory/components/RecordMovementDialog'
import SellProductDialog from '@/features/inventory/components/SellProductDialog'
import MovementsTable from '@/features/inventory/components/MovementsTable'
import StockBadge from '@/features/inventory/components/StockBadge'
import ExpiryBadge from '@/features/inventory/components/ExpiryBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return '—'
  }
}

export default defineComponent({
  name: 'InventoryDetailView',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const id = computed(() => route.params.id as string)

    const { data: product, isLoading, isError, error } = useProduct(id)
    const { data: movements } = useMovementsFor(id)

    const editOpen = ref(false)
    const movementOpen = ref(false)
    const sellOpen = ref(false)
    const confirmOpen = ref(false)
    const softDeleteMut = useSoftDeleteProduct()

    const performDelete = async () => {
      if (!product.value) return
      try {
        await softDeleteMut.mutateAsync(product.value.id)
        confirmOpen.value = false
        router.push({ name: 'inventory' })
      } catch {
        // toast surfaced
      }
    }

    const renderField = (
      label: string,
      value: string | number | null | undefined,
    ) => (
      <div>
        <div class="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div class="text-sm mt-0.5">
          {value === null || value === undefined || value === '' ? '—' : value}
        </div>
      </div>
    )

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-shrink-0 space-y-4 pb-4">
          <button
            type="button"
            onClick={() => router.push({ name: 'inventory' })}
            class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft class="size-4" />
            <span>Back to inventory</span>
          </button>

          {isLoading.value && (
            <div class="rounded-md border border-border bg-card p-6 animate-pulse">
              <div class="h-7 w-48 bg-muted rounded mb-4" />
              <div class="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} class="h-6 bg-muted rounded" />
                ))}
              </div>
            </div>
          )}

          {isError.value && (
            <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {(error.value as { message?: string })?.message ??
                'Failed to load product.'}
            </div>
          )}

          {!isLoading.value && !isError.value && !product.value && (
            <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              Product not found. It may have been removed.
            </div>
          )}

          {product.value && (
            <div class="rounded-md border border-border bg-card">
              <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-border flex-wrap">
                <div>
                  <h1 class="text-2xl font-semibold tracking-tight">
                    {product.value.name}
                  </h1>
                  <p class="text-sm text-muted-foreground mt-0.5 inline-flex items-center gap-2 flex-wrap">
                    <span>
                      {product.value.category
                        ? product.value.category
                        : 'Uncategorised'}
                    </span>
                    <span>·</span>
                    <span class="tabular-nums">
                      Stock {product.value.current_stock}
                    </span>
                    <StockBadge
                      current={product.value.current_stock}
                      reorderLevel={product.value.reorder_level}
                    />
                    {product.value.expiry_date && (
                      <>
                        <span>·</span>
                        <span>Expires {product.value.expiry_date}</span>
                      </>
                    )}
                    <ExpiryBadge expiryDate={product.value.expiry_date} />
                  </p>
                </div>
                <div class="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => (sellOpen.value = true)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                  >
                    <ShoppingCart class="size-4" />
                    <span>Sell</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (movementOpen.value = true)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
                  >
                    <ArrowUpDown class="size-4" />
                    <span>Record movement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (editOpen.value = true)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
                  >
                    <Pencil class="size-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (confirmOpen.value = true)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 class="size-4" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
              <div class="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {renderField('SKU', product.value.sku)}
                {renderField('Batch', product.value.batch_number)}
                {renderField('Supplier', product.value.supplier_name)}
                {renderField('Cost price', fmtMoney(product.value.cost_price))}
                {renderField(
                  'Selling price',
                  fmtMoney(product.value.selling_price),
                )}
                {renderField('Reorder level', product.value.reorder_level)}
                {renderField('Added', fmtDateTime(product.value.created_at))}
                {renderField('Updated', fmtDateTime(product.value.updated_at))}
              </div>
            </div>
          )}

          {product.value && (
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold tracking-tight">
                Movement history
              </h2>
              <span class="text-sm text-muted-foreground">
                {movements.value?.length ?? 0} movement
                {(movements.value?.length ?? 0) === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          {product.value && (
            <MovementsTable movements={movements.value ?? []} />
          )}
        </div>

        {product.value && (
          <>
            <ProductFormDialog
              open={editOpen.value}
              product={product.value}
              onUpdate:open={(v: boolean) => (editOpen.value = v)}
            />

            <RecordMovementDialog
              open={movementOpen.value}
              product={product.value}
              onUpdate:open={(v: boolean) => (movementOpen.value = v)}
            />

            <SellProductDialog
              open={sellOpen.value}
              product={product.value}
              onUpdate:open={(v: boolean) => (sellOpen.value = v)}
            />

            <ConfirmDialog
              open={confirmOpen.value}
              title="Remove product"
              message={`Remove "${product.value.name}"? This is a soft delete — movement history is preserved, but the product won't appear in lists.`}
              confirmLabel="Remove"
              destructive
              loading={softDeleteMut.isPending.value}
              onUpdate:open={(v: boolean) => (confirmOpen.value = v)}
              onConfirm={performDelete}
            />
          </>
        )}
      </div>
    )
  },
})
