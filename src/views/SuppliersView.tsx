import { computed, defineComponent, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-vue-next'
import {
  useSuppliers,
  useCreateSupplier,
  useDeleteSupplier,
  useUpdateSupplier,
} from '@/features/suppliers/composables/useSuppliers'
import { useCan } from '@/features/auth/composables/useCan'
import { useAuth } from '@/features/auth/composables/useAuth'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { Supplier } from '@/features/suppliers/types'

// Privileged-only manage page for product suppliers. Mirrors CategoriesView.
// Limited tier users who reach this URL bounce to /inventory; DB also gates
// inserts/updates/deletes via 0017's RLS.

export default defineComponent({
  name: 'SuppliersView',
  setup() {
    const router = useRouter()
    const { canManageProducts } = useCan()
    const { ready } = useAuth()

    watchEffect(() => {
      if (ready.value && !canManageProducts.value) {
        router.replace({ name: 'inventory' })
      }
    })

    const { data, isLoading, error } = useSuppliers()
    const createMut = useCreateSupplier()
    const updateMut = useUpdateSupplier()
    const deleteMut = useDeleteSupplier()

    const rows = computed(() => data.value ?? [])

    const newName = ref('')
    const editingId = ref<string | null>(null)
    const editingName = ref('')

    const deleteTarget = ref<Supplier | null>(null)
    const confirmOpen = ref(false)

    const startEdit = (s: Supplier) => {
      editingId.value = s.id
      editingName.value = s.name
    }

    const cancelEdit = () => {
      editingId.value = null
      editingName.value = ''
    }

    const saveEdit = async (s: Supplier) => {
      const next = editingName.value.trim()
      if (!next || next === s.name) {
        cancelEdit()
        return
      }
      try {
        await updateMut.mutateAsync({ id: s.id, input: { name: next } })
        cancelEdit()
      } catch {
        // toast surfaced
      }
    }

    const addNew = async () => {
      const name = newName.value.trim()
      if (!name || createMut.isPending.value) return
      try {
        await createMut.mutateAsync({ name })
        newName.value = ''
      } catch {
        // toast surfaced
      }
    }

    const requestDelete = (s: Supplier) => {
      deleteTarget.value = s
      confirmOpen.value = true
    }

    const performDelete = async () => {
      if (!deleteTarget.value) return
      try {
        await deleteMut.mutateAsync(deleteTarget.value.id)
        confirmOpen.value = false
        deleteTarget.value = null
      } catch {
        // toast surfaced
      }
    }

    return () => (
      <div class="space-y-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Product suppliers</h1>
          <p class="text-sm text-muted-foreground mt-1">
            Rename to fix typos, remove unused ones. Suppliers in use by
            products can't be removed — reassign those products to a
            different supplier first.
          </p>
        </div>

        <div class="rounded-md border border-border bg-card p-4">
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <label class="text-sm font-medium" for="new-supplier">
                Add supplier
              </label>
              <input
                id="new-supplier"
                type="text"
                placeholder="e.g., Cipla"
                value={newName.value}
                onInput={(e: Event) =>
                  (newName.value = (e.target as HTMLInputElement).value)
                }
                onKeydown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addNew()
                  }
                }}
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={addNew}
              disabled={!newName.value.trim() || createMut.isPending.value}
              class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus class="size-4" />
              <span>{createMut.isPending.value ? 'Adding…' : 'Add'}</span>
            </button>
          </div>
        </div>

        {error.value && (
          <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {(error.value as { message?: string })?.message ??
              'Failed to load suppliers.'}
          </div>
        )}

        {isLoading.value && (
          <div class="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} class="h-10 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading.value && !error.value && rows.value.length === 0 && (
          <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            No suppliers yet. Add one above.
          </div>
        )}

        {!isLoading.value && !error.value && rows.value.length > 0 && (
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-sm">
              <thead class="bg-muted/40 text-muted-foreground">
                <tr class="text-left">
                  <th class="px-4 py-2 font-medium">Name</th>
                  <th class="px-4 py-2 font-medium text-right w-28">Products</th>
                  <th class="px-4 py-2 font-medium w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.value.map((s) => {
                  const isEditing = editingId.value === s.id
                  const inUse = (s.product_count ?? 0) > 0
                  return (
                    <tr key={s.id} class="border-t border-border">
                      <td class="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName.value}
                            onInput={(e: Event) =>
                              (editingName.value = (
                                e.target as HTMLInputElement
                              ).value)
                            }
                            onKeydown={(e: KeyboardEvent) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveEdit(s)
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelEdit()
                              }
                            }}
                            autofocus
                            class="w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          s.name
                        )}
                      </td>
                      <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {s.product_count ?? 0}
                      </td>
                      <td class="px-4 py-2 text-right">
                        <div class="inline-flex gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                onClick={() => saveEdit(s)}
                                disabled={updateMut.isPending.value}
                                title="Save"
                                aria-label="Save"
                              >
                                <Check class="size-4" />
                              </button>
                              <button
                                type="button"
                                class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                onClick={cancelEdit}
                                title="Cancel"
                                aria-label="Cancel"
                              >
                                <X class="size-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                onClick={() => startEdit(s)}
                                title="Rename"
                                aria-label="Rename"
                              >
                                <Pencil class="size-4" />
                              </button>
                              <button
                                type="button"
                                class="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                onClick={() => requestDelete(s)}
                                disabled={inUse}
                                title={
                                  inUse
                                    ? `In use by ${s.product_count} product${
                                        s.product_count === 1 ? '' : 's'
                                      }`
                                    : 'Remove'
                                }
                                aria-label="Remove"
                              >
                                <Trash2 class="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmDialog
          open={confirmOpen.value}
          title="Remove supplier"
          message={
            deleteTarget.value
              ? `Remove "${deleteTarget.value.name}"? This only works if no products reference this supplier.`
              : ''
          }
          confirmLabel="Remove"
          destructive
          loading={deleteMut.isPending.value}
          onUpdate:open={(v: boolean) => (confirmOpen.value = v)}
          onConfirm={performDelete}
        />
      </div>
    )
  },
})
