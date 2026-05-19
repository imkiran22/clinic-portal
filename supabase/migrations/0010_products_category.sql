-- Migration 0010: add a free-text category column to products
--
-- Categories observed in the legacy STOCKLIST.xlsx (Tablets, Antifungal
-- Creams, Depigmentation, etc.) are useful as an organizational dimension
-- but vary widely and change over time, so an open vocabulary text column
-- fits better than an enum. The form provides a plain text input; later
-- we can add a datalist of distinct existing values for autocomplete.

alter table products
  add column if not exists category text;

create index if not exists products_clinic_category_idx
  on products (clinic_id, category)
  where deleted_at is null and category is not null;

-- Refresh products_active so the new column is visible to service reads.
create or replace view products_active with (security_invoker = true) as
  select * from products where deleted_at is null;
