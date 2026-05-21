import { computed, defineComponent, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, Trash2, Check, X, Search } from 'lucide-vue-next'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/composables/useCategories'
import { useCan } from '@/features/auth/composables/useCan'
import { useAuth } from '@/features/auth/composables/useAuth'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { Category } from '@/features/categories/types'

// Product-categories manage page. Privileged-only — limited tier users
// who reach this URL get bounced to /inventory. The DB also enforces the
// same rule via 0016's RLS.

export default defineComponent({
  name: 'CategoriesView',
  setup() {
    const router = useRouter()
    const { canManageProducts } = useCan()
    const { ready } = useAuth()

    watchEffect(() => {
      if (ready.value && !canManageProducts.value) {
        router.replace({ name: 'inventory' })
      }
    })

    const { data, isLoading, error } = useCategories()
    const createMut = useCreateCategory()
    const updateMut = useUpdateCategory()
    const deleteMut = useDeleteCategory()

    const allRows = computed(() => data.value ?? [])
    const searchInput = ref('')
    const rows = computed(() => {
      const q = searchInput.value.trim().toLowerCase()
      if (!q) return allRows.value
      return allRows.value.filter((c) => c.name.toLowerCase().includes(q))
    })

    const newName = ref('')
    const editingId = ref<string | null>(null)
    const editingName = ref('')

    const deleteTarget = ref<Category | null>(null)
    const confirmOpen = ref(false)

    const startEdit = (c: Category) => {
      editingId.value = c.id
      editingName.value = c.name
    }

    const cancelEdit = () => {
      editingId.value = null
      editingName.value = ''
    }

    const saveEdit = async (c: Category) => {
      const next = editingName.value.trim()
      if (!next || next === c.name) {
        cancelEdit()
        return
      }
      try {
        await updateMut.mutateAsync({ id: c.id, input: { name: next } })
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

    const requestDelete = (c: Category) => {
      deleteTarget.value = c
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
          <h1 class="text-2xl font-semibold tracking-tight">Product categories</h1>
          <p class="text-sm text-muted-foreground mt-1">
            Rename to fix typos, remove unused ones. Categories in use by
            products can't be removed — change the product's category first.
          </p>
        </div>

        <div class="rounded-md border border-border bg-card p-4">
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <label class="text-sm font-medium" for="new-category">
                Add category
              </label>
              <input
                id="new-category"
                type="text"
                placeholder="e.g., FACE WASH"
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
              <span>
                {createMut.isPending.value ? 'Adding…' : 'Add'}
              </span>
            </button>
          </div>
        </div>

        <div class="relative max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search categories"
            value={searchInput.value}
            onInput={(e: Event) =>
              (searchInput.value = (e.target as HTMLInputElement).value)
            }
            class="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error.value && (
          <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {(error.value as { message?: string })?.message ??
              'Failed to load categories.'}
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
            {searchInput.value.trim()
              ? `No categories match "${searchInput.value.trim()}".`
              : 'No categories yet. Add one above.'}
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
                {rows.value.map((c) => {
                  const isEditing = editingId.value === c.id
                  const inUse = (c.product_count ?? 0) > 0
                  return (
                    <tr key={c.id} class="border-t border-border">
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
                                saveEdit(c)
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelEdit()
                              }
                            }}
                            autofocus
                            class="w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          c.name
                        )}
                      </td>
                      <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {c.product_count ?? 0}
                      </td>
                      <td class="px-4 py-2 text-right">
                        <div class="inline-flex gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                onClick={() => saveEdit(c)}
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
                                onClick={() => startEdit(c)}
                                title="Rename"
                                aria-label="Rename"
                              >
                                <Pencil class="size-4" />
                              </button>
                              <button
                                type="button"
                                class="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                onClick={() => requestDelete(c)}
                                disabled={inUse}
                                title={
                                  inUse
                                    ? `In use by ${c.product_count} product${
                                        c.product_count === 1 ? '' : 's'
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
          title="Remove category"
          message={
            deleteTarget.value
              ? `Remove "${deleteTarget.value.name}"? Products won't be deleted — they'll just become uncategorised.`
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
