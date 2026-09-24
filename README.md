# Anak.Studio

Quiet-luxury Houston marketplace for lashes & brows. Clients book without an account; professionals confirm on WhatsApp.

**Brand:** Anak.Studio · booking refs `ANA-XXXX` · English UI by default (auto EN / ES / PT / FR).

## Stack

- Next.js App Router + TypeScript + Tailwind
- Postgres via Drizzle ORM (`postgres` driver)
- Cookie JWT sessions (`jose` + `bcryptjs`)
- Lightweight i18n dictionaries (EN / ES / PT / FR)

## Environment

Copy `.env.example` → `.env.local`:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** | Supabase **pooler** URL (port `6543`, user `postgres.PROJECT_REF`) recommended. Direct `db.*.supabase.co:5432` may be IPv6-only. |
| `SESSION_SECRET` | **Yes** | ≥32 random chars for JWT cookies |
| `NEXT_PUBLIC_APP_URL` | Yes | e.g. `http://localhost:3000` or production URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Not used yet (placeholder for Storage/Auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Not used yet |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google login button stays disabled until set |

Without `DATABASE_URL`, booking APIs return a clear **503** config error (needed for Vercel if env is missing).

## Database setup (Supabase)

1. Create a Supabase project.
2. Put the **transaction pooler** connection string in `DATABASE_URL` (Dashboard → Connect → ORMs → connection pooling).
3. Apply schema + seed:

```bash
npm install
npm run db:seed
```

`npm run db:seed` runs `supabase/migrations/001_init.sql` then inserts owner, catalog, and three professionals.

Schema file: `supabase/migrations/001_init.sql` (RLS sketched in comments; app auth is cookie JWT over the DB connection).

## Local run

```bash
npm install
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Seed logins

| Role | Email | Password |
|---|---|---|
| Owner (admin) | `owner@anak.studio` | `AnakOwner123!` |
| Pro — Luna Vega (lashes, Montrose) | `luna@anak.studio` | `LunaAnak123!` |
| Pro — Marisol Chen (brows, The Heights) | `marisol@anak.studio` | `MarisolAnak123!` |
| Pro — Noa Ruiz (both, River Oaks) | `noa@anak.studio` | `NoaAnak123!` |

## Routes

| Path | Who |
|---|---|
| `/` | Public 4-step book flow |
| `/login` `/signup` | Professionals (and owner) |
| `/pro` | Pro panel (own data only) |
| `/admin` | Owner only |
| `/privacy` `/contact` | Legal / contact |
| `/api/catalog` `/api/professionals` `/api/slots` `/api/book` | Public booking |
| `/api/pro/*` `/api/admin/*` `/api/auth/*` | Authenticated |

## Visibility rule

A professional appears on the public site only if `status = active` **and** `paid_until >= today` (Houston date). Pending / paused / expired stay hidden but can still log into `/pro`.

## Vercel

1. Set `DATABASE_URL` to the Supabase **pooler** URL (`sslmode=require`).
2. Set `SESSION_SECRET` and `NEXT_PUBLIC_APP_URL`.
3. Deploy. No local SQLite — serverless needs Postgres.
4. Re-run seed once against production DB if empty (`npm run db:seed` with prod `DATABASE_URL`).

## Español (breve)

Anak.Studio es un marketplace de pestañas y cejas en Houston. Clientes reservan sin cuenta; la profesional confirma por WhatsApp. Copia `.env.example` a `.env.local`, pon el `DATABASE_URL` del pooler de Supabase, ejecuta `npm run db:seed` y `npm run dev`. Panel pro: `/pro`. Admin: `/admin` con `owner@anak.studio`.

## Gaps / next

- Google OAuth stub only (button disabled)
- Supabase RLS not enforced (app uses server-side DB + JWT cookies)
- Photo upload (URL field only; SVG placeholders in `/public/avatars`)
- Card billing (owner marks `paid_until` manually)
