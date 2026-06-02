-- Migration 0023: backdate fields for products, categories, and visits
--
-- Staff often record events a day or two after they happen (a doctor writes
-- up a visit the morning after; stock that arrived Friday gets entered on
-- Monday; a category gets added retroactively to cover stock from last
-- week). Without an explicit date field, the row's created_at is stamped
-- at insert time and the actual event date is lost.
--
-- `visits.visit_date` already exists (timestamptz default now()) from
-- migration 0001 — but the RPC ignored the parameter, so every visit got
-- "now()" no matter what the form passed. This migration:
--   1. Adds `products.received_on` and `product_categories.added_on`.
--   2. Backfills both from `created_at::date` so existing rows keep a
--      sensible event date.
--   3. Recreates `products_active` / `products_low_stock` so the new
--      column appears via SELECT *.
--   4. Recreates `create_visit_with_prescriptions` with a `p_visit_date`
--      param.
--   5. Recreates `create_product_with_stock` with a `p_received_on` param.
-- ============================================================

-- ============================================================
-- 1. products.received_on — date the stock was actually received.
-- ============================================================
alter table products
  add column received_on date not null default current_date;

update products set received_on = created_at::date;

create index products_clinic_received_on_idx
  on products (clinic_id, received_on desc)
  where deleted_at is null;

-- ============================================================
-- 2. product_categories.added_on — date the category became
-- relevant to the clinic's catalog (often earlier than when the
-- category row itself was created in the system).
-- ============================================================
alter table product_categories
  add column added_on date not null default current_date;

update product_categories set added_on = created_at::date;

create index product_categories_clinic_added_on_idx
  on product_categories (clinic_id, added_on desc);

-- ============================================================
-- 3. Refresh products_active + products_low_stock so the new
-- column appears via SELECT *. CREATE VIEW captures the column
-- list at creation time, not on each query.
-- ============================================================
drop view if exists products_active;
drop view if exists products_low_stock;

create view products_active with (security_invoker = true) as
  select * from products where deleted_at is null;

create view products_low_stock with (security_invoker = true) as
  select *
  from products
  where deleted_at is null
    and reorder_level > 0
    and current_stock <= reorder_level;

-- ============================================================
-- 4. create_visit_with_prescriptions — add p_visit_date param.
-- Default `now()` preserves the previous behaviour for any
-- pre-existing callers that don't pass it.
-- ============================================================
drop function if exists create_visit_with_prescriptions(uuid, text, text, date, jsonb);

create or replace function create_visit_with_prescriptions(
  p_patient_id          uuid,
  p_doctor_notes        text,
  p_treatment_details   text,
  p_followup_date       date,
  p_prescribed_products jsonb default '[]'::jsonb,
  p_visit_date          timestamptz default now()
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
    (clinic_id, patient_id, visit_date, doctor_notes, treatment_details,
     prescribed_products, followup_date, created_by)
  values
    (v_clinic_id, p_patient_id, coalesce(p_visit_date, now()),
     p_doctor_notes, p_treatment_details, p_prescribed_products,
     p_followup_date, auth.uid())
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

grant execute on function create_visit_with_prescriptions(uuid, text, text, date, jsonb, timestamptz)
  to authenticated;

-- ============================================================
-- 5. create_product_with_stock — add p_received_on param.
-- ============================================================
drop function if exists create_product_with_stock(
  text, text, text, date, uuid, numeric, numeric, int, uuid, text, int, text
);

create or replace function create_product_with_stock(
  p_name             text,
  p_sku              text         default null,
  p_batch_number     text         default null,
  p_expiry_date      date         default null,
  p_supplier_id      uuid         default null,
  p_cost_price       numeric(10,2) default 0,
  p_selling_price    numeric(10,2) default 0,
  p_reorder_level    int          default 0,
  p_category_id      uuid         default null,
  p_notes            text         default null,
  p_initial_stock    int          default 0,
  p_purchase_remarks text         default null,
  p_received_on      date         default current_date
) returns products
language plpgsql
security invoker
as $$
declare
  v_clinic_id uuid;
  v_product   products;
begin
  v_clinic_id := current_user_clinic_id();
  if v_clinic_id is null then
    raise exception 'No clinic profile for current user'
      using errcode = '42501';
  end if;

  if p_supplier_id is null then
    raise exception 'supplier_id is required'
      using errcode = '22023';
  end if;

  if p_initial_stock is null or p_initial_stock < 0 then
    raise exception 'initial_stock must be >= 0'
      using errcode = '22023';
  end if;

  insert into products
    (clinic_id, name, sku, batch_number, expiry_date, supplier_id,
     cost_price, selling_price, reorder_level, category_id, notes,
     received_on, current_stock)
  values
    (v_clinic_id, p_name, p_sku, p_batch_number, p_expiry_date, p_supplier_id,
     coalesce(p_cost_price, 0), coalesce(p_selling_price, 0),
     coalesce(p_reorder_level, 0), p_category_id, p_notes,
     coalesce(p_received_on, current_date), 0)
  returning * into v_product;

  if p_initial_stock > 0 then
    insert into stock_movements
      (clinic_id, product_id, movement_type, quantity, remarks, created_by)
    values
      (v_clinic_id, v_product.id, 'PURCHASE', p_initial_stock,
       coalesce(p_purchase_remarks, 'Initial stock'), auth.uid());
    select * into v_product from products where id = v_product.id;
  end if;

  return v_product;
end$$;

grant execute on function create_product_with_stock(
  text, text, text, date, uuid, numeric, numeric, int, uuid, text, int, text, date
) to authenticated;

-- PostgREST keeps a cached schema; refresh so the new RPC signatures and
-- column lists are visible immediately after deploy.
notify pgrst, 'reload schema';
