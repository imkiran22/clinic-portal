# Clinic Portal — Project Guide for Claude

## What this is
A web-based internal clinic management portal for a dermatology/skin clinic. Replaces Excel-based workflows for: patient management, inventory/stock tracking with full audit history, product sales, and treatment/visit notes. **Operational software, not an accounting/billing ERP.**

## Current status
**M1–M8 done. M9 (polish) underway: global ErrorBoundary in place; mobile sidebar drawer, skeletons, empty states, and 404 already shipped.**

Shipped so far:
- **M1** scaffold (Vue 3 + Vite + TSX), AppShell with sidebar/topbar/dark-mode toggle.
- **M2** six base migrations (clinics, profiles, helper fn, domain tables, RLS, dev seed, visit-with-prescriptions RPC).
- **M3** Supabase auth, Vue Router guard (auth + profile check), Login + Contact-admin views.
- **M4** Patients CRUD with debounced search, fixed-bottom pagination (100/page), soft delete, auto-numbered `legacy_client_no`. 523 real patients imported from xlsx.
- **M5** Inventory CRUD + non-sale movements (PURCHASE / ADJUSTMENT ±/ DAMAGE / EXPIRED) + stock + expiry badges. Added `category` (free-text, derived from maroon xlsx headers) and `notes` columns + supplier required. 483 real products imported from STOCKLIST.xlsx (top-level maroon categories + light-blue sub-categories joined as `HAIR SERUMS / MINOXIDIL` etc.).
- **M6** Sell flow via `sell_product` RPC: reusable PatientPicker, SellProductDialog, ShoppingCart icon on every product row + primary Sell button on detail page. Movement history now shows the patient name for SALE rows via embedded `select('*, patient:patients(id, name)')`.
- **M7** Visits with prescriptions via `create_visit_with_prescriptions` RPC. New `src/features/visits/` feature folder; reusable `ProductPicker` (in-stock filter on by default); `PrescriptionLines` multi-row editor with per-line stock check and duplicate-line guard; paginated newest-first `VisitsView`; `NewVisitView` form (supports `?patient_id=` UUID *or* `legacy_client_no` deep-link); `VisitDetailModal` resolves product names by reading `stock_movements` (source of truth) with embedded `product:products(...)`. Visit history card added to PatientDetailView.
- **M8** Dashboard with five parallel TanStack queries: Low Stock (via `products_low_stock` view, migration 0013), Expiring Soon (≤60d, with stock), Today's follow-ups, Upcoming follow-ups (next 3 days, full-row span, labels "Tomorrow" / "Day after tomorrow" / calendar form), Recent Sales (last 10). Accent borders/badges are state-driven — only light up when there's something to flag. Card palette mirrors the inventory `StockBadge` so dark-mode contrast stays readable.

Additional migrations beyond the original M2 set:
- `0007_patients_legacy_client_no.sql` — adds the int column + partial unique index, refreshes patients_active view
- `0008_auto_assign_legacy_client_no.sql` — BEFORE INSERT trigger that picks MAX+1 when blank
- `0009_rpc_create_product_with_stock.sql` — atomic create-product + initial PURCHASE (later superseded by 0011)
- `0010_products_category.sql` — adds the free-text category column + index
- `0011_products_notes.sql` — adds the notes column + recreates the RPC with `p_notes`
- `0012_products_supplier_required.sql` — backfills NULL suppliers to 'Unknown' and adds NOT NULL constraint
- `0013_view_products_low_stock.sql` — `products_low_stock` view (current_stock <= reorder_level AND reorder_level > 0); powers the M8 Low Stock card

Known issues to revisit:
- **Inventory search "doesn't filter"** symptom user reported on 2026-05-19 — no console errors. Needs DevTools Network-tab investigation when user encounters it again.

Remaining: **M9** (polish — finish), **M10** (hardening, optional). Canonical roadmap in [PLAN.md](./PLAN.md).

When in doubt about scope or design, defer to PLAN.md.

## Stack
- **Frontend**: **Vue 3 + Vite + TSX (mixed with SFC for shadcn-vue)** + TypeScript + Tailwind + shadcn-vue
- **Client state**: TanStack Query (Vue adapter) for server data + VeeValidate for forms + Zod for schemas/validation
- **Routing**: Vue Router (SPA) with `beforeEach` navigation guard for auth
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel or Cloudflare Pages (Vite SPA — both work) + Supabase (DB)

**Note on the stack:** original plan was Next.js + React; swapped to Vue 3 + Vite on day 2 because SEO is irrelevant for an internal tool and Vite SPA is simpler. TSX is used for app code (better TS inference); shadcn-vue components stay as SFC.

## Architecture pillars (do not violate without re-planning)

1. **Append-only `stock_movements` is the source of truth.** `products.current_stock` is a cache, maintained by a Postgres trigger. Movements are NEVER deleted — mistakes are corrected via `ADJUSTMENT` entries. UPDATE/DELETE on the table is denied by both a trigger and RLS.
2. **Atomic sell via Postgres RPC.** `sell_product()` uses `SELECT … FOR UPDATE` to prevent oversells. Quantity is **signed** (+ inflow / − outflow). Only one RPC for sales — other movement types (PURCHASE, ADJUSTMENT, DAMAGE, EXPIRED, PROCEDURE_USAGE) are plain inserts from the service layer; the trigger updates `current_stock` uniformly.
3. **Atomic visit-with-prescriptions via Postgres RPC.** `create_visit_with_prescriptions()` inserts the visit and runs `sell_product()` for each prescribed line in one transaction. Partial failures roll back the visit too. **This is the only way to create visits with prescriptions** — services do not directly INSERT into visits when prescriptions are involved.
4. **Multi-tenant from day one.** Every domain row carries `clinic_id`. A `current_user_clinic_id()` SQL helper drives RLS. Single clinic in MVP; adding more is operational, not a schema change.
5. **Tenant-scoped RLS from day one.** Future role checks (admin/doctor/receptionist/staff) slot in as an AND clause; they don't replace the tenant predicate. Roles live in `profiles.role`.
6. **Soft-delete invisible to readers.** Services query `patients_active` / `products_active` views (`security_invoker = true`). Base tables exist only for soft-delete UPDATEs and admin recovery. No `deleted_at is null` repetition in service code.
7. **Service-layer architecture.** Business logic lives in `src/features/*/services/*.ts`, not Vue components. Services take a `SupabaseClient<Database>` parameter — never import a singleton. This keeps them composable-callable and testable.
8. **`created_by_display` audit snapshot.** A BEFORE INSERT trigger reads `profiles.display_name` and stamps it on `visits` and `stock_movements`. Historical rows keep the old name even if the user is renamed or removed.
9. **No atomic multi-row writes outside RPCs.** Without server actions, every cross-row transaction must be a Postgres function. We have two (`sell_product`, `create_visit_with_prescriptions`). If a new flow needs multi-row atomicity, add another RPC — don't chain client-side mutations with manual rollback logic.

## Conventions

- **Feature folders**: `src/features/{auth,patients,inventory,visits,dashboard}` — each has `components/`, `composables/`, `services/`, `validations.ts`, `queryKeys.ts`, `types.ts`. (`composables/` is Vue's term for hooks.)
- **Single Supabase client**: `src/lib/supabase.ts`. No browser/server split since pure SPA. Uses Supabase's default `localStorage` session persistence.
- **Soft-delete reads**: query the `*_active` view. Only `softDelete()` and admin recovery touch base tables.
- **`clinic_id` on inserts**: services read it via `getCurrentClinicId(sb)` from `src/lib/clinic.ts`. RLS `with check` enforces correctness server-side regardless.
- **Error mapping**: PG error codes → user-facing messages in `src/lib/errors.ts`. Toasts via `vue-sonner` (or shadcn-vue Toast) render `onError` in mutations.
- **TanStack query keys**: per-feature factory in `queryKeys.ts` (e.g., `patientKeys.detail(id)`). Mutations invalidate at the right granularity.
- **Reactive query keys**: TanStack Query for Vue requires query keys to be `computed(() => [...])` if they depend on reactive inputs. Plain arrays won't refetch — common pitfall.
- **Forms**: VeeValidate + Zod via `@vee-validate/zod`. One schema per form, types derived via `z.infer<typeof Schema>`.
- **Mixed TSX/SFC**: shadcn-vue components stay as `.vue` SFC (as published). Feature components, views, and layout are `.tsx`. Both interop seamlessly. Use `@vue/babel-plugin-jsx` so `v-model={ref.value}` works in JSX.

## Schema quick reference

Tables: `clinics`, `profiles`, `patients`, `products`, `visits`, `stock_movements`.
Views: `patients_active`, `products_active` (filter `deleted_at is null`).
Key function: `current_user_clinic_id()` — returns `clinic_id` from the caller's profile, used in RLS.
RPCs (two):
- `sell_product(p_product_id, p_patient_id, p_visit_id, p_quantity, p_remarks)` — atomic single-product sell with FOR UPDATE lock
- `create_visit_with_prescriptions(p_patient_id, p_doctor_notes, p_treatment_details, p_followup_date, p_prescribed_products)` — atomic visit + multi-line sell

See PLAN.md → "Database Schema" for full column lists, indexes, SQL details, and RPC failure modes.

## Onboarding new staff users (manual, MVP)

1. Admin creates the user in the Supabase dashboard (Auth → Add User).
2. Admin runs in SQL Editor:
   ```sql
   insert into profiles (user_id, clinic_id, display_name, role)
   values ('<auth-user-uuid>', '<clinic-uuid>', 'Dr. Asha', 'doctor');
   ```

A user without a `profiles` row can log in but `current_user_clinic_id()` returns NULL → RLS rejects all reads/writes. The Vue Router `beforeEach` guard detects this and redirects to `/contact-admin`, so the user gets a clear screen instead of broken pages.

## Dev commands

**Not yet scaffolded.** Once M1 lands, the standard commands will be:
- `npm install` — install dependencies
- `npm run dev` — start Vite dev server at **localhost:5173**
- `npm run build` — production build
- `npm run preview` — serve the build locally
- `npm run lint` — ESLint
- `npm run db:types` — regenerate `src/types/database.ts` (to be added once Supabase project exists)

## Migrations

SQL files live under `supabase/migrations/`. Apply order (six files):
1. `0001_init.sql` — clinics, profiles, helper fn, enums, domain tables, active views
2. `0002_rpc_sell_product.sql` — atomic sell RPC
3. `0003_triggers_stock.sql` — cache trigger, display-name capture, append-only guards
4. `0004_rls.sql` — tenant-scoped policies
5. `0005_seed_dev.sql` — idempotent dev seed (one clinic + sample data)
6. `0006_rpc_create_visit_with_prescriptions.sql` — atomic visit + multi-line sell RPC

See `supabase/README.md` (to be created in M2) for the user onboarding snippet and apply instructions.

## Out of scope for MVP

- Appointments, billing/invoicing, WhatsApp reminders, prescription printing, before/after image uploads, multi-clinic UI, AI recommendations.
- Public signup, OAuth (admin creates users only).
- FEFO enforcement on sales (flagged in PLAN.md → Risks).
- Admin UI for user onboarding (manual SQL snippet for now).
- SSR / SEO (deliberately SPA — internal tool).
- Pinia (TanStack Query covers server state; add only if cross-page client state grows).
- E2E tests beyond M10 hardening.

## Reference

Full plan: **[PLAN.md](./PLAN.md)** — canonical scope, schema details, milestones, verification steps, and risk register.
