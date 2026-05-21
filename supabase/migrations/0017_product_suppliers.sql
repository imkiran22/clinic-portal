-- Migration 0017: product suppliers lookup
--
-- Same shape as 0016 (categories) but for the supplier free-text column.
-- 0012 made supplier_name NOT NULL with 'Unknown' backfill, so every product
-- already has a supplier; we just convert it from text to a normalised FK
-- to dedupe case-mismatches like "Arka vital" vs "Arka Vital".
--
-- Steps:
--   1. Create product_suppliers (clinic-scoped, case-insensitive unique name)
--   2. RLS — privileged tier can manage, all roles read tenant-scoped
--   3. Backfill: one row per distinct existing products.supplier_name
--   4. Add products.supplier_id (nullable), populate, then SET NOT NULL
--   5. Drop products.supplier_name; recreate the products_* views
--   6. Update create_product_with_stock RPC to take p_supplier_id

-- ============================================================
-- 1. Table
-- ============================================================
create table product_suppliers (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete restrict,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_suppliers_clinic_name_lower_idx
  on product_suppliers (clinic_id, lower(name));

create index product_suppliers_clinic_idx
  on product_suppliers (clinic_id);

-- ============================================================
-- 2. RLS
-- ============================================================
alter table product_suppliers enable row level security;

create policy product_suppliers_select on product_suppliers
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

create policy product_suppliers_insert on product_suppliers
  for insert to authenticated
  with check (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

create policy product_suppliers_update on product_suppliers
  for update to authenticated
  using (clinic_id = current_user_clinic_id())
  with check (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

create policy product_suppliers_delete on product_suppliers
  for delete to authenticated
  using (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

-- ============================================================
-- 3. Backfill from distinct existing values
-- ============================================================
insert into product_suppliers (clinic_id, name)
select distinct
  p.clinic_id,
  trim(p.supplier_name) as name
from products p
where p.supplier_name is not null
  and trim(p.supplier_name) <> ''
on conflict do nothing;

-- ============================================================
-- 4. Add FK on products + populate, then make it NOT NULL.
--    ON DELETE RESTRICT so a supplier can't be removed while
--    products reference it — UI also guards via product_count.
-- ============================================================
alter table products
  add column supplier_id uuid references product_suppliers(id) on delete restrict;

create index products_supplier_id_idx on products (supplier_id);

update products p
set supplier_id = ps.id
from product_suppliers ps
where ps.clinic_id = p.clinic_id
  and lower(ps.name) = lower(trim(p.supplier_name))
  and p.supplier_name is not null
  and trim(p.supplier_name) <> '';

-- Safety: if anything still has NULL supplier_id we can't make it NOT NULL.
-- 0012 backfilled NULL supplier_name to 'Unknown' so this should never fire,
-- but loud-fail is better than silently leaving rows mis-shaped.
do $$
declare v_missing int;
begin
  select count(*) into v_missing from products where supplier_id is null;
  if v_missing > 0 then
    raise exception 'Cannot make supplier_id NOT NULL: % product(s) failed to match a supplier row. Inspect via: select id, name, supplier_name from products where supplier_id is null;', v_missing;
  end if;
end $$;

alter table products alter column supplier_id set not null;

-- ============================================================
-- 5. Drop the text column; recreate the views.
-- ============================================================
drop view if exists products_active;
drop view if exists products_low_stock;

alter table products drop column supplier_name;

create view products_active with (security_invoker = true) as
  select * from products where deleted_at is null;

create view products_low_stock with (security_invoker = true) as
  select *
  from products
  where deleted_at is null
    and reorder_level > 0
    and current_stock <= reorder_level;

-- ============================================================
-- 6. Refresh the RPC — p_supplier_name text → p_supplier_id uuid.
-- ============================================================
drop function if exists create_product_with_stock(
  text, text, text, date, text, numeric, numeric, int, uuid, text, int, text
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
     cost_price, selling_price, reorder_level, category_id, notes, current_stock)
  values
    (v_clinic_id, p_name, p_sku, p_batch_number, p_expiry_date, p_supplier_id,
     coalesce(p_cost_price, 0), coalesce(p_selling_price, 0),
     coalesce(p_reorder_level, 0), p_category_id, p_notes, 0)
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
  text, text, text, date, uuid, numeric, numeric, int, uuid, text, int, text
) to authenticated;
