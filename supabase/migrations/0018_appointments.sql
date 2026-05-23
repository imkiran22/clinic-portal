-- Migration 0018: appointments — light tracker to replace the paper diary
--
-- Staff currently keep daily appointments on a paper page (photographed +
-- WhatsApp'd). This brings the diary into the portal: one row per booked
-- appointment, with status transitions and a "convert to visit" workflow.
-- Booking itself stays on WhatsApp — this is just the operational log.
--
-- Shape mirrors visits (clinic-scoped, append-with-audit, soft-deletable
-- by privileged users only). Conversion to a visit happens client-side
-- (NewVisitView fires an UPDATE after the visit insert) — no extra RPC.

-- ============================================================
-- 1. Enum
-- ============================================================
create type appointment_status as enum ('scheduled', 'done', 'cancelled');

-- ============================================================
-- 2. Table
-- ============================================================
create table appointments (
  id                    uuid primary key default gen_random_uuid(),
  clinic_id             uuid not null references clinics(id) on delete restrict,
  patient_id            uuid not null references patients(id) on delete restrict,
  scheduled_at          timestamptz not null,
  treatment_description text not null,
  session_number        int,
  status                appointment_status not null default 'scheduled',
  notes                 text,
  -- Filled when the appointment is converted; ON DELETE SET NULL so a
  -- deleted visit leaves the appointment intact but unlinked.
  visit_id              uuid references visits(id) on delete set null,
  created_by            uuid references auth.users(id),
  created_by_display    text,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================
create index appointments_clinic_scheduled_idx
  on appointments (clinic_id, scheduled_at desc);

create index appointments_clinic_patient_scheduled_idx
  on appointments (clinic_id, patient_id, scheduled_at desc);

create index appointments_clinic_status_idx
  on appointments (clinic_id, status)
  where deleted_at is null;

-- Today's-list dashboard hot path: "find me scheduled appointments
-- whose time falls in this calendar day, for this clinic, fast."
create index appointments_clinic_scheduled_today_idx
  on appointments (clinic_id, scheduled_at)
  where status = 'scheduled' and deleted_at is null;

-- ============================================================
-- 4. Soft-delete view
-- ============================================================
create view appointments_active with (security_invoker = true) as
  select * from appointments where deleted_at is null;

-- ============================================================
-- 5. RLS — all roles can SELECT + INSERT + UPDATE within their tenant.
--    Soft-delete (setting deleted_at) is further gated by a trigger
--    that checks is_privileged_user() — same pattern as patients and
--    products in migration 0014.
-- ============================================================
alter table appointments enable row level security;

create policy appointments_select on appointments
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

create policy appointments_insert on appointments
  for insert to authenticated
  with check (clinic_id = current_user_clinic_id());

create policy appointments_update on appointments
  for update to authenticated
  using (clinic_id = current_user_clinic_id())
  with check (clinic_id = current_user_clinic_id());

-- No DELETE policy — hard delete denied by default.

-- ============================================================
-- 6. Soft-delete guard — receptionist / staff can update freely but
--    can't flip deleted_at from NULL → not-NULL. Mirrors 0014's
--    patient / product guards.
-- ============================================================
create or replace function block_unauthorized_appointment_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if NEW.deleted_at is not null
     and OLD.deleted_at is null
     and not is_privileged_user() then
    raise exception 'Only doctors or admins can remove appointments'
      using errcode = '42501';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_appointments_block_unauthorized_soft_delete on appointments;
create trigger trg_appointments_block_unauthorized_soft_delete
  before update on appointments
  for each row execute function block_unauthorized_appointment_soft_delete();

-- ============================================================
-- 7. created_by_display snapshot trigger — reuse the existing function
--    from 0003 so renames in profiles don't blank historical rows.
-- ============================================================
drop trigger if exists trg_appointments_set_display on appointments;
create trigger trg_appointments_set_display
  before insert on appointments
  for each row execute function set_created_by_display();
