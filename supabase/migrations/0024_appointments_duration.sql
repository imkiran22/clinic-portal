-- Migration 0024: appointment duration for the calendar view
--
-- The Appointments calendar (day/week time grid) needs each block's
-- length — a 90-minute laser session and a 10-minute consult shouldn't
-- render the same. Existing rows default to 30 minutes.
--
-- Upper bound is 720 (the full 9:00–21:00 grid) so any resize the
-- calendar allows is a legal value; the client clamps to the same range.

alter table appointments
  add column duration_minutes int not null default 30
  check (duration_minutes between 5 and 720);

-- Same reason as 0019: `select *` was expanded when the view was
-- created, so the new column is invisible through appointments_active
-- until we recreate it.
drop view if exists appointments_active;
create view appointments_active
  with (security_invoker = true) as
  select * from appointments where deleted_at is null;
