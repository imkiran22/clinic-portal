# Clinic Portal

Internal management portal for a dermatology clinic — patients, inventory (with append-only stock movements), visits, and a dashboard. Replaces Excel-based workflows.

See **[CLAUDE.md](./CLAUDE.md)** for the project guide and **[PLAN.md](./PLAN.md)** for the full implementation plan.

## Stack
- Vue 3 + Vite + TSX (mixed with SFC for shadcn-vue)
- TypeScript, Tailwind CSS, shadcn-vue
- Vue Router (SPA) + TanStack Query (Vue) + VeeValidate + Zod
- Supabase (Postgres + Auth + Storage)

## Getting started

```bash
# 1. Install deps
npm install

# 2. Configure Supabase
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Apply Supabase migrations (M2 onwards)
# Run SQL files under supabase/migrations/ in order via the Supabase SQL Editor.

# 4. Run dev server
npm run dev
# → http://localhost:5173
```

## Scripts
- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — Type-check (`vue-tsc -b`) and bundle for production
- `npm run preview` — Serve the production build locally

## Current status
**M1 complete** — Vue 3 + Vite + TSX scaffold, routing, AppShell, dummy views, supporting libs wired. Next: M2 (Supabase migrations).
