import { Teleport, defineComponent, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { X } from 'lucide-vue-next'

export default defineComponent({
  name: 'Modal',
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, required: true },
    size: { type: String, default: 'max-w-2xl' },
    // Backdrop-click dismiss is the default. Forms that take real user
    // input (e.g. AppointmentFormDialog) opt out so a stray click on
    // empty space doesn't nuke a half-filled draft. Esc + the explicit
    // X / Cancel buttons still close it.
    dismissOnBackdrop: { type: Boolean, default: true },
  },
  emits: ['update:open'],
  setup(props, { emit, slots }) {
    useEventListener('keydown', (e: KeyboardEvent) => {
      if (props.open && e.key === 'Escape') {
        emit('update:open', false)
      }
    })

    watch(
      () => props.open,
      (isOpen) => {
        if (typeof document !== 'undefined') {
          document.body.style.overflow = isOpen ? 'hidden' : ''
        }
      },
    )

    return () => (
      <Teleport to="body">
        {props.open && (
          <div
            class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => {
              if (props.dismissOnBackdrop) emit('update:open', false)
            }}
          >
            <div
              class={`bg-card text-card-foreground rounded-lg shadow-lg w-full ${props.size} max-h-[90vh] overflow-auto`}
              onClick={(e: MouseEvent) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div class="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 class="text-lg font-semibold">{props.title}</h2>
                <button
                  type="button"
                  onClick={() => emit('update:open', false)}
                  class="p-1 rounded hover:bg-accent text-muted-foreground"
                  aria-label="Close"
                >
                  <X class="size-5" />
                </button>
              </div>
              <div class="px-6 py-4">{slots.default?.()}</div>
            </div>
          </div>
        )}
      </Teleport>
    )
  },
})
