-- Migration 0001: extensions, tenancy, enums, domain tables, active views
-- Apply order: 0001 -> 0002 -> 0003 -> 0004 -> 0005 -> 0006

create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type movement_type as enum (
  'PURCHASE',
  'SALE',
  'PROCEDURE_USAGE',
  'DAMAGE',
  'EXPIRED',
  'ADJUSTMENT'
);

-- ============================================================
-- Tenancy & profiles
-- ============================================================
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete restrict,
  display_name text not null,
  role text not null default 'staff'
    check (role in ('admin','doctor','receptionist','staff')),
  created_at timestamptz not null default now()
);

create index profiles_clinic_id_idx on profiles (clinic_id);

-- Helper used by RLS policies and RPCs. Returns the clinic_id of the
-- currently authenticated user, or NULL if no profile is linked.
create or replace function current_user_clinic_id() returns uuid
language sql stable security invoker as $$
  select clinic_id from profiles where user_id = auth.uid();
$$;

-- ============================================================
-- patients
-- ============================================================
create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  name text not null,
  age int check (age between 0 and 130),
  gender text check (gender in ('male','female','other')),
  phone text not null,
  email text,
  address text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_clinic_name_idx on patients (clinic_id, lower(name));
create index patients_clinic_phone_idx on patients (clinic_id, phone);
create index patients_clinic_created_at_idx on patients (clinic_id, created_at desc);

-- ============================================================
-- products
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  name text not null,
  sku text,
  batch_number text,
  expiry_date date,
  supplier_name text,
  cost_price numeric(10,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(10,2) not null default 0 check (selling_price >= 0),
  current_stock int not null default 0,
  reorder_level int not null default 0 check (reorder_level >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- SKU is unique per clinic, not globally.
  unique (clinic_id, sku)
);

create index products_clinic_expiry_idx on products (clinic_id, expiry_date)
  where deleted_at is null;
create index products_clinic_stock_idx on products (clinic_id, current_stock)
  where deleted_at is null;

-- ============================================================
-- visits
-- ============================================================
create table visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  patient_id uuid not null references patients(id) on delete restrict,
  visit_date timestamptz not null default now(),
  doctor_notes text,
  treatment_details text,
  prescribed_products jsonb not null default '[]'::jsonb,
  followup_date date,
  created_by uuid references auth.users(id),
  created_by_display text,
  created_at timestamptz not null default now()
);

create index visits_clinic_patient_date_idx
  on visits (clinic_id, patient_id, visit_date desc);
create index visits_clinic_followup_idx on visits (clinic_id, followup_date)
  where followup_date is not null;

-- ============================================================
-- stock_movements (append-only ledger)
-- quantity is SIGNED: + for inflow (PURCHASE, ADJUSTMENT+),
--                      - for outflow (SALE, USAGE, DAMAGE, EXPIRED, ADJUSTMENT-)
-- ============================================================
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  patient_id uuid references patients(id) on delete restrict,
  visit_id uuid references visits(id) on delete restrict,
  movement_type movement_type not null,
  quantity int not null check (quantity <> 0),
  remarks text,
  created_by uuid references auth.users(id),
  created_by_display text,
  created_at timestamptz not null default now()
);

create index sm_clinic_product_date_idx
  on stock_movements (clinic_id, product_id, created_at desc);
create index sm_clinic_patient_idx on stock_movements (clinic_id, patient_id)
  where patient_id is not null;
create index sm_clinic_type_idx on stock_movements (clinic_id, movement_type);

-- ============================================================
-- Active views (centralize soft-delete filter)
-- Services read from these; base tables are only touched for
-- soft-delete writes and admin recovery.
-- security_invoker = true ensures RLS applies as the calling user.
-- ============================================================
create view patients_active with (security_invoker = true) as
  select * from patients where deleted_at is null;

create view products_active with (security_invoker = true) as
  select * from products where deleted_at is null;
