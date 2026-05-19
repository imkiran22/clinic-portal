import { defineComponent, type PropType } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import Modal from '@/components/shared/Modal'
import { SelectField, TextField } from '@/components/shared/FormField'
import {
  emptyMovementForm,
  movementFormSchema,
  toMovementInput,
  type MovementFormValues,
} from '../validations'
import { useRecordMovement } from '../composables/useProductMutations'
import type { Product } from '../types'

export default defineComponent({
  name: 'RecordMovementDialog',
  props: {
    open: { type: Boolean, required: true },
    product: { type: Object as PropType<Product | null>, default: null },
  },
  emits: ['update:open', 'saved'],
  setup(props, { emit }) {
    const recordMut = useRecordMovement()

    const { handleSubmit } = useForm<MovementFormValues>({
      validationSchema: toTypedSchema(movementFormSchema),
      initialValues: emptyMovementForm,
    })

    const submit = handleSubmit(async (values) => {
      if (!props.product) return
      try {
        const input = toMovementInput(props.product.id, values)
        await recordMut.mutateAsync(input)
        emit('saved')
        emit('update:open', false)
      } catch {
        // toast surfaced by mutation onError
      }
    })

    return () => (
      <Modal
        open={props.open}
        title={
          props.product
            ? `Record movement — ${props.product.name}`
            : 'Record movement'
        }
        size="max-w-md"
        onUpdate:open={(v: boolean) => emit('update:open', v)}
      >
        <form
          key={props.product?.id ?? 'new'}
          onSubmit={submit}
          class="space-y-4"
          novalidate
        >
          {props.product && (
            <div class="text-sm text-muted-foreground">
              Current stock:{' '}
              <span class="font-medium text-foreground tabular-nums">
                {props.product.current_stock}
              </span>
            </div>
          )}
          <SelectField
            name="movement_type"
            label="Type"
            required
            options={[
              { value: 'PURCHASE', label: 'Purchase (+)' },
              { value: 'ADJUSTMENT_IN', label: 'Adjustment in (+)' },
              { value: 'ADJUSTMENT_OUT', label: 'Adjustment out (−)' },
              { value: 'DAMAGE', label: 'Damage (−)' },
              { value: 'EXPIRED', label: 'Expired (−)' },
            ]}
          />
          <TextField
            name="quantity"
            label="Quantity"
            required
            placeholder="Positive whole number"
          />
          <TextField name="remarks" label="Remarks" rows={2} />

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
              disabled={recordMut.isPending.value}
              class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
            >
              {recordMut.isPending.value ? 'Saving…' : 'Record'}
            </button>
          </div>
        </form>
      </Modal>
    )
  },
})
