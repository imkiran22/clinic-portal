-- Migration 0007: add legacy_client_no column to patients
-- Captures the CLIENT NUMBER from the prior Excel-based system so staff
-- can search/look up patients by their original number. Nullable because
-- newly-created patients won't have one. Unique per clinic.

alter table patients
  add column legacy_client_no int;

create unique index patients_clinic_legacy_no_idx
  on patients (clinic_id, legacy_client_no)
  where legacy_client_no is not null;

-- View was defined with `select *` at creation time, which expands to the
-- columns that existed then. Recreate so the new column is visible.
create or replace view patients_active with (security_invoker = true) as
  select * from patients where deleted_at is null;
