-- Migration 0012: make products.supplier_name required.
--
-- The xlsx import left some rows with NULL supplier_name (the Company
-- column was blank for those products). Backfill those to 'Unknown' so
-- we can enforce NOT NULL going forward. Staff can update them later
-- through the Edit product dialog as they confirm the real supplier.

update products
  set supplier_name = 'Unknown'
  where supplier_name is null;

alter table products
  alter column supplier_name set not null;
