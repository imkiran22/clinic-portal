-- Migration 0005: idempotent dev seed
-- One clinic, sample patients & products, a couple of consultation-only visits.
-- Re-running is a no-op once clinics has any row.
--
-- Profiles are NOT seeded here — they require a real auth.users row. See
-- supabase/README.md for the post-user-creation snippet.

do $$
declare
  v_clinic_id uuid;
begin
  if exists (select 1 from clinics) then
    raise notice 'Seed: clinics already exist, skipping.';
    return;
  end if;

  insert into clinics (name)
  values ('Define Skin Hair & Laser Clinic')
  returning id into v_clinic_id;

  -- Patients (5)
  insert into patients (clinic_id, name, age, gender, phone, email, address, notes) values
    (v_clinic_id, 'Asha Menon',     34, 'female', '9000000001', 'asha@example.com', 'Bangalore', null),
    (v_clinic_id, 'Rohit Sharma',   28, 'male',   '9000000002', null,               'Bangalore', null),
    (v_clinic_id, 'Priya Iyer',     41, 'female', '9000000003', null,               null,        'Sensitive skin'),
    (v_clinic_id, 'Karthik Rao',    52, 'male',   '9000000004', null,               null,        null),
    (v_clinic_id, 'Meera Pillai',   19, 'female', '9000000005', null,               null,        'New patient');

  -- Products: mix of healthy / low-stock / near-expiry / procedural consumable
  insert into products
    (clinic_id, name, sku, batch_number, expiry_date, supplier_name,
     cost_price, selling_price, current_stock, reorder_level) values
    (v_clinic_id, 'Sunscreen SPF 50',       'SUN-50',   'B-2026-01', current_date + interval '180 days', 'DermaSupplies',  450.00,  750.00, 40, 10),
    (v_clinic_id, 'Vitamin C Serum',        'VITC-30',  'B-2026-02', current_date + interval '30 days',  'DermaSupplies', 1200.00, 1800.00,  8, 10), -- low + expiring
    (v_clinic_id, 'Salicylic Acid Wash',    'SAL-150',  'B-2026-03', current_date + interval '300 days', 'GlowChem',       300.00,  550.00, 25, 15),
    (v_clinic_id, 'Retinol Cream 0.05%',    'RET-30',   'B-2026-04', current_date + interval '45 days',  'GlowChem',       800.00, 1500.00,  3,  5), -- low + expiring
    (v_clinic_id, 'Hyaluronic Moisturiser', 'HYA-50',   'B-2026-05', current_date + interval '500 days', 'DermaSupplies',  600.00, 1100.00, 20, 10),
    (v_clinic_id, 'Microneedling Tips',     'MN-T',     null,        null,                                'ProcedureCo',   1500.00, 3000.00, 50, 20);

  -- Two consultation-only visits (no SALE movements; those happen in-app via the RPCs).
  -- created_by is NULL — these are seed rows, not from a real user; the
  -- created_by_display trigger leaves it NULL accordingly.
  insert into visits (clinic_id, patient_id, doctor_notes, treatment_details, prescribed_products, followup_date)
  select
    v_clinic_id,
    (select id from patients where clinic_id = v_clinic_id and name = 'Asha Menon'),
    'Initial consultation. Mild acne.',
    'Recommended topical retinol + sunscreen.',
    '[]'::jsonb,
    current_date + interval '14 days';

  insert into visits (clinic_id, patient_id, doctor_notes, treatment_details, prescribed_products, followup_date)
  select
    v_clinic_id,
    (select id from patients where clinic_id = v_clinic_id and name = 'Priya Iyer'),
    'Follow-up. Skin tolerating retinol well.',
    'Continue regimen. Add hyaluronic moisturiser.',
    '[]'::jsonb,
    current_date + interval '30 days';

  raise notice 'Seed: created 1 clinic, 5 patients, 6 products, 2 visits.';
end$$;
