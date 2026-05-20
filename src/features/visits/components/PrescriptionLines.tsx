import { defineComponent, type PropType } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import ProductPicker from '@/features/inventory/components/ProductPicker'
import type { Product } from '@/features/inventory/types'

export type PrescriptionLine = {
  product: Product | null
  quantity: string
}

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default defineComponent({
  name: 'PrescriptionLines',
  props: {
    modelValue: {
      type: Array as PropType<PrescriptionLine[]>,
      required: true,
    },
    errors: {
      type: Array as PropType<(string | null)[]>,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const update = (next: PrescriptionLine[]) => emit('update:modelValue', next)

    const addLine = () => {
      update([...props.modelValue, { product: null, quantity: '1' }])
    }

    const removeLine = (idx: number) => {
      update(props.modelValue.filter((_, i) => i !== idx))
    }

    const setProduct = (idx: number, p: Product | null) => {
      update(
        props.modelValue.map((line, i) =>
          i === idx ? { ...line, product: p } : line,
        ),
      )
    }

    const setQuantity = (idx: number, v: string) => {
      update(
        props.modelValue.map((line, i) =>
          i === idx ? { ...line, quantity: v } : line,
        ),
      )
    }

    return () => {
      const lines = props.modelValue
      const subtotal = lines.reduce((sum, line) => {
        if (!line.product) return sum
        const q = Number(line.quantity)
        if (!Number.isFinite(q) || q <= 0) return sum
        return sum + q * (line.product.selling_price ?? 0)
      }, 0)

      return (
        <div class="space-y-3">
          {lines.length === 0 && (
            <div class="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No products prescribed yet. Consultation-only visits are fine —
              just submit without adding any.
            </div>
          )}

          {lines.map((line, idx) => {
            const err = props.errors[idx]
            const stock = line.product?.current_stock ?? null
            const q = Number(line.quantity)
            const overStock =
              stock !== null &&
              Number.isFinite(q) &&
              q > 0 &&
              q > stock
            return (
              <div
                key={idx}
                class="rounded-md border border-border bg-card p-3 space-y-2"
              >
                <div class="flex items-start gap-2">
                  <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                    <ProductPicker
                      modelValue={line.product}
                      onUpdate:modelValue={(p: Product | null) =>
                        setProduct(idx, p)
                      }
                      placeholder="Search product…"
                    />
                    <input
                      type="text"
                      inputmode="numeric"
                      value={line.quantity}
                      onInput={(e: Event) =>
                        setQuantity(idx, (e.target as HTMLInputElement).value)
                      }
                      placeholder="Qty"
                      aria-label={`Quantity for line ${idx + 1}`}
                      class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    class="shrink-0 p-2 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
                    aria-label={`Remove line ${idx + 1}`}
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>

                {line.product && (
                  <div class="flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>
                      Unit: {fmtMoney(line.product.selling_price)}
                    </span>
                    <span>
                      Line:{' '}
                      {fmtMoney(
                        Number.isFinite(q) && q > 0
                          ? q * (line.product.selling_price ?? 0)
                          : 0,
                      )}
                    </span>
                  </div>
                )}

                {(err || overStock) && (
                  <p class="text-xs text-destructive" role="alert">
                    {err ?? `Only ${stock} in stock`}
                  </p>
                )}
              </div>
            )
          })}

          <div class="flex items-center justify-between">
            <button
              type="button"
              onClick={addLine}
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
            >
              <Plus class="size-4" />
              <span>Add product</span>
            </button>

            {lines.length > 0 && (
              <div class="text-sm">
                <span class="text-muted-foreground">Subtotal: </span>
                <span class="tabular-nums font-semibold">
                  {fmtMoney(subtotal)}
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }
  },
})
