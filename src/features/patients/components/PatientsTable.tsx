import { defineComponent, type PropType } from "vue";
import { Pencil, Trash2 } from "lucide-vue-next";
import { useRouter } from "vue-router";
import type { Patient } from "../types";

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default defineComponent({
  name: "PatientsTable",
  props: {
    patients: { type: Array as PropType<Patient[]>, required: true },
    onEdit: {
      type: Function as PropType<(patient: Patient) => void>,
      required: true,
    },
    onDelete: {
      type: Function as PropType<(patient: Patient) => void>,
      required: true,
    },
  },
  setup(props) {
    const router = useRouter();

    const goToDetail = (id: string) => {
      router.push({ name: "patient-detail", params: { id } });
    };

    return () => (
      <div class="overflow-x-auto rounded-md border border-border">
        <table class="w-full text-sm">
          <thead class="bg-muted/40 text-muted-foreground">
            <tr class="text-left">
              <th class="px-4 py-2 font-medium w-24">Client #</th>
              <th class="px-4 py-2 font-medium">Name</th>
              <th class="px-4 py-2 font-medium">Gender</th>
              <th class="px-4 py-2 font-medium">Phone</th>
              <th class="px-4 py-2 font-medium">Added</th>
              <th class="px-4 py-2 font-medium w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.patients.map((p) => (
              <tr
                key={p.id}
                class="border-t border-border hover:bg-accent/40 cursor-pointer transition-colors"
                onClick={() => goToDetail(p.id)}
              >
                <td class="px-4 py-2 tabular-nums font-medium">
                  {p.legacy_client_no ?? "—"}
                </td>
                <td class="px-4 py-2">{p.name}</td>
                <td class="px-4 py-2 capitalize text-muted-foreground">{p.gender ?? "—"}</td>
                <td class="px-4 py-2 tabular-nums text-muted-foreground">
                  {p.phone}
                </td>
                <td class="px-4 py-2 text-muted-foreground">
                  {formatDate(p.created_at)}
                </td>
                <td
                  class="px-4 py-2 text-right"
                  onClick={(e: MouseEvent) => e.stopPropagation()}
                >
                  <div class="inline-flex gap-1">
                    <button
                      type="button"
                      class="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={() => props.onEdit(p)}
                      title="Edit"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil class="size-4" />
                    </button>
                    <button
                      type="button"
                      class="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => props.onDelete(p)}
                      title="Remove"
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
});
