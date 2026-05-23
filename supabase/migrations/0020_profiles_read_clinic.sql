-- Migration 0020: let clinic members read each other's profiles
--
-- Until now `profiles_select_self` (in 0004_rls.sql) restricted SELECT
-- on profiles to the authenticated user's own row. That was fine while
-- the only thing the app did with profiles was answer "what's my
-- clinic_id / role?" — but with the appointments feature we now embed
-- profiles into appointment rows ("assigned doctor name") and have a
-- doctor-lookup picker that searches the whole clinic.
--
-- Both of those require reading other users' rows. Without this policy
-- the picker shows "No doctors on file" even when doctors exist, and
-- the appointment list shows a blank Doctor column.
--
-- Scope is intentionally narrow: same clinic only, SELECT only. No
-- cross-clinic reads, no INSERT/UPDATE/DELETE from app code.
-- Receptionists / staff can read clinical roles — useful so they can
-- confirm "I booked the patient with Dr. Saranya" without an admin.
--
-- PostgreSQL combines multiple permissive policies with OR, so the
-- existing `profiles_select_self` remains in force; this just widens
-- the read scope.

create policy profiles_select_clinic on profiles
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

-- After applying, refresh PostgREST so the embed resolves the new
-- visibility window. (Idempotent; safe to run on its own.)
notify pgrst, 'reload schema';
