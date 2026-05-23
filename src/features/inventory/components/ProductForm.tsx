import { computed, defineComponent, ref, watch, type PropType } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { DateField, TextField } from '@/components/shared/FormField'
import CategoryPicker from '@/features/categories/components/CategoryPicker'
import SupplierPicker from '@/features/suppliers/components/SupplierPicker'
import {
  emptyProductForm,
  productFormSchema,
  type ProductFormValues,
} from '../validations'

export type ProductFormSubmit = (
  values: ProductFormValues,
  categoryId: string | null,
  supplierId: string,
) => void

export default defineComponent({
  name: 'ProductForm',
  props: {
    initialValues: {
      type: Object as PropType<ProductFormValues>,
      default: () => emptyProductForm,
    },
    initialCategoryId: {
      type: String as PropType<string | null>,
      default: null,
    },
    initialSupplierId: {
      type: String as PropType<string | null>,
      default: null,
    },
    isEdit: Boolean,
    submitting: Boolean,
    submitLabel: { type: String, default: 'Save' },
    onSubmit: { type: Function as PropType<ProductFormSubmit>, required: true },
    onCancel: Function as PropType<() => void>,
  },
  setup(props) {
    const { handleSubmit } = useForm<ProductFormValues>({
      validationSchema: toTypedSchema(productFormSchema),
      initialValues: props.initialValues,
    })

    // The pickers manage their own values; we mirror them locally so the
    // submit handler can pass them to the parent alongside the form values.
    const categoryId = ref<string | null>(props.initialCategoryId)
    const supplierId = ref<string | null>(props.initialSupplierId)
    const supplierError = ref<string | null>(null)

    watch(
      () => props.initialCategoryId,
      (v) => {
        categoryId.value = v
      },
    )
    watch(
      () => props.initialSupplierId,
      (v) => {
        supplierId.value = v
      },
    )

    // Clear the supplier error as soon as the user picks one — feels less
    // sticky than leaving the message there until next submit.
    watch(supplierId, (v) => {
      if (v) supplierError.value = null
    })

    const submit = handleSubmit((values) => {
      // Supplier is required (NOT NULL at the DB) — VeeValidate doesn't
      // see the picker, so we check manually here.
      if (!supplierId.value) {
        supplierError.value = 'Supplier is required'
        return
      }
      props.onSubmit(values, categoryId.value, supplierId.value)
    })

    const supplierClass = computed(() =>
      supplierError.value
        ? 'mt-1 ring-2 ring-destructive rounded-md'
        : 'mt-1',
    )

    return () => (
      <form onSubmit={submit} class="space-y-4" novalidate>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField name="name" label="Name" required />
          <div>
            <label class="text-sm font-medium">Category</label>
            <div class="mt-1">
              <CategoryPicker
                modelValue={categoryId.value}
                onUpdate:modelValue={(v: string | null) =>
                  (categoryId.value = v)
                }
              />
            </div>
          </div>
          <div>
            <label class="text-sm font-medium">
              Supplier <span class="text-destructive ml-0.5">*</span>
            </label>
            <div class={supplierClass.value}>
              <SupplierPicker
                modelValue={supplierId.value}
                onUpdate:modelValue={(v: string | null) =>
                  (supplierId.value = v)
                }
              />
            </div>
            {supplierError.value && (
              <p class="mt-1 text-xs text-destructive">{supplierError.value}</p>
            )}
          </div>
          <TextField name="sku" label="SKU" placeholder="Unique per clinic" />
          <TextField name="batch_number" label="Batch number" />
          <DateField name="expiry_date" label="Expiry date" />
          <TextField name="cost_price" label="Cost price" placeholder="0.00" />
          <TextField
            name="selling_price"
            label="Selling price"
            placeholder="0.00"
          />
          <TextField
            name="reorder_level"
            label="Reorder level"
            placeholder="e.g., 10"
          />
          {!props.isEdit && (
            <TextField
              name="initial_stock"
              label="Initial stock"
              placeholder="0 (records a PURCHASE)"
            />
          )}
        </div>
        <TextField name="notes" label="Notes" rows={2} />

        <div class="flex justify-end gap-2 pt-2">
          {props.onCancel && (
            <button
              type="button"
              onClick={() => props.onCancel?.()}
              class="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={props.submitting}
            class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
          >
            {props.submitting ? 'Saving…' : props.submitLabel}
          </button>
        </div>
      </form>
    )
  },
})
