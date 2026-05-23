import { defineComponent, h, ref, onMounted, onBeforeUnmount, type PropType } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'

// Date-only picker (no time). v-model is the ISO YYYY-MM-DD string so
// existing call sites that store dates as strings (filters, DOB inputs,
// follow-up dates) don't have to convert. VueDatePicker itself works
// in Date objects internally; we adapt at the boundary.
//
// Companion to DateTimePicker.tsx. Same dark-mode-reactive trick.

function dateToIsoDay(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoDayToDate(s: string | null | undefined): Date | null {
  if (!s) return null
  // Parse as local midnight so the calendar lands on the right cell
  // regardless of the user's timezone.
  const [y, m, day] = s.split('-').map(Number)
  if (!y || !m || !day) return null
  return new Date(y, m - 1, day, 0, 0, 0, 0)
}

export default defineComponent({
  name: 'DatePicker',
  props: {
    modelValue: { type: String as PropType<string | null>, default: '' },
    placeholder: { type: String, default: 'DD/MM/YYYY' },
    clearable: { type: Boolean, default: true },
    // Some forms (filters) want a compact 7-row layout
    size: { type: String as PropType<'sm' | 'md'>, default: 'md' },
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
      h(
        'div',
        { class: props.size === 'sm' ? 'dp-sm' : '' },
        h(VueDatePicker as unknown as ReturnType<typeof defineComponent>, {
          modelValue: isoDayToDate(props.modelValue),
          'onUpdate:modelValue': (v: Date | null) =>
            emit('update:modelValue', dateToIsoDay(v)),
          // v12 — top-level format / enableTimePicker props were
          // folded into the `formats` and `timeConfig` config blobs.
          // See DateTimePicker.tsx for the same gotcha.
          formats: { input: 'dd/MM/yyyy', preview: 'dd/MM/yyyy' },
          timeConfig: { enableTimePicker: false },
          autoApply: true,
          teleport: true,
          placeholder: props.placeholder,
          dark: isDark.value,
          clearable: props.clearable,
        }),
      )
  },
})
