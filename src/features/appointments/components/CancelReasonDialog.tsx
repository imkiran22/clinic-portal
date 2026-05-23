import { defineComponent, ref, watch, type PropType } from 'vue'
import Modal from '@/components/shared/Modal'

// Small modal for capturing the cancellation reason — staff use this
// after the patient calls saying they can't make it. Cancellation
// without a reason is allowed; the field is just a quick prompt.

export default defineComponent({
  name: 'CancelReasonDialog',
  props: {
    open: { type: Boolean, required: true },
    initialNotes: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    onConfirm: {
      type: Function as PropType<(notes: string) => void>,
      required: true,
    },
  },
  emits: ['update:open'],
  setup(props, { emit }) {
    const notes = ref(props.initialNotes)

    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) notes.value = props.initialNotes
      },
    )

    return () => (
      <Modal
        open={props.open}
        title="Cancel appointment"
        size="max-w-md"
        onUpdate:open={(v: boolean) => emit('update:open', v)}
      >
        <div class="space-y-3">
          <p class="text-sm text-muted-foreground">
            Marking this appointment as cancelled. A short reason helps
            future audits (e.g. "Out of station", "Patient declined",
            "Rescheduled for next week").
          </p>
          <textarea
            value={notes.value}
            onInput={(e: Event) =>
              (notes.value = (e.target as HTMLTextAreaElement).value)
            }
            rows={3}
            placeholder="Reason (optional)"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            autofocus
          />
          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => emit('update:open', false)}
              class="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent"
            >
              Keep scheduled
            </button>
            <button
              type="button"
              onClick={() => props.onConfirm(notes.value)}
              disabled={props.loading}
              class="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
            >
              {props.loading ? 'Cancelling…' : 'Cancel appointment'}
            </button>
          </div>
        </div>
      </Modal>
    )
  },
})
