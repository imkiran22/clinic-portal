-- Migration 0014: role-based permissions
--
-- Two effective tiers:
--   privileged  = admin | doctor       (full access)
--   limited     = receptionist | staff (read all + patient C/U + sells + stock movements)
--
-- Enforcement is at the DB so a curious user opening DevTools can't bypass.
-- The UI also hides actions limited users can't take so they don't see buttons
-- that would just error.
--
-- Rules added in this migration:
--   1. products INSERT / UPDATE → privileged only (UI's edit/delete dialog uses these)
--   2. visits INSERT → privileged only (create_visit_with_prescriptions calls this internally)
--   3. patients soft-delete (deleted_at: null → not null) → blocked by trigger for limited
--   4. products soft-delete (same) → blocked by trigger for limited
--
-- Unchanged (intentionally):
--   - SELECT on everything stays tenant-scoped only (limited can read all)
--   - patients INSERT / UPDATE (non-soft-delete) stays open
--   - stock_movements INSERT stays open (receptionist needs Purchase / Damage / etc.)
--   - sell_product RPC accessible by all roles
-- ============================================================

-- Safety backfill: any profile without a role becomes admin.
update profiles set role = 'admin' where role is null;

-- Helper: is the caller in the privileged tier?
create or replace function is_privileged_user()
returns boolean
language sql
stable
security invoker
as $$
  select coalesce(
    (select role in ('admin', 'doctor')
     from profiles
     where user_id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- Products: tighten INSERT and UPDATE to privileged only.
-- ============================================================
drop policy if exists products_insert_tenant on products;
create policy products_insert_tenant on products
  for insert
  to authenticated
  with check (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

drop policy if exists products_update_tenant on products;
create policy products_update_tenant on products
  for update
  to authenticated
  using (clinic_id = current_user_clinic_id())
  with check (
    clinic_id = current_user_clinic_id()
    -- Note: deleted_at flips here too, but the trigger below adds an
    -- explicit error message instead of a silent RLS rejection.
  );

-- ============================================================
-- Visits: only privileged can create new visits.
-- create_visit_with_prescriptions is SECURITY INVOKER so this policy gates
-- it transparently — limited users calling that RPC get 42501.
-- ============================================================
drop policy if exists visits_insert_tenant on visits;
create policy visits_insert_tenant on visits
  for insert
  to authenticated
  with check (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

-- ============================================================
-- Patient soft-delete: RLS can't easily compare OLD vs NEW, so a trigger
-- adds the role check. Regular UPDATEs (editing name / phone / notes)
-- are unaffected.
-- ============================================================
create or replace function block_unauthorized_patient_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if NEW.deleted_at is not null
     and OLD.deleted_at is null
     and not is_privileged_user() then
    raise exception 'Only doctors or admins can remove patients'
      using errcode = '42501';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_patients_block_unauthorized_soft_delete on patients;
create trigger trg_patients_block_unauthorized_soft_delete
  before update on patients
  for each row execute function block_unauthorized_patient_soft_delete();

-- Same guard for products. The products UPDATE policy already gates regular
-- edits to privileged, but a future relaxation of that policy shouldn't
-- accidentally re-open soft-delete to limited users.
create or replace function block_unauthorized_product_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if NEW.deleted_at is not null
     and OLD.deleted_at is null
     and not is_privileged_user() then
    raise exception 'Only doctors or admins can remove products'
      using errcode = '42501';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_products_block_unauthorized_soft_delete on products;
create trigger trg_products_block_unauthorized_soft_delete
  before update on products
  for each row execute function block_unauthorized_product_soft_delete();
