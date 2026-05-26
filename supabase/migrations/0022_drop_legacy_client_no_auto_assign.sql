-- Migration 0022: drop the auto-assign trigger for patients.legacy_client_no
--
-- 0008 installed a BEFORE INSERT trigger that picked MAX+1 when staff
-- left Client # blank. In practice that introduced discrepancies — the
-- clinic keeps a paper register of client numbers, and staff would
-- type the next number from the register only to find the DB had
-- silently chosen a different one (e.g. when a row was soft-deleted
-- mid-sequence, or when two staff created patients close together).
--
-- The form now requires Client # explicitly (see PatientForm.tsx). To
-- guarantee that's the only path — no silent backfill via SQL imports,
-- the dashboard, or ad-hoc inserts — drop the trigger and function.
-- The unique partial index from 0007 still guards against duplicates
-- with a clean 23505 the app surfaces as "Client # already in use".

drop trigger if exists trg_patients_auto_client_no on patients;
drop function if exists set_next_legacy_client_no();
