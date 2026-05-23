-- Migration 0019: assign a specific doctor to an appointment
--
-- Currently `appointments.created_by` snapshots who booked the row (often
-- the receptionist). That doesn't tell us who's actually seeing the
-- patient. Adding `assigned_doctor_id` so booking can specify the doctor
-- when it's known (e.g. patient asks for Dr. Saranya specifically).
--
-- Nullable on purpose — WhatsApp bookings often come in as "any
-- doctor today" and reception assigns later. The picker in the form
-- defaults to the current user when they're a doctor, so the common
-- case stays one click.

alter table appointments
  add column assigned_doctor_id uuid
  references profiles(user_id) on delete set null;

-- Index optimised for "show me today's roster for Dr. Saranya" queries
-- and the dashboard's per-doctor count if we add it later.
create index appointments_clinic_doctor_scheduled_idx
  on appointments (clinic_id, assigned_doctor_id, scheduled_at desc)
  where deleted_at is null;

-- Postgres expanded `select *` at view-creation time in 0018 and froze
-- the column list, so the new column doesn't appear in
-- appointments_active until we recreate the view. PostgREST also needs
-- this — without the column in the view, it can't resolve the
-- `assigned_doctor:profiles!...` embed through the view ("Could not find
-- a relationship between 'appointments_active' and 'profiles'").
drop view if exists appointments_active;
create view appointments_active
  with (security_invoker = true) as
  select * from appointments where deleted_at is null;
