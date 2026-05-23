import { defineComponent, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import {
  CheckCircle2,
  CircleSlash,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-vue-next'
import AppointmentStatusPill from './AppointmentStatusPill'
import { useCan } from '@/features/auth/composables/useCan'
import type { Appointment } from '../types'

function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return '—'
  }
}

export default defineComponent({
  name: 'AppointmentsTable',
  props: {
    appointments: {
      type: Array as PropType<Appointment[]>,
      required: true,
    },
    showPatient: { type: Boolean, default: true },
  },
  emits: ['edit', 'markDone', 'cancel', 'restore', 'softDelete'],
  setup(props, { emit }) {
    const router = useRouter()
    const { canDeletePatient } = useCan() // privileged tier (admin/doctor)

    return () => (
      <div class="overflow-x-auto rounded-md border border-border">
        <table class="w-full text-sm">
          <thead class="bg-muted/40 text-muted-foreground">
            <tr class="text-left">
              <th class="px-4 py-2 font-medium whitespace-nowrap">When</th>
              {props.showPatient && (
                <th class="px-4 py-2 font-medium">Patient</th>
              )}
              <th class="px-4 py-2 font-medium">Treatment</th>
              <th class="px-4 py-2 font-medium">Status</th>
              <th class="px-4 py-2 font-medium">Notes</th>
              <th class="px-4 py-2 font-medium">By</th>
              <th class="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.appointments.map((a) => {
              const isScheduled = a.status === 'scheduled'
              const isDone = a.status === 'done'
              const isCancelled = a.status === 'cancelled'
              return (
                <tr key={a.id} class="border-t border-border">
                  <td class="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(a.scheduled_at)}
                  </td>
                  {props.showPatient && (
                    <td class="px-4 py-2">
                      {a.patient ? (
                        <button
                          type="button"
                          class="text-left hover:underline"
                          onClick={() =>
                            router.push({
                              name: 'patient-detail',
                              params: { id: a.patient!.id },
                            })
                          }
                        >
                          {a.patient.name}
                          {a.patient.legacy_client_no && (
                            <span class="ml-1 text-xs text-muted-foreground tabular-nums">
                              #{a.patient.legacy_client_no}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span class="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td class="px-4 py-2">
                    <div>{a.treatment_description}</div>
                    {a.session_number !== null && (
                      <div class="text-xs text-muted-foreground">
                        Session #{a.session_number}
                      </div>
                    )}
                  </td>
                  <td class="px-4 py-2">
                    <AppointmentStatusPill status={a.status} />
                  </td>
                  <td class="px-4 py-2 text-muted-foreground">
                    {a.notes ? (
                      <span class="line-clamp-2">{a.notes}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td class="px-4 py-2 text-muted-foreground">
                    {a.created_by_display ?? '—'}
                  </td>
                  <td class="px-4 py-2 text-right">
                    <div class="inline-flex gap-0.5">
                      {isScheduled && (
                        <>
                          <button
                            type="button"
                            onClick={() => emit('markDone', a)}
                            class="p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
                            title="Mark done — record a visit"
                            aria-label="Mark done"
                          >
                            <CheckCircle2 class="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => emit('cancel', a)}
                            class="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400"
                            title="Cancel"
                            aria-label="Cancel"
                          >
                            <CircleSlash class="size-4" />
                          </button>
                        </>
                      )}
                      {isCancelled && (
                        <button
                          type="button"
                          onClick={() => emit('restore', a)}
                          class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Restore to scheduled"
                          aria-label="Restore"
                        >
                          <RotateCcw class="size-4" />
                        </button>
                      )}
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => emit('edit', a)}
                          class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil class="size-4" />
                        </button>
                      )}
                      {canDeletePatient.value && (
                        <button
                          type="button"
                          onClick={() => emit('softDelete', a)}
                          class="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Remove"
                          aria-label="Remove"
                        >
                          <Trash2 class="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  },
})
