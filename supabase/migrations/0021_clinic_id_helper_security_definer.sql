-- Migration 0021: break recursion between current_user_clinic_id()
-- and the new profiles_select_clinic policy from 0020.
--
-- 0001 defined the helper as `security invoker`, so its inner `select
-- clinic_id from profiles where user_id = auth.uid()` runs under the
-- caller's RLS. With only `profiles_select_self` in place that was
-- fine. After 0020 added `profiles_select_clinic` which itself calls
-- the helper, evaluating that policy for the inner subquery re-invokes
-- the helper → infinite recursion → PG error 54001 ("stack depth limit
-- exceeded") on every page that hits `profiles`.
--
-- Switching the helper to `security definer` runs the subquery as the
-- function owner, bypassing RLS for that single lookup. The function
-- still only reads the row keyed by auth.uid(), so callers cannot use
-- it to see anything they shouldn't. `set search_path = public` is the
-- standard hardening for SECURITY DEFINER funcs (prevents search_path
-- hijacking on schema name resolution).

create or replace function current_user_clinic_id() returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from profiles where user_id = auth.uid();
$$;

notify pgrst, 'reload schema';
