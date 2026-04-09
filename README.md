# BDGoal Content Dashboard

Internal content operations dashboard with Asana ready queue, Instagram workflow/grid, and client preview links.

## Environment Variables

Required for production/internal launch:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # only for seed scripts/admin ops, never expose client-side
NEXT_PUBLIC_APP_URL=        # e.g. https://dashboard.bdgoal.com
ASANA_PAT=
ASANA_PROJECT_GID=
```

Optional:

```bash
CONTENT_DATA_MODE=mock # local development fallback
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Apply DB schema + RLS

- Run SQL in `supabase/migrations/0001_initial_internal_launch.sql`.
- See setup notes in `supabase/README.md`.

3. Start app

```bash
npm run dev
```

## Auth / Access Model

- Internal routes require Supabase login (`/login` magic link).
- Roles:
  - `admin`: full access + preview link management
  - `editor`: assigned-client editing
  - `viewer`: assigned-client read-only
- Client preview uses token routes:
  - `/client-preview/[token]` (view-only, no internal controls)

## Route Classification

- Internal-only (auth required):
  - `/`
  - `/instagram`
  - `/analytics`
  - `/calendar`
  - `/competitors`
  - `/news`
  - `/ready-queue`
  - `/api/content/*`
  - `/api/asana/ready-queue`
  - `/api/preview-links`
- Public token preview:
  - `/client-preview/[token]`

## JSON -> Supabase Migration

Prototype JSON data can be migrated with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
node scripts/seed-json-to-supabase.mjs
```

## Notes

- UI keeps existing compact dark dashboard style.
- `getDashboardContentItems()` remains primary adapter point for existing views.
- Preview pages intentionally hide internal-only fields (e.g. internal notes).
