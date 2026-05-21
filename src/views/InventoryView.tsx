import { computed, defineComponent, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { Plus, Search } from 'lucide-vue-next'
import {
  PRODUCTS_PAGE_SIZE,
  useProducts,
} from '@/features/inventory/composables/useProducts'
import { useSoftDeleteProduct } from '@/features/inventory/composables/useProductMutations'
import ProductsTable from '@/features/inventory/components/ProductsTable'
import ProductFormDialog from '@/features/inventory/components/ProductFormDialog'
import RecordMovementDialog from '@/features/inventory/components/RecordMovementDialog'
import SellProductDialog from '@/features/inventory/components/SellProductDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import { useCan } from '@/features/auth/composables/useCan'
import type { Product } from '@/features/inventory/types'

export default defineComponent({
  name: 'InventoryView',
  setup() {
    const searchInput = ref('')
    const debouncedSearch = refDebounced(searchInput, 300)
    const page = ref(1)

    watch(debouncedSearch, () => {
      page.value = 1
    })

    const { data, isLoading, isError, error, isFetching } = useProducts(
      debouncedSearch,
      page,
    )

    const rows = computed(() => data.value?.rows ?? [])
    const total = computed(() => data.value?.total ?? 0)

    const { canManageProducts } = useCan()

    const formOpen = ref(false)
    const editing = ref<Product | null>(null)

    const movementOpen = ref(false)
    const movementProduct = ref<Product | null>(null)

    const sellOpen = ref(false)
    const sellProduct = ref<Product | null>(null)

    const confirmOpen = ref(false)
    const deleting = ref<Product | null>(null)
    const softDeleteMut = useSoftDeleteProduct()

    const openNew = () => {
      editing.value = null
      formOpen.value = true
    }
    const openEdit = (p: Product) => {
      editing.value = p
      formOpen.value = true
    }
    const openRecordMovement = (p: Product) => {
      movementProduct.value = p
      movementOpen.value = true
    }
    const openSell = (p: Product) => {
      sellProduct.value = p
      sellOpen.value = true
    }
    const requestDelete = (p: Product) => {
      deleting.value = p
      confirmOpen.value = true
    }
    const performDelete = async () => {
      if (!deleting.value) return
      try {
        await softDeleteMut.mutateAsync(deleting.value.id)
        confirmOpen.value = false
        deleting.value = null
      } catch {
        // toast surfaced
      }
    }

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-shrink-0 space-y-4 pb-4">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Inventory</h1>
              <p class="text-sm text-muted-foreground mt-1">
                {isLoading.value
                  ? 'Loading…'
                  : `${total.value} product${total.value === 1 ? '' : 's'}`}
              </p>
            </div>
            {canManageProducts.value && (
              <button
                type="button"
                onClick={openNew}
                class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Plus class="size-4" />
                <span>New product</span>
              </button>
            )}
          </div>

          <div class="relative max-w-md">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name, SKU, or category"
              value={searchInput.value}
              onInput={(e: Event) =>
                (searchInput.value = (e.target as HTMLInputElement).value)
              }
              class="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {isError.value && (
            <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {(error.value as { message?: string })?.message ??
                'Failed to load products.'}
            </div>
          )}
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          {isLoading.value && (
            <div class="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  class="h-10 rounded-md bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          )}

          {!isLoading.value && !isError.value && total.value === 0 && (
            <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              {debouncedSearch.value
                ? `No products match "${debouncedSearch.value}".`
                : 'No products yet. Click "New product" to add one.'}
            </div>
          )}

          {!isLoading.value && !isError.value && total.value > 0 && (
            <div
              class={isFetching.value ? 'opacity-60 transition-opacity' : ''}
            >
              <ProductsTable
                products={rows.value}
                onEdit={openEdit}
                onDelete={requestDelete}
                onRecordMovement={openRecordMovement}
                onSell={openSell}
              />
            </div>
          )}
        </div>

        {!isLoading.value && !isError.value && total.value > 0 && (
          <div class="flex-shrink-0 pt-3 mt-3 border-t border-border">
            <Pagination
              page={page.value}
              pageSize={PRODUCTS_PAGE_SIZE}
              total={total.value}
              onUpdate:page={(p: number) => (page.value = p)}
            />
          </div>
        )}

        <ProductFormDialog
          open={formOpen.value}
          product={editing.value}
          onUpdate:open={(v: boolean) => (formOpen.value = v)}
        />

        <RecordMovementDialog
          open={movementOpen.value}
          product={movementProduct.value}
          onUpdate:open={(v: boolean) => (movementOpen.value = v)}
        />

        <SellProductDialog
          open={sellOpen.value}
          product={sellProduct.value}
          onUpdate:open={(v: boolean) => (sellOpen.value = v)}
        />

        <ConfirmDialog
          open={confirmOpen.value}
          title="Remove product"
          message={
            deleting.value
              ? `Remove "${deleting.value.name}"? This is a soft delete — movement history is preserved, but the product won't appear in lists.`
              : ''
          }
          confirmLabel="Remove"
          destructive
          loading={softDeleteMut.isPending.value}
          onUpdate:open={(v: boolean) => (confirmOpen.value = v)}
          onConfirm={performDelete}
        />
      </div>
    )
  },
})
