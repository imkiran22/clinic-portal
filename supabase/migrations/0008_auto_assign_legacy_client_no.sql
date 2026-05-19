-- Migration 0008: auto-assign legacy_client_no on insert + backfill existing NULLs
--
-- The xlsx import left some patients with NULL legacy_client_no (rows that had
-- '*' or blank CLIENT NUMBER in the source). This migration:
--   1. Backfills existing NULLs with MAX+1, MAX+2, ... ordered by created_at
--      (so the earliest patient gets the lowest new number).
--   2. Installs a BEFORE INSERT trigger so future creates auto-pick the next
--      number when legacy_client_no is left NULL.
--
-- The unique partial index (added in 0007) protects against rare race
-- conditions if two concurrent inserts compute the same number — the second
-- one fails with 23505 and the app can retry.

-- ============================================================
-- 1. Backfill existing NULLs, per clinic
-- ============================================================
do $$
declare
  v_clinic_id uuid;
  v_max int;
begin
  for v_clinic_id in
    select distinct clinic_id from patients where legacy_client_no is null
  loop
    select coalesce(max(legacy_client_no), 0)
      into v_max
      from patients
      where clinic_id = v_clinic_id;

    with numbered as (
      select id, v_max + row_number() over (order by created_at, id) as new_no
        from patients
        where clinic_id = v_clinic_id and legacy_client_no is null
    )
    update patients
      set legacy_client_no = numbered.new_no
      from numbered
      where patients.id = numbered.id;
  end loop;
end$$;

-- ============================================================
-- 2. Trigger: auto-assign on insert when NULL
-- ============================================================
create or replace function set_next_legacy_client_no() returns trigger
language plpgsql as $$
begin
  if NEW.legacy_client_no is null then
    select coalesce(max(legacy_client_no), 0) + 1
      into NEW.legacy_client_no
      from patients
      where clinic_id = NEW.clinic_id;
  end if;
  return NEW;
end$$;

create trigger trg_patients_auto_client_no
  before insert on patients
  for each row execute function set_next_legacy_client_no();
