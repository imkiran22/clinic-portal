import { defineComponent, type PropType } from 'vue'
import { useField } from 'vee-validate'

type SelectOption = { value: string; label: string }

export const TextField = defineComponent({
  name: 'TextField',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, default: 'text' },
    required: Boolean,
    placeholder: String,
    autocomplete: String,
    rows: Number,
  },
  setup(props) {
    const { value, errorMessage, handleBlur, handleChange } = useField<string>(props.name)
    return () => (
      <div>
        <label class="text-sm font-medium" for={props.name}>
          {props.label}
          {props.required && <span class="text-destructive ml-0.5">*</span>}
        </label>
        {props.rows ? (
          <textarea
            id={props.name}
            value={value.value ?? ''}
            onInput={(e: Event) => handleChange((e.target as HTMLTextAreaElement).value)}
            onBlur={handleBlur}
            rows={props.rows}
            placeholder={props.placeholder}
            class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        ) : (
          <input
            id={props.name}
            type={props.type}
            value={value.value ?? ''}
            onInput={(e: Event) => handleChange((e.target as HTMLInputElement).value)}
            onBlur={handleBlur}
            placeholder={props.placeholder}
            autocomplete={props.autocomplete}
            class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
        {errorMessage.value && (
          <p class="mt-1 text-xs text-destructive">{errorMessage.value}</p>
        )}
      </div>
    )
  },
})

export const SelectField = defineComponent({
  name: 'SelectField',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: true },
    options: {
      type: Array as PropType<SelectOption[]>,
      required: true,
    },
    required: Boolean,
  },
  setup(props) {
    const { value, errorMessage, handleBlur, handleChange } = useField<string>(props.name)
    return () => (
      <div>
        <label class="text-sm font-medium" for={props.name}>
          {props.label}
          {props.required && <span class="text-destructive ml-0.5">*</span>}
        </label>
        <select
          id={props.name}
          value={value.value ?? ''}
          onChange={(e: Event) => handleChange((e.target as HTMLSelectElement).value)}
          onBlur={handleBlur}
          class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errorMessage.value && (
          <p class="mt-1 text-xs text-destructive">{errorMessage.value}</p>
        )}
      </div>
    )
  },
})
