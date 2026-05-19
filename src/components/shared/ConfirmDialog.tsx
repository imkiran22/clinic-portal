import { defineComponent } from 'vue'
import Modal from './Modal'

export default defineComponent({
  name: 'ConfirmDialog',
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, default: 'Are you sure?' },
    message: { type: String, default: 'This action cannot be undone.' },
    confirmLabel: { type: String, default: 'Confirm' },
    cancelLabel: { type: String, default: 'Cancel' },
    destructive: { type: Boolean, default: false },
    loading: Boolean,
  },
  emits: ['update:open', 'confirm'],
  setup(props, { emit }) {
    return () => (
      <Modal open={props.open} title={props.title} size="max-w-md" onUpdate:open={(v: boolean) => emit('update:open', v)}>
        <p class="text-sm text-muted-foreground mb-6">{props.message}</p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => emit('update:open', false)}
            disabled={props.loading}
            class="px-4 py-2 rounded-md border border-border text-sm hover:bg-accent disabled:opacity-50"
          >
            {props.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => emit('confirm')}
            disabled={props.loading}
            class={
              props.destructive
                ? 'px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50 hover:bg-destructive/90'
                : 'px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90'
            }
          >
            {props.loading ? 'Working…' : props.confirmLabel}
          </button>
        </div>
      </Modal>
    )
  },
})
