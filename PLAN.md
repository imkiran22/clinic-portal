# Dermatology Clinic Management Portal — Implementation Plan

## Context

We are building a greenfield web-based internal clinic management portal to replace Excel-based workflows for a dermatology/skin clinic. The system handles patient management, inventory/stock tracking with full audit history, product sales tracking, and treatment/visit notes. It is operational software for a small clinic staff (not an accounting ERP).

**Why now / what prompted this:** Excel is fragile, no audit trail, no concurrent use, and no expiry/low-stock visibility. The clinic needs a fast, mobile-responsive admin dashboard with minimal learning curve.

**Intended outcome:** An MVP of six modules — auth, patients, inventory, stock movements, visits, dashboard — deployable on Vercel + Supabase, with the architecture in place to add roles, appointments, billing, and analytics later without rework.

**Confirmed decisions (from user):**
- Stack: **Vue 3 + Vite + TSX** (mixed with SFC for shadcn-vue) + TS + Tailwind + shadcn-vue + TanStack Query (Vue adapter) + VeeValidate + Zod + Vue Router. **Pure SPA, no SSR.**
- Backend: Supabase (Postgres + Auth + Storage)
- No Supabase project yet — migrations delivered as SQL files
- Atomic sell-product via Postgres RPC (`sell_product()`)
- `prescribed_products` stored as **jsonb** on visits
- **Soft delete** on patients and products (`deleted_at`)
- **Admin creates users** via Supabase dashboard (no public signup)
- Stock_movements `quantity` is a **signed integer** (+ inflow, − outflow)

**Post-review decisions (architecture review):**
- **Multi-tenant ready from day one**: `clinic_id` on `patients`, `products`, `visits`, `stock_movements`. A `clinics` table is seeded with one row; MVP runs single-clinic but no migration is needed to add more.
- **`profiles` table** maps `auth.uid()` → `clinic_id` + `display_name` + `role`. Anchors both tenancy and future role checks.
- **RLS is tenant-scoped from day one** via a `current_user_clinic_id()` SQL helper. Future role checks add to (not replace) the tenant predicate.
- **Soft-delete filtering is centralized** in `patients_active` / `products_active` views (`security_invoker = true`). Services query the views, never the base tables (except for the soft-delete itself).
- **`created_by_display` snapshotted** on `visits` and `stock_movements`, auto-populated by a BEFORE INSERT trigger reading `profiles.display_name`. Survives staff turnover and renames.
- **New-staff onboarding** is a documented two-step manual flow for MVP: (1) admin creates user in Supabase dashboard, (2) admin runs an `INSERT INTO profiles (...)` snippet from `supabase/README.md`. Admin UI for this is post-MVP.

**Day-2 decisions (frontend stack swap, 2026-05-18):**
- **Frontend stack swapped from Next.js+React to Vue 3 + Vite + TSX.** Reason: SEO is irrelevant for an internal tool; a pure SPA is simpler and Vue's ecosystem is mature. TSX is preferred over Vue SFC for app code because of stronger TypeScript inference.
- **Mixed TSX/SFC layout**: shadcn-vue components stay as published SFC (`.vue` files) — zero porting work; the application's own feature components are TSX. They interop both directions. Enabled by `@vitejs/plugin-vue-jsx` + `@vue/babel-plugin-jsx` (the latter adds `v-model`/`v-on` to JSX).
- **Pure SPA**: no SSR, no middleware, no server actions. Vue Router with a `beforeEach` navigation guard replaces Next.js middleware for auth gating.
- **Atomic visit-with-prescriptions is now a Postgres RPC**: `create_visit_with_prescriptions()` inserts the visit and calls `sell_product()` for each line in one transaction. Replaces the Next.js server-action approach. Adds migration `0006_rpc_create_visit_with_prescriptions.sql`.
- **Single Supabase client** (browser only) — no SSR cookie handling required. Uses `@supabase/supabase-js` directly; no `@supabase/ssr`.
- **No Pinia in MVP**: TanStack Query covers server state; local component state is enough for forms (via VeeValidate). Add Pinia later if cross-page client state grows.

`/Users/kiran/work/clinic-portal/` (new directory). Working dir is not a git repo; the project will be its own repo (`git init` during M1).

---

## Architecture Summary

- **Pure SPA**: Vite-built Vue 3 app with Vue Router. No server, no SSR. Auth gate is a Vue Router `beforeEach` navigation guard.
- **Mixed TSX/SFC layout**: shadcn-vue components are SFC (`.vue`), application feature code is TSX. Enabled by `@vitejs/plugin-vue-jsx` + `@vue/babel-plugin-jsx`.
- **Feature-based** folder structure under `src/features/{auth,patients,inventory,visits,dashboard}` — each owning components, composables (Vue hooks), services, validations, queryKeys, types.
- **Service layer** takes the Supabase client as a parameter (never imports a singleton) — callable from composables, route loaders, and tests.
- **Source of truth** for stock is `stock_movements`; `products.current_stock` is a cache maintained by a Postgres trigger. The trigger is signed-quantity-aware: any insert updates `current_stock = current_stock + NEW.quantity`.
- **`sell_product()` RPC** handles validation (positive quantity, sufficient stock with `SELECT … FOR UPDATE` row lock) and inserts the movement with negative quantity. Other movement types (PURCHASE, ADJUSTMENT, DAMAGE, EXPIRED, PROCEDURE_USAGE) are plain inserts from the service layer — the trigger handles the cache update uniformly.
- **`create_visit_with_prescriptions()` RPC** atomically inserts a visit and runs `sell_product()` for each prescribed line. All-or-nothing — partial failures roll back the visit too. This replaces the Next.js server-action approach for cross-row transactions.
- **Append-only** stock_movements enforced two ways: triggers reject UPDATE/DELETE, and RLS denies them.
- **Tenancy from day one**: every domain row carries `clinic_id`. A `current_user_clinic_id()` helper reads from `profiles`; RLS uses it for tenant scoping. Adding a second clinic later is purely operational (insert + new profile rows) — no schema change.
- **Soft-delete is invisible to callers**: services query `patients_active` and `products_active` views; base tables exist only for soft-delete updates and admin recovery. No `deleted_at is null` repetition.
- **Audit readability**: `created_by_display` is auto-snapshotted by a trigger from `profiles.display_name` on insert into `visits` and `stock_movements`. Staff renames or departures don't blank out history.

---

## Folder Structure

```
clinic-portal/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql                          # extensions, enums, tables, indexes, views
│   │   ├── 0002_rpc_sell_product.sql              # sell_product() RPC
│   │   ├── 0003_triggers_stock.sql                # current_stock cache trigger + append-only guards
│   │   ├── 0004_rls.sql                           # RLS policies
│   │   ├── 0005_seed_dev.sql                      # idempotent dev seed
│   │   └── 0006_rpc_create_visit_with_prescriptions.sql  # atomic visit + multi-line sell
│   └── README.md                                   # apply order, onboarding snippet
├── index.html                                       # Vite entry
├── vite.config.ts                                   # vite + vue + vue-jsx + tailwind plugins
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── main.ts                                     # createApp + plugins + Vue Router + QueryClient + mount
│   ├── App.tsx                                     # root: <RouterView /> + <Toaster />
│   ├── router/
│   │   └── index.ts                                # routes + beforeEach auth+profile guard
│   ├── views/                                      # route-level components (TSX)
│   │   ├── LoginView.tsx
│   │   ├── ContactAdminView.tsx                    # shown when user has no profile row
│   │   ├── DashboardView.tsx
│   │   ├── PatientsView.tsx
│   │   ├── PatientDetailView.tsx
│   │   ├── InventoryView.tsx
│   │   ├── InventoryDetailView.tsx
│   │   ├── VisitsView.tsx
│   │   └── NewVisitView.tsx
│   ├── components/
│   │   ├── ui/                                     # shadcn-vue components (SFC, .vue)
│   │   ├── layout/{Sidebar,Topbar,AppShell}.tsx    # TSX
│   │   └── shared/{DataTable,ConfirmDialog,FormField}.tsx
│   ├── features/
│   │   ├── auth/{components,composables,services}
│   │   ├── patients/{components,composables,services,validations.ts,queryKeys.ts,types.ts}
│   │   ├── inventory/{components,composables,services,validations.ts,queryKeys.ts,types.ts}
│   │   ├── visits/{...}
│   │   └── dashboard/{components,services}
│   ├── lib/
│   │   ├── supabase.ts                             # single browser client (no SSR)
│   │   ├── query-client.ts                         # TanStack Query client instance
│   │   ├── errors.ts                               # PG code → user message
│   │   ├── clinic.ts                               # getCurrentClinicId(sb) helper
│   │   └── utils.ts                                # cn(), formatDate, etc.
│   ├── styles/
│   │   └── globals.css                             # Tailwind directives + shadcn-vue CSS vars
│   └── types/
│       └── database.ts                             # `supabase gen types` output (generated)
├── .env                                             # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .env.example
└── README.md
```

Notes:
- **`composables/`** is the Vue convention for what React calls hooks (e.g., `usePatients()` returns a TanStack Query reactive ref).
- **Single Supabase client** in `src/lib/supabase.ts` — no browser/server split since there's no server. Uses Supabase's default localStorage session persistence.
- **shadcn-vue components live in `src/components/ui/`** as published SFC. Don't port them to TSX.
- **`.env`** (not `.env.local`) because Vite reads `.env` by default. `VITE_` prefix is required for env vars exposed to client code.

---

## Database Schema (Migration Files)

### `0001_init.sql` — extensions, tenancy, enums, tables, views, indexes

**Extensions & enum**
- `create extension if not exists "pgcrypto"`
- `movement_type` enum: `PURCHASE`, `SALE`, `PROCEDURE_USAGE`, `DAMAGE`, `EXPIRED`, `ADJUSTMENT`

**Tenancy & profile tables**
- **`clinics`**: id (uuid pk), name, created_at. Seeded with one row in dev seed.
- **`profiles`**: user_id (PK, FK `auth.users` on delete cascade), clinic_id (FK clinics restrict), display_name (not null), role text default `'staff'` check in `('admin','doctor','receptionist','staff')`, created_at. Index on `clinic_id`.

**Helper function** (used by RLS and the sell RPC):
- `current_user_clinic_id()` returns `uuid`, `language sql stable security invoker`: `select clinic_id from profiles where user_id = auth.uid();`

**Domain tables** — every one carries `clinic_id uuid not null references clinics(id) on delete restrict`.
- **`patients`**: id, **`clinic_id`**, name, age (check 0–130), gender (check male/female/other), phone, email?, address?, notes, **`deleted_at`**, created_at, updated_at. Indexes on `(clinic_id, lower(name))`, `(clinic_id, phone)`, `(clinic_id, created_at desc)`.
- **`products`**: id, **`clinic_id`**, name, sku, batch_number, expiry_date, supplier_name, cost_price, selling_price (numeric(10,2)), **`current_stock` int (cache)**, reorder_level, **`deleted_at`**, created_at, updated_at. Unique `(clinic_id, sku)` (SKU unique *per clinic*, not globally). Partial indexes on `(clinic_id, expiry_date)` and `(clinic_id, current_stock)` where `deleted_at is null`.
- **`visits`**: id, **`clinic_id`**, patient_id (FK restrict), visit_date, doctor_notes, treatment_details, **`prescribed_products` jsonb default `'[]'`** storing `[{product_id, quantity, dosage?, instructions?}]`, followup_date, created_by (auth.users), **`created_by_display`** (text), created_at. Indexes on `(clinic_id, patient_id, visit_date desc)` and `(clinic_id, followup_date)` where followup_date is not null.
- **`stock_movements`**: id, **`clinic_id`**, product_id (FK restrict), patient_id (nullable FK), visit_id (nullable FK), movement_type, **`quantity int check (quantity <> 0)`** (signed), remarks, created_by, **`created_by_display`**, created_at. Indexes on `(clinic_id, product_id, created_at desc)`, `(clinic_id, patient_id)` partial, `(clinic_id, movement_type)`.

**Active views** (centralize soft-delete filter):
```sql
create view patients_active with (security_invoker = true) as
  select * from patients where deleted_at is null;
create view products_active with (security_invoker = true) as
  select * from products where deleted_at is null;
```
Services query `patients_active` and `products_active`. Base tables are used only for UPDATE (soft-delete) or admin recovery.

### `0002_rpc_sell_product.sql`

`sell_product(p_product_id, p_patient_id, p_visit_id, p_quantity, p_remarks)`:
1. Resolve `v_clinic_id := current_user_clinic_id()`. If null, raise `42501` (caller has no profile).
2. Validate `p_quantity > 0` else raise `22023`.
3. `SELECT current_stock, clinic_id … FOR UPDATE` on the product row, filtered `deleted_at is null`.
4. Raise `P0002` if product not found; raise `42501` if `product.clinic_id <> v_clinic_id` (cross-tenant guard); raise `P0001` if insufficient stock.
5. Insert into `stock_movements` with `clinic_id = v_clinic_id`, `quantity = -p_quantity`, `movement_type = 'SALE'`, `created_by = auth.uid()`. The `created_by_display` trigger fills the display name.
6. Return the new movement row (the apply trigger updates `current_stock`).

`SECURITY INVOKER` so RLS applies normally.

### `0003_triggers_stock.sql`

- `apply_stock_movement()` AFTER INSERT on stock_movements: `UPDATE products SET current_stock = current_stock + NEW.quantity, updated_at = now() WHERE id = NEW.product_id`. After update, re-check `current_stock >= 0` and raise `P0001` if not (safety net).
- `set_created_by_display()` BEFORE INSERT on `visits` and `stock_movements`: if `NEW.created_by_display IS NULL AND NEW.created_by IS NOT NULL`, populate from `(select display_name from profiles where user_id = NEW.created_by)`.
- `deny_modify()` BEFORE UPDATE and BEFORE DELETE on stock_movements: raise `0A000` ("stock_movements is append-only").

### `0004_rls.sql`

Enable RLS on `clinics`, `profiles`, `patients`, `products`, `visits`, `stock_movements`.

**Profiles** (users see only their own row):
- SELECT: `using (user_id = auth.uid())`
- (No INSERT/UPDATE/DELETE policies — only the admin path via Supabase dashboard / SQL editor with service role.)

**Clinics** (users see their own clinic):
- SELECT: `using (id = current_user_clinic_id())`

**Domain tables** (`patients`, `products`, `visits`) — tenant-scoped read/write:
- SELECT/INSERT/UPDATE: `using (clinic_id = current_user_clinic_id())` and matching `with check`.

**stock_movements**:
- SELECT: `using (clinic_id = current_user_clinic_id())`
- INSERT: `with check (clinic_id = current_user_clinic_id() and created_by = auth.uid())`
- No UPDATE/DELETE policies (deny by default; matches the append-only trigger).

Future role upgrade path documented inline: a role check is an AND-clause added to the existing policy `using` (e.g., `and exists (select 1 from profiles where user_id = auth.uid() and role in ('admin','doctor'))`) — the tenant predicate stays in place.

### `0005_seed_dev.sql`

Idempotent (`if not exists (select 1 from clinics) then …`). Inserts:
- One `clinics` row (e.g., "Demo Skin Clinic").
- ~6 products (mix of healthy / low-stock / near-expiry), 5 patients, 2–3 visits with `prescribed_products` examples — all scoped to the seeded clinic.

Profiles are **not** seeded here (they require a real `auth.users` row). See `supabase/README.md` for the post-user-creation snippet.

### `0006_rpc_create_visit_with_prescriptions.sql`

`create_visit_with_prescriptions(p_patient_id, p_doctor_notes, p_treatment_details, p_followup_date, p_prescribed_products jsonb)` — atomic visit creation + multi-line sell, all in one transaction.

```text
1. v_clinic_id := current_user_clinic_id();  raise 42501 if null.
2. Validate p_prescribed_products is a JSON array (raise 22023 if not).
3. INSERT into visits with clinic_id, patient_id, notes, treatment_details, prescribed_products, followup_date, created_by = auth.uid().
   → trigger fills created_by_display
   → RETURNING id INTO v_visit_id
4. FOR each line in p_prescribed_products:
     - extract product_id (uuid) and quantity (int)
     - validate both present and quantity > 0
     - PERFORM sell_product(product_id, p_patient_id, v_visit_id, quantity, '');
       (any RAISE inside sell_product bubbles up and aborts the txn)
5. RETURN the inserted visit row.
```

`SECURITY INVOKER` so RLS applies. If `prescribed_products` is empty, only the visit is created — no sells (still useful for consultation-only visits).

Failure modes that roll back the whole transaction:
- Caller has no profile (`42501`)
- prescribed_products not an array (`22023`)
- Any line missing product_id or quantity (`22023`)
- Any line has insufficient stock (`P0001`)
- Any line's product belongs to a different clinic (`42501`)

This RPC is the **only** way the app creates visits with prescriptions — services do not insert into visits directly when prescriptions are involved. (Plain visit creation without prescriptions could call a simpler insert, but for MVP simplicity we route all visit creates through this RPC; `p_prescribed_products = '[]'` is the no-prescription case.)

---

## Service Layer Pattern

Services take a `SupabaseClient<Database>` as parameter (same pattern as before — framework-agnostic):

```ts
// src/features/inventory/services/inventoryService.ts
export const inventoryService = {
  list(sb) { /* select * from products_active */ },                // view, not base table
  create(sb, input) { /* insert into products (clinic_id auto via RLS check) */ },
  softDelete(sb, id) { /* update products set deleted_at = now() */ },
  recordMovement(sb, input) { /* insert stock_movement directly (PURCHASE/ADJUSTMENT/...) */ },
  sellProduct(sb, args) { /* sb.rpc('sell_product', {...}) */ },
};

// src/features/visits/services/visitService.ts
export const visitService = {
  listForPatient(sb, patientId) { /* select * from visits where patient_id = ? */ },
  createWithPrescriptions(sb, input) {
    /* sb.rpc('create_visit_with_prescriptions', {
         p_patient_id, p_doctor_notes, p_treatment_details,
         p_followup_date, p_prescribed_products
       }) */
  },
};
```

**Composables** (Vue equivalent of hooks) wrap services with TanStack Query:

```ts
// src/features/patients/composables/usePatients.ts
import { useQuery } from '@tanstack/vue-query';
import { patientService } from '../services/patientService';
import { patientKeys } from '../queryKeys';
import { supabase } from '@/lib/supabase';

export function usePatients(search: Ref<string>) {
  return useQuery({
    queryKey: computed(() => patientKeys.list({ q: search.value })),
    queryFn: () => patientService.list(supabase, search.value),
  });
}
```

Note the **reactive query key** — TanStack Query for Vue takes reactive refs/computeds so the query auto-refetches when inputs change.

**Soft-delete is invisible to readers**: list/detail queries hit `patients_active` / `products_active` views — services never write `deleted_at is null` themselves. Only `softDelete()` and an admin recovery method touch the base tables.

**`clinic_id` on inserts**: services read it from the user's profile via `getCurrentClinicId(sb)` in `src/lib/clinic.ts` and pass it in inserts. RLS `with check (clinic_id = current_user_clinic_id())` enforces correctness server-side regardless.

Per-feature `queryKeys.ts` factories (e.g., `patientKeys.detail(id)`) keep invalidation precise.

`lib/errors.ts` maps PG codes (`P0001` → message; `23505` → "Duplicate"; `23503` → "Cannot delete — referenced elsewhere"; `42501` → "Not authorized"; default → "Something went wrong") and toasts (`vue-sonner` or `shadcn-vue` Toast) render them in mutation `onError`.

---

## Auth

- Email/password Supabase Auth, no signup page, no OAuth.
- **Single Supabase client** (`src/lib/supabase.ts`) using `@supabase/supabase-js`. Session is persisted in `localStorage` (Supabase default). `auth.onAuthStateChange` is wired in `main.ts` to invalidate TanStack Query caches on sign-out.
- **Two-step user onboarding** (manual, MVP):
  1. Admin creates the user in the Supabase dashboard (Auth → Add User).
  2. Admin runs the one-line snippet from `supabase/README.md`:
     ```sql
     insert into profiles (user_id, clinic_id, display_name, role)
     values ('<auth-user-uuid>', '<clinic-uuid>', 'Dr. Asha', 'doctor');
     ```
  A user without a `profiles` row can log in but `current_user_clinic_id()` returns NULL, so RLS rejects all reads/writes — the app detects this in the router guard and redirects to `/contact-admin`.
- **Vue Router navigation guard** (in `src/router/index.ts`):
  ```ts
  router.beforeEach(async (to) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (to.meta.public) return true;              // /login, /contact-admin
    if (!session) return { name: 'login' };
    // verify profile exists (cheap, one row)
    const { data: profile } = await supabase
      .from('profiles').select('clinic_id').eq('user_id', session.user.id).maybeSingle();
    if (!profile) return { name: 'contact-admin' };
    return true;
  });
  ```
  Routes mark public ones with `meta: { public: true }`. The guard runs on every navigation, including the initial load.
- **Sign-out**: `supabase.auth.signOut()` then `router.push({ name: 'login' })`. Triggered from the topbar dropdown.

---

## UI Plan

- **AppShell** (`src/components/layout/AppShell.tsx`): collapsible left sidebar (Dashboard / Patients / Inventory / Visits), topbar with user avatar + sign-out, main content area (`<RouterView />`), single `<Toaster />`.
- **Mobile**: sidebar collapses into a `Sheet`. Tables degrade to card lists below `md`.
- **DataTable**: one shared wrapper in `components/shared/DataTable.tsx` built on TanStack Table (Vue adapter) + shadcn-vue Table primitives.
- **Pages** (routes in `src/router/index.ts`):
  - `/login` → `LoginView` (public)
  - `/contact-admin` → `ContactAdminView` (public; shown when authed user lacks a profile)
  - `/dashboard` → `DashboardView` — 4 cards (Low Stock, Expiring ≤60d, Today's Follow-ups, Recent Sales)
  - `/patients` → `PatientsView` — searchable table + "New Patient" dialog
  - `/patients/:id` → `PatientDetailView` — profile + visit history tabs + purchased products tab
  - `/inventory` → `InventoryView` — table with stock badges + "Add Product" / "Record Movement" actions
  - `/inventory/:id` → `InventoryDetailView` — product detail + movement history
  - `/visits` → `VisitsView` — list of visits with patient + date
  - `/visits/new` → `NewVisitView` — patient picker + notes + multi-row prescribed-products picker; **submit calls `visitService.createWithPrescriptions()` which invokes the `create_visit_with_prescriptions` RPC**. All lines succeed or all are rolled back; toast shows the precise failure (insufficient stock for X, etc.).

shadcn-vue components to install upfront: button, input, label, form, textarea, select, table, dialog, sheet, dropdown-menu, card, badge, sonner (or toast), tabs, separator, skeleton, avatar, alert-dialog, popover, calendar, tooltip.

---

## Milestones (ordered, each demoable)

1. **M1 — Scaffolding & shell.** `npm create vite@latest clinic-portal -- --template vue-ts`, install Vue plugins (`@vitejs/plugin-vue`, `@vitejs/plugin-vue-jsx`), Tailwind, shadcn-vue init, Vue Router, TanStack Query (Vue), VeeValidate + Zod, deps. AppShell + dummy views routed. `git init`.
2. **M2 — Migrations authored.** All **six** SQL files written and reviewed. No app wiring.
3. **M3 — Supabase wiring + Auth.** Single browser client, Vue Router `beforeEach` guard (auth + profile check), `LoginView`, `ContactAdminView`. User provides Supabase URL + anon key in `.env`; admin-creates a test user and a profile.
4. **M4 — Patients CRUD.** List with search (TanStack Query + reactive query key), create/edit dialog, detail page (no visit tab yet).
5. **M5 — Inventory CRUD + non-sale movements.** Product list with stock badges, add/edit product, "Record Movement" dialog for PURCHASE/ADJUSTMENT/DAMAGE/EXPIRED.
6. **M6 — Sell flow via RPC.** "Sell" action on product row that picks a patient; calls `sell_product` RPC; oversell rejected with clean toast.
7. **M7 — Visits with prescriptions.** Visit form with multi-row prescribed-products picker; submit calls `create_visit_with_prescriptions` RPC — all lines succeed or all roll back.
8. **M8 — Dashboard.** Four cards backed by `dashboardService` (parallel TanStack queries).
9. **M9 — Polish.** Loading skeletons, empty states, mobile pass, error boundary, 404.
10. **M10 — Hardening (optional).** Generated `database.ts` types, basic Playwright e2e for login + sell, deploy preview (Vercel or Cloudflare Pages — both work for a Vite SPA).

---

## Critical Files (to be created)

- [supabase/migrations/0001_init.sql](clinic-portal/supabase/migrations/0001_init.sql) — clinics, profiles, helper fn, enums, domain tables with `clinic_id` + `created_by_display`, active views
- [supabase/migrations/0002_rpc_sell_product.sql](clinic-portal/supabase/migrations/0002_rpc_sell_product.sql) — atomic sell RPC with `FOR UPDATE` lock + cross-tenant guard
- [supabase/migrations/0003_triggers_stock.sql](clinic-portal/supabase/migrations/0003_triggers_stock.sql) — current_stock cache trigger, display-name capture trigger, append-only guards
- [supabase/migrations/0004_rls.sql](clinic-portal/supabase/migrations/0004_rls.sql) — tenant-scoped policies (role-ready)
- [supabase/migrations/0005_seed_dev.sql](clinic-portal/supabase/migrations/0005_seed_dev.sql) — idempotent dev seed (one clinic + sample data)
- [supabase/migrations/0006_rpc_create_visit_with_prescriptions.sql](clinic-portal/supabase/migrations/0006_rpc_create_visit_with_prescriptions.sql) — atomic visit + multi-line sell RPC
- [supabase/README.md](clinic-portal/supabase/README.md) — apply order + new-user onboarding snippet
- [vite.config.ts](clinic-portal/vite.config.ts) — Vite + vue + vue-jsx plugins, path alias `@` → `src`
- [src/main.ts](clinic-portal/src/main.ts) — createApp, register router, query client, mount #app
- [src/App.tsx](clinic-portal/src/App.tsx) — root `<RouterView />` + `<Toaster />`
- [src/router/index.ts](clinic-portal/src/router/index.ts) — routes + `beforeEach` auth + profile guard
- [src/lib/supabase.ts](clinic-portal/src/lib/supabase.ts) — single browser Supabase client
- [src/lib/query-client.ts](clinic-portal/src/lib/query-client.ts) — TanStack Query client instance
- [src/lib/errors.ts](clinic-portal/src/lib/errors.ts) — PG error code → user message
- [src/lib/clinic.ts](clinic-portal/src/lib/clinic.ts) — `getCurrentClinicId(sb)` helper used by service inserts
- [src/features/inventory/services/inventoryService.ts](clinic-portal/src/features/inventory/services/inventoryService.ts) — `sellProduct`, `recordMovement`, `list` (queries `products_active`)
- [src/features/visits/services/visitService.ts](clinic-portal/src/features/visits/services/visitService.ts) — `createWithPrescriptions` (calls the new RPC)
- [src/components/layout/AppShell.tsx](clinic-portal/src/components/layout/AppShell.tsx) — sidebar + topbar shell wrapping `<RouterView />`

---

## Verification

End-to-end checks at each milestone:

- **M1**: `npm run dev` → app loads at **localhost:5173** (Vite default), sidebar nav renders, dummy routes navigate.
- **M2**: SQL files apply cleanly to a fresh Supabase project via SQL Editor in this order: 0001 → 0002 → 0003 → 0004 → 0005 → 0006. Verify `select * from products limit 5;` returns seeded rows; `select proname from pg_proc where proname in ('sell_product','create_visit_with_prescriptions');` returns both.
- **M3**: Hitting `/dashboard` while logged out → router guard redirects to `/login`. Logging in with a Supabase-dashboard-created user (with a `profiles` row) lands on `/dashboard`. A user *without* a profile row gets routed to `/contact-admin`, not a broken dashboard. Sign-out clears session and lands on `/login`.
- **Tenant isolation smoke test (post-M3)**: insert a second clinic + a second profile pointing to it via SQL. Log in as user A — only clinic A's data is visible; flip to user B — only clinic B's. Try to fetch a clinic-A row by ID while logged in as user B → returns empty (RLS).
- **M4**: Create a patient via dialog; search finds them by name and phone (reactive query key refetches as you type); edit persists; detail page renders.
- **M5**: Add a product; "Record Movement" with `PURCHASE +50` makes `current_stock` go up; `ADJUSTMENT -10` makes it go down; movement history shows both rows. Try to UPDATE a stock_movement via SQL → rejected with `0A000`.
- **M6**: Sell 1 unit of a product with 1 in stock → success, stock = 0. Try to sell again → toast says "insufficient stock". Open two browser tabs, click sell at the same time on a product with 1 in stock → exactly one succeeds (FOR UPDATE proven).
- **M7 — atomic visit test**: Create a visit prescribing 2 products where the *second* has insufficient stock. Expected: the **entire** transaction rolls back — no visit row, no movement for line 1 — and the toast names the failing product. Then retry with valid stock → visit + 2 movements created, all linked.
- **M8**: Dashboard cards render expected data: low-stock products appear, today's followups match seeded data, recent sales reflect M6/M7 actions.
- **M9**: Resize to 375px width — sidebar collapses to drawer, tables become cards, no horizontal scroll.

Manual smoke test before deploy: complete the full clinical workflow — register patient → create visit → prescribe 2 products → see stock decrement → confirm patient detail shows the visit and purchased products → confirm dashboard reflects everything.

---

## Risks & Notes

- **`current_stock` drift.** Concurrent writes are handled by `FOR UPDATE` in `sell_product()` and a trigger-level negative-stock guard. If a manual SQL fix ever corrupts the cache, a future `reconcile_stock(product_id)` RPC can recompute `SUM(quantity)` from movements. Not in MVP.
- **Append-only stock_movements.** Fat-fingered quantities are corrected via `ADJUSTMENT` entries, never edits. This is intentional per the spec. Train staff accordingly.
- **`prescribed_products` jsonb.** Good for MVP. If reporting later needs "all patients prescribed product X" as a hot query, promote to a relational `visit_prescriptions` table (small migration).
- **Soft-delete centralized in views.** All reads go through `*_active`. Risk: a developer reaches around the view and queries the base table directly. Mitigation: lint guidance + code review; only the `softDelete()` service method should ever touch the base tables for writes other than create.
- **Profile required for writes.** A logged-in user without a `profiles` row triggers RLS rejection on every insert/update. App must detect missing profile (null from `current_user_clinic_id()`) and show a "Contact admin" gate rather than failing silently inside a form submit. Documented in M3.
- **`created_by_display` is a snapshot.** If a staff member's display name is updated in `profiles` later, historical rows still show the old name. This is the intended behavior (audit fidelity). If you want "current name" instead, join to `profiles` on `created_by` at read time.
- **Cross-tenant cross-checks.** `sell_product()` validates that the product's `clinic_id` matches the caller's clinic — defense in depth, since RLS would have already filtered it out. Worth keeping; cheap.
- **FEFO not enforced** for sales — the product picker shows all in-stock products. If clinic policy is oldest-batch-first, sort by `expiry_date asc` in the picker; flag if needed.
- **Service role key** only used in `scripts/seed.ts` (Node-only) if/when added. Never imported under `src/`.
- **Types drift.** `database.ts` is generated post-migrations; until then, services use looser types. Add `npm run db:types` script when Supabase exists.
- **Vue 3 + TSX is a minority path.** Most Vue tutorials/StackOverflow show SFC. Expect to translate examples from SFC to TSX syntax mentally — especially `v-model` (use `@vue/babel-plugin-jsx` so `v-model={ref.value}` works in JSX), slots (render functions instead of `<template #name>`), and directives. The base reactivity APIs (`ref`, `reactive`, `computed`, `watch`) are identical.
- **SPA loading flash.** First navigation paints empty until TanStack Query resolves the initial fetch. Mitigate with route-level `<Skeleton />` placeholders. Acceptable for staff who log in once per day.
- **No atomic multi-row writes outside RPCs.** Without server actions, every cross-row transaction must be a Postgres function (we have two: `sell_product`, `create_visit_with_prescriptions`). If a new flow needs multi-row atomicity, add another RPC — don't try to chain client-side mutations with rollback logic.
- **TanStack Query for Vue takes reactive keys.** Query keys are computed refs (`computed(() => […])`) so refetches happen automatically when inputs change. Forgetting `computed()` and passing a raw array means the query never refetches — common pitfall to watch for in code review.
