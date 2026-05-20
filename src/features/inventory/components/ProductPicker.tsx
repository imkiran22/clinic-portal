import { computed, defineComponent, ref, type PropType } from 'vue'
import { onClickOutside, refDebounced } from '@vueuse/core'
import { Search, X } from 'lucide-vue-next'
import type { Product } from '../types'
import { useProducts } from '../composables/useProducts'

export default defineComponent({
  name: 'ProductPicker',
  props: {
    modelValue: {
      type: Object as PropType<Product | null>,
      default: null,
    },
    placeholder: {
      type: String,
      default: 'Search by name, SKU, or category',
    },
    autofocus: Boolean,
    // Hide products with current_stock <= 0 from results. Defaults true since
    // the picker is mostly used to dispense.
    inStockOnly: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const search = ref('')
    const debounced = refDebounced(search, 200)
    const page = ref(1)
    const open = ref(false)
    const containerRef = ref<HTMLElement | null>(null)

    const { data, isFetching } = useProducts(debounced, page)
    const matches = computed(() => {
      const rows = data.value?.rows ?? []
      const filtered = props.inStockOnly
        ? rows.filter((p) => p.current_stock > 0)
        : rows
      return filtered.slice(0, 20)
    })

    onClickOutside(containerRef, () => {
      open.value = false
    })

    const select = (p: Product) => {
      emit('update:modelValue', p)
      search.value = ''
      open.value = false
    }

    const clear = () => {
      emit('update:modelValue', null)
      search.value = ''
    }

    return () => (
      <div ref={containerRef} class="relative">
        {props.modelValue ? (
          <div class="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {props.modelValue.name}
              </div>
              <div class="text-xs text-muted-foreground tabular-nums">
                Stock: {props.modelValue.current_stock}
                {props.modelValue.sku ? ` · ${props.modelValue.sku}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={clear}
              class="p-1 rounded hover:bg-accent text-muted-foreground"
              aria-label="Clear selection"
            >
              <X class="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder={props.placeholder}
                value={search.value}
                onInput={(e: Event) => {
                  search.value = (e.target as HTMLInputElement).value
                  open.value = true
                }}
                onFocus={() => (open.value = true)}
                autofocus={props.autofocus}
                class="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {open.value && debounced.value && (
              <div class="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                {isFetching.value && matches.value.length === 0 && (
                  <div class="px-3 py-2 text-sm text-muted-foreground">
                    Searching…
                  </div>
                )}
                {!isFetching.value &&
                  matches.value.length === 0 &&
                  debounced.value && (
                    <div class="px-3 py-2 text-sm text-muted-foreground">
                      {props.inStockOnly
                        ? `No in-stock products match "${debounced.value}".`
                        : `No products match "${debounced.value}".`}
                    </div>
                  )}
                {matches.value.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p)}
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between gap-3"
                  >
                    <span class="truncate">{p.name}</span>
                    <span class="text-xs text-muted-foreground tabular-nums shrink-0">
                      Stock: {p.current_stock}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  },
})
