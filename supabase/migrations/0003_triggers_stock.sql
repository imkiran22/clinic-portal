-- Migration 0003: triggers for stock cache, display-name capture, append-only guards

-- ============================================================
-- apply_stock_movement: keeps products.current_stock in sync
-- AFTER INSERT on stock_movements
-- ============================================================
create or replace function apply_stock_movement() returns trigger
language plpgsql as $$
declare
  v_new_stock int;
begin
  update products
    set current_stock = current_stock + NEW.quantity,
        updated_at = now()
    where id = NEW.product_id
    returning current_stock into v_new_stock;

  -- Safety net: stock must never go negative.
  -- sell_product() has the primary guard with FOR UPDATE lock, but a
  -- buggy ADJUSTMENT- larger than current_stock would otherwise corrupt the cache.
  if v_new_stock < 0 then
    raise exception 'stock would go negative for product % (would be %)',
      NEW.product_id, v_new_stock
      using errcode = 'P0001';
  end if;

  return NEW;
end$$;

create trigger trg_apply_stock_movement
  after insert on stock_movements
  for each row execute function apply_stock_movement();

-- ============================================================
-- set_created_by_display: snapshot display_name from profiles
-- BEFORE INSERT on visits and stock_movements.
-- Survives staff renames or departures.
-- ============================================================
create or replace function set_created_by_display() returns trigger
language plpgsql as $$
begin
  if NEW.created_by_display is null and NEW.created_by is not null then
    select display_name
      into NEW.created_by_display
      from profiles
      where user_id = NEW.created_by;
  end if;
  return NEW;
end$$;

create trigger trg_visits_set_display
  before insert on visits
  for each row execute function set_created_by_display();

create trigger trg_movements_set_display
  before insert on stock_movements
  for each row execute function set_created_by_display();

-- ============================================================
-- Append-only enforcement on stock_movements
-- Belt + braces with RLS (which has no UPDATE/DELETE policy).
-- Mistakes are corrected via new ADJUSTMENT entries, never by editing.
-- ============================================================
create or replace function deny_modify_stock_movements() returns trigger
language plpgsql as $$
begin
  raise exception 'stock_movements is append-only — record an ADJUSTMENT instead'
    using errcode = '0A000';
end$$;

create trigger trg_movements_no_update
  before update on stock_movements
  for each row execute function deny_modify_stock_movements();

create trigger trg_movements_no_delete
  before delete on stock_movements
  for each row execute function deny_modify_stock_movements();
