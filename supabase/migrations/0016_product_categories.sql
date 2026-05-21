-- Migration 0016: product categories lookup
--
-- Replaces the free-text products.category column with a proper lookup
-- table so categories are normalised, manageable, and harder to typo.
--
-- Steps:
--   1. Create product_categories (clinic-scoped, case-insensitive unique name)
--   2. RLS — privileged tier can manage, anyone tenant-scoped can read
--   3. Backfill: one row per distinct existing products.category
--   4. Add products.category_id FK, populate from the backfill (case-insensitive
--      match against the original text)
--   5. Drop products.category — products_active view recreated without it

-- ============================================================
-- 1. Table
-- ============================================================
create table product_categories (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete restrict,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness per clinic so "Anti acne" and "ANTI ACNE"
-- can't both exist.
create unique index product_categories_clinic_name_lower_idx
  on product_categories (clinic_id, lower(name));

create index product_categories_clinic_idx
  on product_categories (clinic_id);

-- ============================================================
-- 2. RLS — privileged tier manages, all roles read within tenant
-- ============================================================
alter table product_categories enable row level security;

create policy product_categories_select on product_categories
  for select to authenticated
  using (clinic_id = current_user_clinic_id());

create policy product_categories_insert on product_categories
  for insert to authenticated
  with check (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

create policy product_categories_update on product_categories
  for update to authenticated
  using (clinic_id = current_user_clinic_id())
  with check (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

create policy product_categories_delete on product_categories
  for delete to authenticated
  using (
    clinic_id = current_user_clinic_id()
    and is_privileged_user()
  );

-- ============================================================
-- 3. Backfill from distinct existing values
-- ============================================================
insert into product_categories (clinic_id, name)
select distinct
  p.clinic_id,
  trim(p.category) as name
from products p
where p.category is not null
  and trim(p.category) <> ''
on conflict do nothing;

-- ============================================================
-- 4. Add FK on products + populate it
-- ============================================================
alter table products
  add column category_id uuid references product_categories(id) on delete set null;

create index products_category_id_idx on products (category_id);

update products p
set category_id = pc.id
from product_categories pc
where pc.clinic_id = p.clinic_id
  and lower(pc.name) = lower(trim(p.category))
  and p.category is not null
  and trim(p.category) <> '';

-- ============================================================
-- 5. Drop the free-text column — views that reference it must be
-- recreated, since CREATE OR REPLACE VIEW can't change the column set.
-- ============================================================
drop view if exists products_active;
drop view if exists products_low_stock;

alter table products drop column category;

create view products_active with (security_invoker = true) as
  select * from products where deleted_at is null;

create view products_low_stock with (security_invoker = true) as
  select *
  from products
  where deleted_at is null
    and reorder_level > 0
    and current_stock <= reorder_level;

-- ============================================================
-- 6. Refresh the create_product_with_stock RPC — p_category text is gone,
-- p_category_id uuid takes its place. Old signature must be dropped
-- because PostgreSQL treats different arg lists as distinct functions.
-- ============================================================
drop function if exists create_product_with_stock(
  text, text, text, date, text, numeric, numeric, int, text, text, int, text
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

  if p_initial_stock is null or p_initial_stock < 0 then
    raise exception 'initial_stock must be >= 0'
      using errcode = '22023';
  end if;

  insert into products
    (clinic_id, name, sku, batch_number, expiry_date, supplier_name,
     cost_price, selling_price, reorder_level, category_id, notes, current_stock)
  values
    (v_clinic_id, p_name, p_sku, p_batch_number, p_expiry_date, p_supplier_name,
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
  text, text, text, date, text, numeric, numeric, int, uuid, text, int, text
) to authenticated;
