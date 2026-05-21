import { computed, defineComponent, ref, type PropType } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ChevronDown, Plus, X } from 'lucide-vue-next'
import { useCategories, useCreateCategory } from '../composables/useCategories'

// Searchable category dropdown with inline "create new" affordance.
// Bound via v-model — modelValue is the category id (or null).
// Privileged-only inline creation: if the parent is using this picker, it
// should already be a privileged context (product form), so we don't gate
// the create button further here. The DB RLS will reject anyway if not.

export default defineComponent({
  name: 'CategoryPicker',
  props: {
    modelValue: { type: String as PropType<string | null>, default: null },
    placeholder: { type: String, default: 'Pick or create a category' },
    canCreate: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { data: categories } = useCategories()
    const createMut = useCreateCategory()

    const open = ref(false)
    const search = ref('')
    const containerRef = ref<HTMLElement | null>(null)

    onClickOutside(containerRef, () => {
      open.value = false
      search.value = ''
    })

    const selected = computed(() =>
      (categories.value ?? []).find((c) => c.id === props.modelValue) ?? null,
    )

    const filtered = computed(() => {
      const all = categories.value ?? []
      const q = search.value.trim().toLowerCase()
      if (!q) return all
      return all.filter((c) => c.name.toLowerCase().includes(q))
    })

    const exactMatch = computed(() => {
      const q = search.value.trim().toLowerCase()
      if (!q) return null
      return (categories.value ?? []).find((c) => c.name.toLowerCase() === q) ?? null
    })

    const pick = (id: string) => {
      emit('update:modelValue', id)
      open.value = false
      search.value = ''
    }

    const clear = () => {
      emit('update:modelValue', null)
    }

    const createAndPick = async () => {
      const name = search.value.trim()
      if (!name || createMut.isPending.value) return
      try {
        const cat = await createMut.mutateAsync({ name })
        pick(cat.id)
      } catch {
        // toast surfaced by mutation
      }
    }

    return () => (
      <div ref={containerRef} class="relative">
        {selected.value && !open.value ? (
          <div class="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background">
            <span class="flex-1 text-sm truncate">{selected.value.name}</span>
            <button
              type="button"
              onClick={clear}
              class="p-1 rounded hover:bg-accent text-muted-foreground"
              aria-label="Clear category"
            >
              <X class="size-4" />
            </button>
            <button
              type="button"
              onClick={() => (open.value = true)}
              class="p-1 rounded hover:bg-accent text-muted-foreground"
              aria-label="Change category"
            >
              <ChevronDown class="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (open.value = !open.value)}
            class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span class={selected.value ? '' : 'text-muted-foreground'}>
              {selected.value?.name ?? props.placeholder}
            </span>
            <ChevronDown class="size-4 text-muted-foreground" />
          </button>
        )}

        {open.value && (
          <div class="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
            <div class="p-2 sticky top-0 bg-popover border-b border-border">
              <input
                type="text"
                placeholder="Search or type to create…"
                value={search.value}
                onInput={(e: Event) =>
                  (search.value = (e.target as HTMLInputElement).value)
                }
                autofocus
                class="w-full px-2 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {filtered.value.length === 0 && !search.value.trim() && (
              <div class="px-3 py-3 text-sm text-muted-foreground">
                No categories yet.
              </div>
            )}

            <ul>
              {filtered.value.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c.id)}
                    class={[
                      'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-3',
                      c.id === props.modelValue ? 'bg-accent/60' : '',
                    ].join(' ')}
                  >
                    <span class="truncate">{c.name}</span>
                    {typeof c.product_count === 'number' && (
                      <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                        {c.product_count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {props.canCreate &&
              search.value.trim() &&
              !exactMatch.value && (
                <button
                  type="button"
                  onClick={createAndPick}
                  disabled={createMut.isPending.value}
                  class="w-full text-left px-3 py-2 text-sm border-t border-border bg-muted/40 hover:bg-accent disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus class="size-4 text-muted-foreground" />
                  <span>
                    {createMut.isPending.value
                      ? 'Adding…'
                      : `Add "${search.value.trim()}"`}
                  </span>
                </button>
              )}
          </div>
        )}
      </div>
    )
  },
})
