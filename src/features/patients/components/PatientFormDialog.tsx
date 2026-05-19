import { computed, defineComponent, type PropType } from 'vue'
import Modal from '@/components/shared/Modal'
import PatientForm from './PatientForm'
import {
  emptyPatientForm,
  fromPatient,
  toPatientInput,
  type PatientFormValues,
} from '../validations'
import { useCreatePatient, useUpdatePatient } from '../composables/usePatientMutations'
import type { Patient } from '../types'

export default defineComponent({
  name: 'PatientFormDialog',
  props: {
    open: { type: Boolean, required: true },
    patient: { type: Object as PropType<Patient | null>, default: null },
  },
  emits: ['update:open', 'saved'],
  setup(props, { emit }) {
    const isEdit = computed(() => !!props.patient)

    const initialValues = computed<PatientFormValues>(() =>
      props.patient ? fromPatient(props.patient) : emptyPatientForm,
    )

    const createMut = useCreatePatient()
    const updateMut = useUpdatePatient()

    const submitting = computed(
      () => createMut.isPending.value || updateMut.isPending.value,
    )

    const onSubmit = async (values: PatientFormValues) => {
      const input = toPatientInput(values)
      try {
        if (props.patient) {
          await updateMut.mutateAsync({ id: props.patient.id, input })
        } else {
          await createMut.mutateAsync(input)
        }
        emit('saved')
        emit('update:open', false)
      } catch {
        // toast already surfaced by the mutation onError
      }
    }

    return () => (
      <Modal
        open={props.open}
        title={isEdit.value ? 'Edit patient' : 'New patient'}
        onUpdate:open={(v: boolean) => emit('update:open', v)}
      >
        <PatientForm
          key={props.patient?.id ?? 'new'}
          initialValues={initialValues.value}
          submitting={submitting.value}
          submitLabel={isEdit.value ? 'Save changes' : 'Create patient'}
          onSubmit={onSubmit}
          onCancel={() => emit('update:open', false)}
        />
      </Modal>
    )
  },
})
