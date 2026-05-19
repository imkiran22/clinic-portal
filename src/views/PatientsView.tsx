import { computed, defineComponent, ref } from 'vue'
import { refDebounced } from '@vueuse/core'
import { Plus, Search } from 'lucide-vue-next'
import { usePatients } from '@/features/patients/composables/usePatients'
import { useSoftDeletePatient } from '@/features/patients/composables/usePatientMutations'
import PatientsTable from '@/features/patients/components/PatientsTable'
import PatientFormDialog from '@/features/patients/components/PatientFormDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { Patient } from '@/features/patients/types'

export default defineComponent({
  name: 'PatientsView',
  setup() {
    const searchInput = ref('')
    const debouncedSearch = refDebounced(searchInput, 300)

    const { data, isLoading, isError, error } = usePatients(debouncedSearch)

    const formOpen = ref(false)
    const editing = ref<Patient | null>(null)

    const confirmOpen = ref(false)
    const deleting = ref<Patient | null>(null)
    const softDeleteMut = useSoftDeletePatient()

    const openNew = () => {
      editing.value = null
      formOpen.value = true
    }
    const openEdit = (p: Patient) => {
      editing.value = p
      formOpen.value = true
    }
    const requestDelete = (p: Patient) => {
      deleting.value = p
      confirmOpen.value = true
    }
    const performDelete = async () => {
      if (!deleting.value) return
      try {
        await softDeleteMut.mutateAsync(deleting.value.id)
        confirmOpen.value = false
        deleting.value = null
      } catch {
        // toast surfaced in mutation
      }
    }

    const count = computed(() => data.value?.length ?? 0)

    return () => (
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Patients</h1>
            <p class="text-sm text-muted-foreground mt-1">
              {isLoading.value
                ? 'Loading…'
                : `${count.value} patient${count.value === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus class="size-4" />
            <span>New patient</span>
          </button>
        </div>

        <div class="relative max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by name, phone, or client #"
            value={searchInput.value}
            onInput={(e: Event) => (searchInput.value = (e.target as HTMLInputElement).value)}
            class="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isError.value && (
          <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {(error.value as { message?: string })?.message ?? 'Failed to load patients.'}
          </div>
        )}

        {isLoading.value && (
          <div class="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} class="h-10 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading.value && !isError.value && count.value === 0 && (
          <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            {debouncedSearch.value
              ? `No patients match "${debouncedSearch.value}".`
              : 'No patients yet. Click "New patient" to add one.'}
          </div>
        )}

        {!isLoading.value && !isError.value && count.value > 0 && (
          <PatientsTable
            patients={data.value ?? []}
            onEdit={openEdit}
            onDelete={requestDelete}
          />
        )}

        <PatientFormDialog
          open={formOpen.value}
          patient={editing.value}
          onUpdate:open={(v: boolean) => (formOpen.value = v)}
        />

        <ConfirmDialog
          open={confirmOpen.value}
          title="Remove patient"
          message={
            deleting.value
              ? `Remove "${deleting.value.name}"? This is a soft delete — visit history is preserved, but the patient won't appear in lists.`
              : ''
          }
          confirmLabel="Remove"
          destructive
          loading={softDeleteMut.isPending.value}
          onUpdate:open={(v: boolean) => (confirmOpen.value = v)}
          onConfirm={performDelete}
        />
      </div>
    )
  },
})
