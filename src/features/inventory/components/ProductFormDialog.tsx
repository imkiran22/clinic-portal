import { computed, defineComponent, type PropType } from 'vue'
import Modal from '@/components/shared/Modal'
import ProductForm from './ProductForm'
import {
  emptyProductForm,
  fromProduct,
  toProductCreateInput,
  toProductUpdateInput,
  type ProductFormValues,
} from '../validations'
import {
  useCreateProduct,
  useUpdateProduct,
} from '../composables/useProductMutations'
import type { Product } from '../types'

export default defineComponent({
  name: 'ProductFormDialog',
  props: {
    open: { type: Boolean, required: true },
    product: { type: Object as PropType<Product | null>, default: null },
  },
  emits: ['update:open', 'saved'],
  setup(props, { emit }) {
    const isEdit = computed(() => !!props.product)
    const initialValues = computed<ProductFormValues>(() =>
      props.product ? fromProduct(props.product) : emptyProductForm,
    )

    const createMut = useCreateProduct()
    const updateMut = useUpdateProduct()
    const submitting = computed(
      () => createMut.isPending.value || updateMut.isPending.value,
    )

    const onSubmit = async (values: ProductFormValues) => {
      try {
        if (props.product) {
          const input = toProductUpdateInput(values)
          await updateMut.mutateAsync({ id: props.product.id, input })
        } else {
          const input = toProductCreateInput(values)
          await createMut.mutateAsync(input)
        }
        emit('saved')
        emit('update:open', false)
      } catch {
        // toast surfaced by mutation onError
      }
    }

    return () => (
      <Modal
        open={props.open}
        title={isEdit.value ? 'Edit product' : 'New product'}
        onUpdate:open={(v: boolean) => emit('update:open', v)}
      >
        <ProductForm
          key={props.product?.id ?? 'new'}
          initialValues={initialValues.value}
          isEdit={isEdit.value}
          submitting={submitting.value}
          submitLabel={isEdit.value ? 'Save changes' : 'Create product'}
          onSubmit={onSubmit}
          onCancel={() => emit('update:open', false)}
        />
      </Modal>
    )
  },
})
