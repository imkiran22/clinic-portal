-- Migration 0013: products_low_stock view for the dashboard
-- PostgREST can't compare two columns in a filter (current_stock <=
-- reorder_level), so we expose a view that bakes the predicate in.
-- Filtering rule: only products with reorder_level > 0 count — a
-- reorder_level of 0 means "don't track" and otherwise spams the dashboard.
-- security_invoker = true so RLS on `products` continues to gate access.

create or replace view products_low_stock with (security_invoker = true) as
  select *
  from products
  where deleted_at is null
    and reorder_level > 0
    and current_stock <= reorder_level;
