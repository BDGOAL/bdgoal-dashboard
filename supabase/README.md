# Supabase Setup (Internal Launch)

## 1) Run migration

Use Supabase SQL editor or CLI to run:

- `supabase/migrations/0001_initial_internal_launch.sql`

## 2) Seed base clients

Insert at least the client IDs currently used in dashboard scope:

- `cl-aurora`
- `cl-pulse`

## 3) Create first admin

1. Login once via magic link.
2. In `profiles`, set that user `role = 'admin'`.
3. Add `client_memberships` rows for all clients you need.

## 4) Migrate prototype JSON data

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
node scripts/seed-json-to-supabase.mjs
```

## 5) RLS model summary

- Internal users read/write by `client_memberships` + `profiles.role`.
- `admin` bypasses client membership checks.
- `editor/admin` can write content and preview links.
- `viewer` read-only.
- Preview routes use token table (`preview_links`) and never expose internal notes.

