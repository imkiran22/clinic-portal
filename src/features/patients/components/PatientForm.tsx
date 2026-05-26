import { defineComponent, type PropType } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { TextField, SelectField } from '@/components/shared/FormField'
import {
  patientFormSchema,
  emptyPatientForm,
  type PatientFormValues,
} from '../validations'

export default defineComponent({
  name: 'PatientForm',
  props: {
    initialValues: {
      type: Object as PropType<PatientFormValues>,
      default: () => emptyPatientForm,
    },
    submitting: Boolean,
    submitLabel: { type: String, default: 'Save' },
    onSubmit: {
      type: Function as PropType<(values: PatientFormValues) => void>,
      required: true,
    },
    onCancel: Function as PropType<() => void>,
  },
  setup(props) {
    const { handleSubmit } = useForm<PatientFormValues>({
      validationSchema: toTypedSchema(patientFormSchema),
      initialValues: props.initialValues,
    })

    const submit = handleSubmit((values) => {
      props.onSubmit(values)
    })

    return () => (
      <form onSubmit={submit} class="space-y-4" novalidate>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField name="name" label="Name" required autocomplete="name" />
          <TextField
            name="phone"
            label="Phone"
            required
            placeholder="10 digits"
            autocomplete="tel"
          />
          <TextField name="age" label="Age" placeholder="0–130" />
          <SelectField
            name="gender"
            label="Gender"
            options={[
              { value: '', label: '—' },
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <TextField name="email" label="Email" type="email" autocomplete="email" />
          <TextField
            name="legacy_client_no"
            label="Client #"
            required
            placeholder="Next number from your register"
          />
        </div>
        <TextField name="address" label="Address" />
        <TextField name="notes" label="Notes" rows={3} />

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
