import {
  computed,
  defineComponent,
  ref,
  watch,
  type PropType,
} from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import Modal from '@/components/shared/Modal'
import { TextField } from '@/components/shared/FormField'
import DateTimePicker from '@/components/shared/DateTimePicker'
import PatientPicker from '@/features/patients/components/PatientPicker'
import {
  appointmentFormSchema,
  emptyAppointmentForm,
  nextHalfHour,
  toAppointmentInput,
  type AppointmentFormValues,
} from '../validations'
import {
  useCreateAppointment,
  useUpdateAppointment,
} from '../composables/useAppointmentMutations'
import type { Appointment } from '../types'
import type { Patient } from '@/features/patients/types'
import DoctorPicker from '@/features/auth/components/DoctorPicker'
import type { Profile } from '@/features/auth/services/authService'

export default defineComponent({
  name: 'AppointmentFormDialog',
  props: {
    open: { type: Boolean, required: true },
    appointment: {
      type: Object as PropType<Appointment | null>,
      default: null,
    },
    // Lock the patient when invoked from a patient-detail page so staff
    // don't accidentally re-pick.
    lockedPatient: {
      type: Object as PropType<Patient | null>,
      default: null,
    },
  },
  emits: ['update:open', 'saved'],
  setup(props, { emit }) {
    const isEdit = computed(() => !!props.appointment)

    const initialValues = computed<AppointmentFormValues>(() => {
      if (props.appointment) {
        return {
          treatment_description: props.appointment.treatment_description,
          session_number:
            props.appointment.session_number === null
              ? ''
              : String(props.appointment.session_number),
          notes: props.appointment.notes ?? '',
        }
      }
      return emptyAppointmentForm
    })

    // The PatientPicker manages its own selected object; we mirror it
    // locally so submit can pass the id alongside the form values.
    const patient = ref<Patient | null>(
      props.lockedPatient ??
        (props.appointment?.patient
          ? (props.appointment.patient as unknown as Patient)
          : null),
    )
    const patientError = ref<string | null>(null)

    // VueDatePicker is bound to a Date | null. Defaults: existing
    // timestamp when editing; "today, next half-hour" when creating —
    // staff usually just tweak the hour and submit.
    const initialDate = (): Date | null =>
      props.appointment ? new Date(props.appointment.scheduled_at) : nextHalfHour()
    const scheduledAt = ref<Date | null>(initialDate())
    const scheduledAtError = ref<string | null>(null)
    watch(scheduledAt, (v) => {
      if (v) scheduledAtError.value = null
    })

    // Assigned doctor lives outside the Zod schema (the picker is a
    // standalone combobox). We deliberately do NOT pre-fill on create:
    // most WhatsApp bookings are "any doctor today", and pre-selecting
    // the logged-in user (often an admin or receptionist filling in for
    // the doctor) misrepresents the schedule. Edit mode keeps the
    // existing assignment from the row.
    const initialDoctor = (): Profile | null => {
      if (props.appointment && props.appointment.assigned_doctor) {
        return props.appointment.assigned_doctor as Profile
      }
      return null
    }
    const assignedDoctor = ref<Profile | null>(initialDoctor())

    watch(
      () => props.appointment,
      (next) => {
        patient.value = next?.patient
          ? (next.patient as unknown as Patient)
          : (props.lockedPatient ?? null)
        assignedDoctor.value = next
          ? next.assigned_doctor
            ? (next.assigned_doctor as Profile)
            : null
          : initialDoctor()
        scheduledAt.value = initialDate()
      },
    )
    watch(patient, (v) => {
      if (v) patientError.value = null
    })

    const { handleSubmit, resetForm } = useForm<AppointmentFormValues>({
      validationSchema: toTypedSchema(appointmentFormSchema),
      initialValues: initialValues.value,
    })

    // Reset the form whenever the dialog opens for a different
    // appointment (or transitions from edit to create).
    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          resetForm({ values: initialValues.value })
          patient.value =
            props.lockedPatient ??
            (props.appointment?.patient
              ? (props.appointment.patient as unknown as Patient)
              : null)
          assignedDoctor.value = initialDoctor()
          scheduledAt.value = initialDate()
          patientError.value = null
          scheduledAtError.value = null
        }
      },
    )

    const createMut = useCreateAppointment()
    const updateMut = useUpdateAppointment()
    const submitting = computed(
      () => createMut.isPending.value || updateMut.isPending.value,
    )

    const submit = handleSubmit(async (values) => {
      let ok = true
      if (!patient.value) {
        patientError.value = 'Patient is required'
        ok = false
      }
      if (!scheduledAt.value) {
        scheduledAtError.value = 'Date & time required'
        ok = false
      }
      if (!ok) return
      try {
        const input = toAppointmentInput(
          values,
          patient.value!.id,
          scheduledAt.value!,
          assignedDoctor.value?.user_id ?? null,
        )
        if (props.appointment) {
          await updateMut.mutateAsync({
            id: props.appointment.id,
            input,
          })
        } else {
          await createMut.mutateAsync(input)
        }
        emit('saved')
        emit('update:open', false)
      } catch {
        // toast surfaced by mutation
      }
    })

    return () => (
      <Modal
        open={props.open}
        title={isEdit.value ? 'Edit appointment' : 'New appointment'}
        size="max-w-lg"
        dismissOnBackdrop={false}
        onUpdate:open={(v: boolean) => emit('update:open', v)}
      >
        <form
          key={props.appointment?.id ?? 'new'}
          onSubmit={submit}
          class="space-y-4"
          novalidate
        >
          <div>
            <label class="text-sm font-medium">
              Patient <span class="text-destructive ml-0.5">*</span>
            </label>
            <div class="mt-1">
              {props.lockedPatient ? (
                <div class="px-3 py-2 rounded-md border border-border bg-muted/30 text-sm">
                  {props.lockedPatient.name}
                  {props.lockedPatient.legacy_client_no && (
                    <span class="ml-1 text-xs text-muted-foreground tabular-nums">
                      #{props.lockedPatient.legacy_client_no}
                    </span>
                  )}
                </div>
              ) : (
                <PatientPicker
                  modelValue={patient.value}
                  onUpdate:modelValue={(p: Patient | null) =>
                    (patient.value = p)
                  }
                />
              )}
            </div>
            {patientError.value && (
              <p class="mt-1 text-xs text-destructive">
                {patientError.value}
              </p>
            )}
          </div>

          <div>
            <label class="text-sm font-medium">
              Date &amp; time <span class="text-destructive ml-0.5">*</span>
            </label>
            <div class="mt-1">
              <DateTimePicker
                modelValue={scheduledAt.value}
                onUpdate:modelValue={(d: Date | null) =>
                  (scheduledAt.value = d)
                }
              />
            </div>
            {scheduledAtError.value && (
              <p class="mt-1 text-xs text-destructive">
                {scheduledAtError.value}
              </p>
            )}
          </div>

          <div>
            <label class="text-sm font-medium">Doctor</label>
            <div class="mt-1">
              <DoctorPicker
                modelValue={assignedDoctor.value}
                onUpdate:modelValue={(d: Profile | null) =>
                  (assignedDoctor.value = d)
                }
              />
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              Optional — leave empty for "any doctor", or pick when the
              patient has asked for one.
            </p>
          </div>

          <TextField
            name="treatment_description"
            label="Treatment"
            placeholder="e.g., GFC, Laser with peel, DPN removal"
            required
          />
          <TextField
            name="session_number"
            label="Session #"
            placeholder="e.g., 3 (leave blank if not applicable)"
          />
          <TextField
            name="notes"
            label="Notes"
            rows={2}
            placeholder="Optional — e.g., confirmation status, special instructions"
          />

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
              disabled={submitting.value}
              class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
            >
              {submitting.value
                ? 'Saving…'
                : isEdit.value
                  ? 'Save changes'
                  : 'Create appointment'}
            </button>
          </div>
        </form>
      </Modal>
    )
  },
})
