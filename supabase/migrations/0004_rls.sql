-- Migration 0004: Row-Level Security policies
-- Tenant-scoped from day one via current_user_clinic_id().
-- Role checks (admin/doctor/etc.) are future work — they slot in as an AND clause
-- to existing policies, without replacing the tenant predicate.

alter table clinics         enable row level security;
alter table profiles        enable row level security;
alter table patients        enable row level security;
alter table products        enable row level security;
alter table visits          enable row level security;
alter table stock_movements enable row level security;

-- ============================================================
-- profiles: users see only their own row
-- (No INSERT/UPDATE/DELETE policies — administered via service_role.)
-- ============================================================
create policy profiles_select_self on profiles
  for select to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- clinics: users see only their own clinic
-- ============================================================
create policy clinics_select_own on clinics
  for select to authenticated
  using (id = current_user_clinic_id());

-- ============================================================
-- patients: tenant-scoped read + write
-- (No DELETE policy — hard delete is denied; use soft-delete via UPDATE deleted_at.)
-- ============================================================
create policy patients_select on patients
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

create policy patients_insert on patients
  for insert to authenticated
  with check (clinic_id = current_user_clinic_id());

create policy patients_update on patients
  for update to authenticated
  using (clinic_id = current_user_clinic_id())
  with check (clinic_id = current_user_clinic_id());

-- ============================================================
-- products: tenant-scoped read + write
-- ============================================================
create policy products_select on products
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

create policy products_insert on products
  for insert to authenticated
  with check (clinic_id = current_user_clinic_id());

create policy products_update on products
  for update to authenticated
  using (clinic_id = current_user_clinic_id())
  with check (clinic_id = current_user_clinic_id());

-- ============================================================
-- visits: tenant-scoped read + write
-- ============================================================
create policy visits_select on visits
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

create policy visits_insert on visits
  for insert to authenticated
  with check (clinic_id = current_user_clinic_id());

create policy visits_update on visits
  for update to authenticated
  using (clinic_id = current_user_clinic_id())
  with check (clinic_id = current_user_clinic_id());

-- ============================================================
-- stock_movements: tenant-scoped select; append-only insert
-- (No UPDATE/DELETE policies → denied by default; also enforced by triggers in 0003.)
-- ============================================================
create policy movements_select on stock_movements
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

create policy movements_insert on stock_movements
  for insert to authenticated
  with check (
    clinic_id = current_user_clinic_id()
    and created_by = auth.uid()
  );
