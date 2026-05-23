import { defineComponent, ref, type PropType } from 'vue'
import { onClickOutside, refDebounced } from '@vueuse/core'
import { Search, Stethoscope, X } from 'lucide-vue-next'
import { useDoctors } from '../composables/useDoctors'
import type { Profile } from '../services/authService'

// Single-select picker for the appointment's assigned doctor. Mirrors
// PatientPicker: every keystroke (debounced) re-queries the profiles
// table for role='doctor' matches — no client-side filtering, so
// adding a doctor in Supabase shows up here on the next focus without
// a full page refresh. An empty search yields the first N doctors
// alphabetically, so the dropdown is useful immediately on focus.
export default defineComponent({
  name: 'DoctorPicker',
  props: {
    // Null = "Unassigned". Storing the full Profile (not just the id)
    // keeps the chip's display name available without a second lookup.
    modelValue: {
      type: Object as PropType<Profile | null>,
      default: null,
    },
    placeholder: {
      type: String,
      default: 'Search doctor by name…',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const search = ref('')
    const debounced = refDebounced(search, 200)
    const open = ref(false)
    const containerRef = ref<HTMLElement | null>(null)

    const { data: doctors, isFetching } = useDoctors(debounced)

    onClickOutside(containerRef, () => {
      open.value = false
    })

    const select = (d: Profile) => {
      emit('update:modelValue', d)
      search.value = ''
      open.value = false
    }

    const clear = () => {
      emit('update:modelValue', null)
      search.value = ''
    }

    return () => (
      <div ref={containerRef} class="relative">
        {props.modelValue ? (
          <div class="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
            <Stethoscope class="size-4 text-muted-foreground shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {props.modelValue.display_name}
              </div>
              <div class="text-xs text-muted-foreground capitalize">
                {props.modelValue.role}
              </div>
            </div>
            <button
              type="button"
              onClick={clear}
              class="p-1 rounded hover:bg-accent text-muted-foreground"
              aria-label="Clear assigned doctor"
              title="Unassign"
            >
              <X class="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder={props.placeholder}
                value={search.value}
                onInput={(e: Event) => {
                  search.value = (e.target as HTMLInputElement).value
                  open.value = true
                }}
                onFocus={() => (open.value = true)}
                class="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {open.value && (
              <div class="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                {isFetching.value && (doctors.value?.length ?? 0) === 0 && (
                  <div class="px-3 py-2 text-sm text-muted-foreground">
                    Searching…
                  </div>
                )}
                {!isFetching.value && (doctors.value?.length ?? 0) === 0 && (
                  <div class="px-3 py-2 text-sm text-muted-foreground">
                    {debounced.value.trim()
                      ? `No doctors match "${debounced.value}".`
                      : 'No doctors on file. Add one via Supabase (profiles.role = "doctor").'}
                  </div>
                )}
                {(doctors.value ?? []).map((d) => (
                  <button
                    key={d.user_id}
                    type="button"
                    onClick={() => select(d)}
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between gap-3"
                  >
                    <span class="truncate">{d.display_name}</span>
                    <span class="text-xs text-muted-foreground capitalize shrink-0">
                      {d.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  },
})
