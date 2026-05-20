import { computed, defineComponent, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Trash2, ArrowLeft, Plus } from 'lucide-vue-next'
import { usePatient } from '@/features/patients/composables/usePatients'
import { useSoftDeletePatient } from '@/features/patients/composables/usePatientMutations'
import PatientFormDialog from '@/features/patients/components/PatientFormDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useVisitsForPatient } from '@/features/visits/composables/useVisits'
import VisitsTable from '@/features/visits/components/VisitsTable'
import VisitDetailModal from '@/features/visits/components/VisitDetailModal'
import type { Visit } from '@/features/visits/types'

function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return '—'
  }
}

export default defineComponent({
  name: 'PatientDetailView',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const id = computed(() => route.params.id as string)

    const { data, isLoading, isError, error } = usePatient(id)
    const { data: visits, isLoading: visitsLoading } = useVisitsForPatient(id)

    const editOpen = ref(false)
    const confirmOpen = ref(false)
    const softDeleteMut = useSoftDeletePatient()

    const selectedVisit = ref<Visit | null>(null)
    const visitDetailOpen = ref(false)
    const openVisit = (v: Visit) => {
      // The patient list query selects '*' (no patient embed), so attach the
      // already-loaded patient before opening the detail modal — it expects
      // visit.patient to be populated.
      selectedVisit.value = data.value
        ? {
            ...v,
            patient: {
              id: data.value.id,
              name: data.value.name,
              legacy_client_no: data.value.legacy_client_no,
            },
          }
        : v
      visitDetailOpen.value = true
    }

    const performDelete = async () => {
      if (!data.value) return
      try {
        await softDeleteMut.mutateAsync(data.value.id)
        confirmOpen.value = false
        router.push({ name: 'patients' })
      } catch {
        // toast surfaced
      }
    }

    const renderField = (label: string, value: string | number | null | undefined) => (
      <div>
        <div class="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div class="text-sm mt-0.5">{value === null || value === undefined || value === '' ? '—' : value}</div>
      </div>
    )

    return () => (
      <div class="space-y-4">
        <button
          type="button"
          onClick={() => router.push({ name: 'patients' })}
          class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="size-4" />
          <span>Back to patients</span>
        </button>

        {isLoading.value && (
          <div class="rounded-md border border-border bg-card p-6 animate-pulse">
            <div class="h-7 w-48 bg-muted rounded mb-4" />
            <div class="grid grid-cols-2 gap-4">
              <div class="h-6 bg-muted rounded" />
              <div class="h-6 bg-muted rounded" />
              <div class="h-6 bg-muted rounded" />
              <div class="h-6 bg-muted rounded" />
            </div>
          </div>
        )}

        {isError.value && (
          <div class="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {(error.value as { message?: string })?.message ?? 'Failed to load patient.'}
          </div>
        )}

        {!isLoading.value && !isError.value && !data.value && (
          <div class="rounded-md border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            Patient not found. They may have been removed.
          </div>
        )}

        {data.value && (
          <>
            <div class="rounded-md border border-border bg-card">
              <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
                <div>
                  <h1 class="text-2xl font-semibold tracking-tight">{data.value.name}</h1>
                  <p class="text-sm text-muted-foreground mt-0.5">
                    {data.value.legacy_client_no ? `Client #${data.value.legacy_client_no} · ` : ''}
                    {data.value.phone}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={() => (editOpen.value = true)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
                  >
                    <Pencil class="size-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (confirmOpen.value = true)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 class="size-4" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
              <div class="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {renderField('Name', data.value.name)}
                {renderField('Phone', data.value.phone)}
                {renderField('Client #', data.value.legacy_client_no)}
                {renderField('Age', data.value.age)}
                {renderField('Gender', data.value.gender)}
                {renderField('Email', data.value.email)}
                <div class="col-span-2 sm:col-span-3">
                  {renderField('Address', data.value.address)}
                </div>
                <div class="col-span-2 sm:col-span-3">
                  {renderField('Notes', data.value.notes)}
                </div>
                {renderField('Added', formatDate(data.value.created_at))}
                {renderField('Updated', formatDate(data.value.updated_at))}
              </div>
            </div>

            <div class="rounded-md border border-border bg-card">
              <div class="flex items-center justify-between gap-4 px-6 py-3 border-b border-border">
                <div>
                  <h2 class="text-base font-semibold">Visit history</h2>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    {visitsLoading.value
                      ? 'Loading…'
                      : `${(visits.value ?? []).length} visit${
                          (visits.value ?? []).length === 1 ? '' : 's'
                        }`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push({
                      name: 'visit-new',
                      query: { patient_id: data.value!.id },
                    })
                  }
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  <Plus class="size-4" />
                  <span>New visit</span>
                </button>
              </div>
              <div class="p-4">
                {visitsLoading.value ? (
                  <div class="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        class="h-10 rounded-md bg-muted/40 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (visits.value ?? []).length === 0 ? (
                  <div class="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No visits recorded yet.
                  </div>
                ) : (
                  <VisitsTable
                    visits={visits.value ?? []}
                    showPatient={false}
                    onOpen={openVisit}
                  />
                )}
              </div>
            </div>

            <VisitDetailModal
              open={visitDetailOpen.value}
              visit={selectedVisit.value}
              onUpdate:open={(v: boolean) => (visitDetailOpen.value = v)}
            />

            <PatientFormDialog
              open={editOpen.value}
              patient={data.value}
              onUpdate:open={(v: boolean) => (editOpen.value = v)}
            />

            <ConfirmDialog
              open={confirmOpen.value}
              title="Remove patient"
              message={`Remove "${data.value.name}"? This is a soft delete — visit history is preserved, but the patient won't appear in lists.`}
              confirmLabel="Remove"
              destructive
              loading={softDeleteMut.isPending.value}
              onUpdate:open={(v: boolean) => (confirmOpen.value = v)}
              onConfirm={performDelete}
            />
          </>
        )}
      </div>
    )
  },
})
