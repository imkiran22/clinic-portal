-- Migration 0009: atomic create-product-with-initial-stock RPC
-- Inserts a product and (optionally) a PURCHASE stock movement so the
-- ledger and the cache are aligned in a single transaction.
--
-- Called by inventoryService.create when the user enters an Initial Stock
-- value on the New Product form. The apply_stock_movement trigger
-- increments products.current_stock when the PURCHASE is inserted.

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
     cost_price, selling_price, reorder_level, category, current_stock)
  values
    (v_clinic_id, p_name, p_sku, p_batch_number, p_expiry_date, p_supplier_name,
     coalesce(p_cost_price, 0), coalesce(p_selling_price, 0),
     coalesce(p_reorder_level, 0), p_category, 0)
  returning * into v_product;

  if p_initial_stock > 0 then
    insert into stock_movements
      (clinic_id, product_id, movement_type, quantity, remarks, created_by)
    values
      (v_clinic_id, v_product.id, 'PURCHASE', p_initial_stock,
       coalesce(p_purchase_remarks, 'Initial stock'), auth.uid());
    -- apply_stock_movement trigger has just incremented products.current_stock.
    -- Re-read the row so the caller sees the post-trigger value.
    select * into v_product from products where id = v_product.id;
  end if;

  return v_product;
end$$;

grant execute on function create_product_with_stock(
  text, text, text, date, text, numeric, numeric, int, text, int, text
) to authenticated;
