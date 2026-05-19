#!/usr/bin/env python3
"""
One-off import: reads STOCKLIST.xlsx → 'STOCK LIST' sheet, treats the
maroon-filled (#741B47) UPPERCASE rows as category headers, and emits a
single SQL file that:
  1. Soft-deletes the 6 dummy seed products (by name).
  2. Bulk-inserts every product row with name + supplier + category +
     current_stock (and the original textual stock notation in notes if
     non-numeric).

Skipped:
- The 'Client name' / 'Date' columns (embedded sales history; not imported).
- cost_price, selling_price, sku, batch_number, expiry_date,
  reorder_level — not present in the xlsx; staff fills via UI edit.

Usage:
    python scripts/import_products_from_stocklist.py /path/to/STOCKLIST.xlsx \\
        > supabase/import/03_products_from_stocklist.sql

Requires openpyxl (in a venv if system Python is externally managed).
"""
from __future__ import annotations

import re
import sys
from openpyxl import load_workbook

SHEET = "STOCK LIST"
MAROON_HEADER_RGB = "FF741B47"   # top-level category headers (TABLETS, HAIR SERUMS, …)
SUBCAT_HEADER_RGB = "FFCFE2F3"   # light-blue sub-category headers (MINOXIDIL, PEPTIDES, …)

SEED_NAMES_TO_RETIRE = [
    "Sunscreen SPF 50",
    "Vitamin C Serum",
    "Salicylic Acid Wash",
    "Retinol Cream 0.05%",
    "Hyaluronic Moisturiser",
    "Microneedling Tips",
]


def cell_fill_rgb(cell) -> str:
    try:
        c = cell.fill.fgColor if cell.fill else None
        return str(c.rgb) if c and c.rgb else ""
    except Exception:
        return ""


def _is_uppercase_label(cell, target_rgb: str) -> bool:
    if cell_fill_rgb(cell) != target_rgb:
        return False
    v = cell.value
    if v is None:
        return False
    s = str(v).strip()
    if not s:
        return False
    # .isupper() returns True iff all cased chars are upper AND ≥1 cased char exists.
    return s.isupper()


def is_category_header(cell) -> bool:
    """Maroon-filled UPPERCASE row — top-level category."""
    return _is_uppercase_label(cell, MAROON_HEADER_RGB)


def is_subcategory_header(cell) -> bool:
    """Light-blue-filled UPPERCASE row — sub-category within current category."""
    return _is_uppercase_label(cell, SUBCAT_HEADER_RGB)


def normalize_category(s: str) -> str:
    """
    Preserve the xlsx casing exactly (categories are in CAPS in the source).
    Only strip whitespace and collapse internal runs.

        'DEPIGMENTATION  '          -> 'DEPIGMENTATION'
        'WART & MOLE'               -> 'WART & MOLE'
        'MOISTURIZER-BODY/ BODYWASH'-> 'MOISTURIZER-BODY/ BODYWASH'
    """
    return re.sub(r"\s+", " ", s.strip())


def clean_text(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    if not s or s.lower() in {"nan", "none", "-", "--", "---"}:
        return None
    return s


def clean_supplier(v) -> str | None:
    s = clean_text(v)
    if s is None:
        return None
    # Strip embedded phone numbers (7+ consecutive digits surrounded by spaces/punct).
    s = re.sub(r"\s*\d{7,}\s*", " ", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s if s else None


STOCK_SANITY_CAP = 100_000  # any "stock" above this is almost certainly a
                            # misplaced value (e.g., a phone number typed into
                            # the Stock column).


def parse_stock(v) -> tuple[int, str | None]:
    """
    Returns (numeric_stock, original_notation_or_None).
    Numeric stocks within sanity range → (n, None).
    Numeric stocks above the cap → (0, "Misplaced value: '<orig>'") — likely
      a phone or other large number accidentally in the Stock column.
    Textual or unparseable → (0, "Stock notation: '<orig>'").
    """
    if v is None:
        return 0, None
    if isinstance(v, bool):
        return 0, None
    if isinstance(v, (int, float)):
        try:
            n = int(v)
        except (ValueError, TypeError):
            return 0, f'Stock notation: "{v}"'
        if n < 0 or n > STOCK_SANITY_CAP:
            return 0, f'Misplaced value in Stock column: "{v}"'
        return n, None
    s = str(v).strip()
    if not s:
        return 0, None
    if s.endswith(".0"):
        s = s[:-2]
    try:
        n = int(float(s))
    except (ValueError, TypeError):
        return 0, f'Stock notation: "{str(v).strip()}"'
    if n < 0 or n > STOCK_SANITY_CAP:
        return 0, f'Misplaced value in Stock column: "{str(v).strip()}"'
    return n, None


def sql_str(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def main(path: str) -> int:
    wb = load_workbook(path, data_only=True)
    if SHEET not in wb.sheetnames:
        print(f"ERROR: sheet {SHEET!r} not found in {path}", file=sys.stderr)
        return 1
    ws = wb[SHEET]

    records: list[tuple[str, str | None, str | None, int, str | None]] = []
    current_category: str | None = None
    current_subcategory: str | None = None
    skipped_no_name = 0
    skipped_blank = 0
    categories_seen: set[str] = set()

    for row_idx, row in enumerate(
        ws.iter_rows(min_row=1, max_row=ws.max_row), start=1
    ):
        name_cell = row[0]

        if is_category_header(name_cell):
            current_category = normalize_category(str(name_cell.value))
            current_subcategory = None
            continue

        if is_subcategory_header(name_cell):
            current_subcategory = normalize_category(str(name_cell.value))
            continue

        name = clean_text(name_cell.value)
        if name is None:
            skipped_blank += 1
            continue
        if len(name) < 2:
            skipped_no_name += 1
            continue

        # Combine category + subcategory if both present.
        cat_value: str | None
        if current_category and current_subcategory:
            cat_value = f"{current_category} / {current_subcategory}"
        else:
            cat_value = current_category
        if cat_value:
            categories_seen.add(cat_value)

        supplier = clean_supplier(row[1].value if len(row) > 1 else None)
        stock, stock_note = parse_stock(row[2].value if len(row) > 2 else None)
        records.append((name, supplier, cat_value, stock, stock_note))

    print(f"-- Generated from: {path}", file=sys.stderr)
    print(
        f"-- {len(records)} product rows across {len(categories_seen)} categories; "
        f"skipped {skipped_blank} blank rows, {skipped_no_name} short-name rows",
        file=sys.stderr,
    )
    print(f"-- Categories: {', '.join(sorted(categories_seen))}", file=sys.stderr)

    # ---- Emit SQL ----
    out = []
    out.append("-- One-off import of products from STOCKLIST.xlsx → STOCK LIST sheet.")
    out.append("-- Generated by scripts/import_products_from_stocklist.py")
    out.append(f"-- Source: {path}")
    out.append(
        f"-- {len(records)} products across {len(categories_seen)} categories."
    )
    out.append("-- Apply once via Supabase SQL Editor.")
    out.append("-- Requires migrations 0009 + 0010 to be applied first.")
    out.append("")
    out.append(
        "-- ============================================================"
    )
    out.append("-- STEP 0: Soft-delete the 6 seeded dummy products (by name).")
    out.append(
        "-- ============================================================"
    )
    out.append("update products")
    out.append("  set deleted_at = now()")
    out.append("  where deleted_at is null")
    out.append("  and name in (")
    out.append(
        ",\n".join(f"    {sql_str(n)}" for n in SEED_NAMES_TO_RETIRE)
    )
    out.append("  );")
    out.append("")
    out.append(
        "-- ============================================================"
    )
    out.append("-- STEP 1: Bulk insert real products.")
    out.append(
        "-- ============================================================"
    )
    out.append("do $$")
    out.append("declare")
    out.append("  v_clinic uuid;")
    out.append("  v_before int;")
    out.append("  v_after int;")
    out.append("begin")
    out.append("  select id into v_clinic from clinics limit 1;")
    out.append("  if v_clinic is null then")
    out.append("    raise exception 'No clinic row. Apply 0005_seed_dev.sql first.';")
    out.append("  end if;")
    out.append("  select count(*) into v_before from products where deleted_at is null;")
    out.append("")
    out.append(
        "  insert into products (clinic_id, name, supplier_name, category, current_stock, notes) values"
    )
    lines = []
    for name, supplier, category, stock, note in records:
        lines.append(
            f"    (v_clinic, {sql_str(name)}, {sql_str(supplier)}, "
            f"{sql_str(category)}, {stock}, {sql_str(note)})"
        )
    out.append(",\n".join(lines))
    out.append("  ;")
    out.append("")
    out.append("  select count(*) into v_after from products where deleted_at is null;")
    out.append(
        "  raise notice 'Imported % product rows (% -> %).', v_after - v_before, v_before, v_after;"
    )
    out.append("end$$;")
    out.append("")

    print("\n".join(out))
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
