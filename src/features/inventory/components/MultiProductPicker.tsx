import {
  computed,
  defineComponent,
  ref,
  type PropType,
} from 'vue'
import { onClickOutside, refDebounced } from '@vueuse/core'
import { X } from 'lucide-vue-next'
import type { Product } from '../types'
import { useProducts } from '../composables/useProducts'

// Combobox-style multi-select for products — same UX as
// MultiPatientPicker. Chips inline with the search input; backspace
// pops the last chip when the input is empty.

export default defineComponent({
  name: 'MultiProductPicker',
  props: {
    modelValue: {
      type: Array as PropType<Product[]>,
      default: () => [],
    },
    placeholder: { type: String, default: 'Add product(s)…' },
    inStockOnly: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const search = ref('')
    const debounced = refDebounced(search, 200)
    const pageRef = ref(1)
    const open = ref(false)
    const containerRef = ref<HTMLElement | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)

    const { data, isFetching } = useProducts(debounced, pageRef)

    const selectedIds = computed(
      () => new Set(props.modelValue.map((p) => p.id)),
    )

    const matches = computed(() => {
      const rows = (data.value?.rows ?? []).filter(
        (p) => !selectedIds.value.has(p.id),
      )
      const filtered = props.inStockOnly
        ? rows.filter((p) => p.current_stock > 0)
        : rows
      return filtered.slice(0, 20)
    })

    onClickOutside(containerRef, () => {
      open.value = false
    })

    const add = (p: Product) => {
      if (selectedIds.value.has(p.id)) return
      emit('update:modelValue', [...props.modelValue, p])
      search.value = ''
      inputRef.value?.focus()
    }

    const removeAt = (id: string) => {
      emit(
        'update:modelValue',
        props.modelValue.filter((p) => p.id !== id),
      )
    }

    const onBackspace = () => {
      if (search.value === '' && props.modelValue.length > 0) {
        removeAt(props.modelValue[props.modelValue.length - 1].id)
      }
    }

    return () => (
      <div ref={containerRef} class="relative">
        <div
          onClick={() => {
            open.value = true
            inputRef.value?.focus()
          }}
          class="flex flex-wrap items-center gap-1 px-2 py-1 min-h-[38px] rounded-md border border-border bg-background text-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-ring cursor-text"
        >
          {props.modelValue.map((p) => (
            <span
              key={p.id}
              onClick={(e: MouseEvent) => e.stopPropagation()}
              class="inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 rounded-md bg-accent text-accent-foreground text-xs"
            >
              <span class="truncate max-w-[200px]">{p.name}</span>
              <button
                type="button"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation()
                  removeAt(p.id)
                }}
                class="p-0.5 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${p.name}`}
              >
                <X class="size-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={search.value}
            placeholder={
              props.modelValue.length === 0 ? props.placeholder : ''
            }
            onInput={(e: Event) => {
              search.value = (e.target as HTMLInputElement).value
              open.value = true
            }}
            onFocus={() => (open.value = true)}
            onKeydown={(e: KeyboardEvent) => {
              if (e.key === 'Backspace') onBackspace()
              else if (e.key === 'Escape') open.value = false
            }}
            class="flex-1 min-w-[120px] bg-transparent border-0 outline-none px-1 py-0.5 text-sm placeholder:text-muted-foreground"
          />
        </div>

        {open.value && debounced.value && (
          <div class="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {isFetching.value && matches.value.length === 0 && (
              <div class="px-3 py-2 text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!isFetching.value && matches.value.length === 0 && (
              <div class="px-3 py-2 text-sm text-muted-foreground">
                No more products match "{debounced.value}".
              </div>
            )}
            {matches.value.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p)}
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
      </div>
    )
  },
})
