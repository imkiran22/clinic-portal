import { computed, defineComponent, ref, watch, type PropType } from 'vue'
import Modal from '@/components/shared/Modal'
import PatientPicker from '@/features/patients/components/PatientPicker'
import { useSellProduct } from '../composables/useProductMutations'
import type { Product } from '../types'
import type { Patient } from '@/features/patients/types'

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default defineComponent({
  name: 'SellProductDialog',
  props: {
    open: { type: Boolean, required: true },
    product: { type: Object as PropType<Product | null>, default: null },
  },
  emits: ['update:open', 'saved'],
  setup(props, { emit }) {
    const sellMut = useSellProduct()

    const patient = ref<Patient | null>(null)
    const quantity = ref('1')
    const remarks = ref('')
    const formError = ref<string | null>(null)

    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          patient.value = null
          quantity.value = '1'
          remarks.value = ''
          formError.value = null
        }
      },
    )

    const qtyNumber = computed(() => {
      const n = Number(quantity.value)
      return Number.isFinite(n) ? n : 0
    })

    const total = computed(() => {
      if (!props.product) return 0
      return qtyNumber.value * (props.product.selling_price ?? 0)
    })

    const onSubmit = async (e: Event) => {
      e.preventDefault()
      formError.value = null
      if (!props.product) return
      if (!patient.value) {
        formError.value = 'Please select a patient'
        return
      }
      const q = qtyNumber.value
      if (!q || q < 1 || !Number.isInteger(q)) {
        formError.value = 'Quantity must be a positive whole number'
        return
      }
      if (q > props.product.current_stock) {
        formError.value = `Only ${props.product.current_stock} in stock`
        return
      }
      try {
        await sellMut.mutateAsync({
          product_id: props.product.id,
          patient_id: patient.value.id,
          quantity: q,
          remarks: remarks.value.trim() || null,
        })
        emit('saved')
        emit('update:open', false)
      } catch {
        // toast surfaced by mutation onError (P0001 → "insufficient stock", etc.)
      }
    }

    return () => (
      <Modal
        open={props.open}
        title={props.product ? `Sell — ${props.product.name}` : 'Sell'}
        size="max-w-md"
        onUpdate:open={(v: boolean) => emit('update:open', v)}
      >
        {props.product && (
          <form onSubmit={onSubmit} class="space-y-4" novalidate>
            <div class="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-muted-foreground">In stock</span>
                <span class="tabular-nums font-medium">
                  {props.product.current_stock}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Unit price</span>
                <span class="tabular-nums">
                  {fmtMoney(props.product.selling_price)}
                </span>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium">
                Patient <span class="text-destructive ml-0.5">*</span>
              </label>
              <div class="mt-1">
                <PatientPicker
                  modelValue={patient.value}
                  onUpdate:modelValue={(p: Patient | null) =>
                    (patient.value = p)
                  }
                  autofocus
                />
              </div>
            </div>

            <div>
              <label class="text-sm font-medium" for="sell-qty">
                Quantity <span class="text-destructive ml-0.5">*</span>
              </label>
              <input
                id="sell-qty"
                type="text"
                inputmode="numeric"
                value={quantity.value}
                onInput={(e: Event) =>
                  (quantity.value = (e.target as HTMLInputElement).value)
                }
                placeholder="1"
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label class="text-sm font-medium" for="sell-remarks">
                Remarks
              </label>
              <textarea
                id="sell-remarks"
                rows={2}
                value={remarks.value}
                onInput={(e: Event) =>
                  (remarks.value = (e.target as HTMLTextAreaElement).value)
                }
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>

            <div class="flex justify-between text-sm border-t border-border pt-3">
              <span class="text-muted-foreground">Total</span>
              <span class="tabular-nums font-semibold">
                {fmtMoney(total.value)}
              </span>
            </div>

            {formError.value && (
              <p class="text-sm text-destructive" role="alert">
                {formError.value}
              </p>
            )}

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => emit('update:open', false)}
                class="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sellMut.isPending.value}
                class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
              >
                {sellMut.isPending.value ? 'Selling…' : 'Sell'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    )
  },
})
