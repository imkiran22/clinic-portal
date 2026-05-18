# Supabase

Database schema for the clinic portal. SQL migrations live in `migrations/` as numbered files. The Vue 3 SPA talks to Supabase via `@supabase/supabase-js`.

## Applying migrations to a fresh Supabase project

These files target a brand-new, empty Supabase project. They install Postgres extensions, types, tables, triggers, RLS policies, and seed data.

### Steps

1. Create a Supabase project at https://app.supabase.com (pick a region close to the clinic).
2. Open the project → **SQL Editor → New query**.
3. For each file in `migrations/` **in order**, paste the entire file contents into a new query and run:
   - `0001_init.sql` — extensions, enums, tenancy tables (clinics, profiles), domain tables (patients, products, visits, stock_movements), `current_user_clinic_id()` helper, active views (`patients_active`, `products_active`)
   - `0002_rpc_sell_product.sql` — atomic single-product sell with row-level lock
   - `0003_triggers_stock.sql` — `current_stock` cache trigger, display-name snapshot trigger, append-only guards
   - `0004_rls.sql` — tenant-scoped RLS policies (role-ready)
   - `0005_seed_dev.sql` — idempotent dev seed (one clinic, 5 patients, 6 products, 2 visits)
   - `0006_rpc_create_visit_with_prescriptions.sql` — atomic visit + multi-line sell RPC
4. Verify in **Table Editor**: you should see `clinics`, `profiles`, `patients`, `products`, `visits`, `stock_movements` and the views `patients_active` / `products_active`.

Sanity checks (Project → SQL Editor):
```sql
-- Six core tables + two views?
select table_name from information_schema.tables
  where table_schema = 'public'
  order by table_name;

-- Both RPCs present?
select proname from pg_proc
  where proname in ('sell_product','create_visit_with_prescriptions','current_user_clinic_id');

-- Seed data?
select count(*) from products;   -- expect 6
select count(*) from patients;   -- expect 5
select count(*) from visits;     -- expect 2
```

## Onboarding a new user (manual, MVP)

After applying migrations, no users have access yet — every domain table is protected by RLS that checks `current_user_clinic_id()`, which requires a `profiles` row.

To onboard a user:

1. **Authentication → Add User** in the Supabase dashboard. Create an email/password user. Copy the user's UUID from the user list.
2. **SQL Editor**:
   ```sql
   insert into profiles (user_id, clinic_id, display_name, role)
   values (
     '<paste auth user uuid>',
     (select id from clinics limit 1),   -- or the specific clinic id
     'Dr. Asha',
     'admin'                              -- one of: admin | doctor | receptionist | staff
   );
   ```

Once the profile row exists, the user can log in. Users *without* a profile are routed to `/contact-admin` by the M3 router guard rather than seeing broken pages.

## Schema overview

- **clinics, profiles** — tenancy. Single clinic in MVP, but the schema is multi-tenant from day one.
- **patients, products** — domain entities with soft-delete (`deleted_at`). Reads always go through the `patients_active` / `products_active` views.
- **visits** — `prescribed_products jsonb` captures the snapshot of what was prescribed; actual stock impact is recorded in `stock_movements`.
- **stock_movements** — append-only ledger. `quantity` is **signed**: positive for inflows (PURCHASE, ADJUSTMENT+), negative for outflows (SALE, USAGE, DAMAGE, EXPIRED, ADJUSTMENT−). The `apply_stock_movement` trigger keeps `products.current_stock` in sync.

## Append-only enforcement

`stock_movements` rejects UPDATE/DELETE via both layers:
- triggers (`0003_triggers_stock.sql` → `deny_modify_stock_movements`)
- RLS (`0004_rls.sql` has no UPDATE or DELETE policies)

Mistakes are corrected by recording a new `ADJUSTMENT` movement, never by editing past rows. Staff training accordingly.

## RPCs

Two atomic-multi-row operations live in Postgres:

- **`sell_product(p_product_id, p_patient_id, p_visit_id, p_quantity, p_remarks)`** — single-product sale; takes a `FOR UPDATE` row lock to prevent oversells, validates clinic match and stock, inserts a SALE movement with `quantity = -p_quantity`.
- **`create_visit_with_prescriptions(p_patient_id, p_doctor_notes, p_treatment_details, p_followup_date, p_prescribed_products)`** — inserts a visit then runs `sell_product()` for each prescribed line in the same transaction. Partial failures roll back the visit too.

All other movement types (PURCHASE, ADJUSTMENT, DAMAGE, EXPIRED, PROCEDURE_USAGE) are plain inserts into `stock_movements` from the service layer; the trigger handles the `current_stock` cache update uniformly.

## Generating TypeScript types

Once migrations are applied and you have the Supabase CLI installed (`brew install supabase/tap/supabase`):

```bash
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

Then update `src/lib/supabase.ts` to `createClient<Database>(...)` for full table/column type safety. For MVP we left the client untyped — wire types in M3 or M10 hardening.

## Error code cheatsheet (used by `src/lib/errors.ts`)

| code   | meaning in this app                       |
|--------|-------------------------------------------|
| P0001  | Business rule violated (insufficient stock, negative cache) — message has details |
| P0002  | Record not found                          |
| 22023  | Invalid input (bad jsonb shape, non-positive qty) |
| 23505  | Duplicate key (e.g., same SKU per clinic) |
| 23503  | Foreign-key violation (cannot delete referenced row) |
| 42501  | Authorization failure (no profile, cross-tenant) |
| 0A000  | Append-only violation (UPDATE/DELETE on stock_movements) |
