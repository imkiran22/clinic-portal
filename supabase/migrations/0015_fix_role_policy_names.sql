-- Migration 0015: drop original tenant-only policies that 0014 was supposed
-- to replace.
--
-- 0014 created products_insert_tenant / products_update_tenant / visits_insert_tenant
-- intending to *replace* the original policies, but its DROP statements
-- referenced the new names (which didn't exist yet), so the old permissive
-- policies (products_insert, products_update, visits_insert) were never
-- dropped. PostgreSQL OR-merges policies, so any user matching the old
-- tenant-only check was still allowed in — limited tier role gating was
-- silently ineffective at the DB.
--
-- Idempotent: safe to re-run.

drop policy if exists products_insert on products;
drop policy if exists products_update on products;
drop policy if exists visits_insert  on visits;
