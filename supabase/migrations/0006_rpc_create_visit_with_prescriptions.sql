-- Migration 0006: atomic visit + multi-line sell RPC
-- Inserts a visit and processes each prescribed_products line as a SALE,
-- rolling back the entire transaction on any failure (insufficient stock,
-- cross-clinic product, missing fields, etc.).
--
-- This is the ONLY way the app creates visits when prescriptions are involved.
-- For consultation-only visits, the app calls this RPC with an empty array.

create or replace function create_visit_with_prescriptions(
  p_patient_id          uuid,
  p_doctor_notes        text,
  p_treatment_details   text,
  p_followup_date       date,
  p_prescribed_products jsonb default '[]'::jsonb
) returns visits
language plpgsql
security invoker
as $$
declare
  v_clinic_id  uuid;
  v_visit      visits;
  v_line       jsonb;
  v_product_id uuid;
  v_quantity   int;
begin
  v_clinic_id := current_user_clinic_id();
  if v_clinic_id is null then
    raise exception 'No clinic profile for current user'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_prescribed_products) <> 'array' then
    raise exception 'prescribed_products must be a JSON array'
      using errcode = '22023';
  end if;

  insert into visits
    (clinic_id, patient_id, doctor_notes, treatment_details,
     prescribed_products, followup_date, created_by)
  values
    (v_clinic_id, p_patient_id, p_doctor_notes, p_treatment_details,
     p_prescribed_products, p_followup_date, auth.uid())
  returning * into v_visit;

  for v_line in select * from jsonb_array_elements(p_prescribed_products)
  loop
    v_product_id := (v_line->>'product_id')::uuid;
    v_quantity   := (v_line->>'quantity')::int;

    if v_product_id is null then
      raise exception 'prescribed_products line missing product_id'
        using errcode = '22023';
    end if;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'prescribed_products line quantity must be positive (got %)', v_quantity
        using errcode = '22023';
    end if;

    -- sell_product raises P0001 (insufficient stock), 42501 (cross-clinic
    -- or no profile), or P0002 (product not found). Any RAISE here aborts
    -- the entire transaction — both the visit insert above AND any earlier
    -- successful sells in this loop.
    perform sell_product(v_product_id, p_patient_id, v_visit.id, v_quantity, null);
  end loop;

  return v_visit;
end$$;

grant execute on function create_visit_with_prescriptions(uuid, text, text, date, jsonb)
  to authenticated;
