-- ============================================================
-- Onboard a new staff user
--
-- Steps:
--   1. Supabase Dashboard → Authentication → Users → "Add User".
--      Create the user with email + password (or invite by email).
--      Copy the new user's UUID from the user list.
--   2. Edit the four values in the `input` CTE below.
--   3. Run the whole script in the SQL Editor.
--
-- Safe to re-run: on conflict it updates display_name / role / clinic
-- for that user. The auth-user FK and the role CHECK constraint will
-- reject bad input at the DB level.
--
-- If you have more than one clinic and aren't sure which UUID to use:
--   select id, name from clinics;
-- ============================================================

with input as (
  select
    -- Paste the UUID from Authentication → Users
    '00000000-0000-0000-0000-000000000000'::uuid as user_id,

    -- Display name shown across the app (visits / sales attribution)
    'Dr. Asha'::text as display_name,

    -- One of: 'admin', 'doctor', 'receptionist', 'staff'
    'doctor'::text as role,

    -- Leave NULL if there's only one clinic (it auto-picks). Otherwise
    -- paste the clinic UUID from `select id, name from clinics`.
    null::uuid as clinic_id_override
),
resolved as (
  select
    i.user_id,
    i.display_name,
    i.role,
    coalesce(
      i.clinic_id_override,
      (select id from clinics order by created_at limit 1)
    ) as clinic_id
  from input i
)
insert into profiles (user_id, clinic_id, display_name, role)
select user_id, clinic_id, display_name, role from resolved
on conflict (user_id) do update
  set clinic_id    = excluded.clinic_id,
      display_name = excluded.display_name,
      role         = excluded.role
returning user_id, display_name, role, clinic_id, created_at;
