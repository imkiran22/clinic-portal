import { defineComponent, h, ref, onMounted, onBeforeUnmount, type PropType } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'

// Thin wrapper around @vuepic/vue-datepicker so:
//   - The whole app uses one picker (consistent look + behaviour).
//   - Props are passed via h() instead of JSX — the library's
//     generated types only accept kebab-case prop names through JSX
//     attributes, and the spread form silently drops some props
//     (`is24` was the painful one — without h() the picker fell back
//     to 24-hour even when we asked for 12).
//   - Dark mode is reactive: an MutationObserver watches the .dark
//     class on <html> so toggling the theme re-themes any open
//     picker without a remount.
//
// Date-only callers should use the sibling DatePicker.tsx wrapper.

export default defineComponent({
  name: 'DateTimePicker',
  props: {
    modelValue: {
      type: [Date, Object, String, null] as unknown as PropType<Date | null>,
      default: null,
    },
    placeholder: { type: String, default: 'DD/MM/YYYY HH:MM AM/PM' },
    minutesIncrement: { type: Number, default: 5 },
    clearable: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isDark = ref(false)
    let observer: MutationObserver | null = null
    onMounted(() => {
      const root = document.documentElement
      isDark.value = root.classList.contains('dark')
      observer = new MutationObserver(() => {
        isDark.value = root.classList.contains('dark')
      })
      observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    })
    onBeforeUnmount(() => observer?.disconnect())

    return () =>
      h(VueDatePicker as unknown as ReturnType<typeof defineComponent>, {
        modelValue: props.modelValue,
        'onUpdate:modelValue': (v: Date | null) =>
          emit('update:modelValue', v),
        // v12 moved per-feature props into nested config objects. The
        // most painful one: `is24` is now `timeConfig.is24`. Passing it
        // at the top level silently no-ops, which is what kept the
        // picker stuck on 24-hour despite `is24: false`.
        timeConfig: {
          is24: false,
          minutesIncrement: props.minutesIncrement,
        },
        formats: {
          input: 'dd/MM/yyyy hh:mm a',
          preview: 'dd/MM/yyyy hh:mm a',
        },
        autoApply: true,
        teleport: true,
        placeholder: props.placeholder,
        dark: isDark.value,
        clearable: props.clearable,
      })
  },
})
