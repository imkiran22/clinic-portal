-- Migration 0011: add notes column to products + upgrade the RPC
--
-- Two related changes:
--   1. ALTER products to add a free-text `notes` column (mirrors patients).
--      Lets staff attach a remark to a product, and lets one-off imports
--      preserve unparsed values (like "3box+1 strip" from the legacy xlsx).
--   2. DROP and recreate create_product_with_stock with an additional
--      p_notes parameter so the form can pass notes through atomically.
--      Old signature must be dropped because PostgreSQL treats functions
--      with different argument lists as distinct objects.

alter table products
  add column if not exists notes text;

-- Refresh products_active so the new column appears in service reads.
create or replace view products_active with (security_invoker = true) as
  select * from products where deleted_at is null;

-- Replace the RPC with a version that takes p_notes.
drop function if exists create_product_with_stock(
  text, text, text, date, text, numeric, numeric, int, text, int, text
);

create or replace function create_product_with_stock(
  p_name             text,
  p_sku              text         default null,
  p_batch_number     text         default null,
  p_expiry_date      date         default null,
  p_supplier_name    text         default null,
  p_cost_price       numeric(10,2) default 0,
  p_selling_price    numeric(10,2) default 0,
  p_reorder_level    int          default 0,
  p_category         text         default null,
  p_notes            text         default null,
  p_initial_stock    int          default 0,
  p_purchase_remarks text         default null
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

  if p_initial_stock is null or p_initial_stock < 0 then
    raise exception 'initial_stock must be >= 0'
      using errcode = '22023';
  end if;

  insert into products
    (clinic_id, name, sku, batch_number, expiry_date, supplier_name,
     cost_price, selling_price, reorder_level, category, notes, current_stock)
  values
    (v_clinic_id, p_name, p_sku, p_batch_number, p_expiry_date, p_supplier_name,
     coalesce(p_cost_price, 0), coalesce(p_selling_price, 0),
     coalesce(p_reorder_level, 0), p_category, p_notes, 0)
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
  text, text, text, date, text, numeric, numeric, int, text, text, int, text
) to authenticated;
