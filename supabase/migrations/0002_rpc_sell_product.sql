-- Migration 0002: atomic sell-product RPC
-- Single-product sale with row-level lock and stock validation.
-- Called as supabase.rpc('sell_product', { ... }) from the app, and also
-- internally by create_visit_with_prescriptions (see 0006).

create or replace function sell_product(
  p_product_id uuid,
  p_patient_id uuid,
  p_visit_id   uuid,
  p_quantity   int,
  p_remarks    text default null
) returns stock_movements
language plpgsql
security invoker
as $$
declare
  v_clinic_id      uuid;
  v_stock          int;
  v_product_clinic uuid;
  v_movement       stock_movements;
begin
  v_clinic_id := current_user_clinic_id();
  if v_clinic_id is null then
    raise exception 'No clinic profile for current user'
      using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive'
      using errcode = '22023';
  end if;

  -- Row lock to prevent concurrent oversell across simultaneous sales.
  select current_stock, clinic_id
    into v_stock, v_product_clinic
    from products
    where id = p_product_id and deleted_at is null
    for update;

  if v_stock is null then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  if v_product_clinic <> v_clinic_id then
    raise exception 'product belongs to a different clinic'
      using errcode = '42501';
  end if;

  if v_stock < p_quantity then
    raise exception 'insufficient stock: have %, need %', v_stock, p_quantity
      using errcode = 'P0001';
  end if;

  insert into stock_movements
    (clinic_id, product_id, patient_id, visit_id,
     movement_type, quantity, remarks, created_by)
  values
    (v_clinic_id, p_product_id, p_patient_id, p_visit_id,
     'SALE', -p_quantity, p_remarks, auth.uid())
  returning * into v_movement;

  -- apply_stock_movement trigger (migration 0003) decrements products.current_stock.
  return v_movement;
end$$;

grant execute on function sell_product(uuid, uuid, uuid, int, text) to authenticated;
