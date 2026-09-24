# Anak.Studio

Quiet-luxury Houston marketplace for lashes & brows. Clients pick a professional, then a service, and book without an account. The professional calls or texts to confirm.

**Brand:** Anak.Studio · booking refs `ANA-XXXX` · English UI by default (auto EN / ES / PT / FR).

**Live site:** [https://bookanakstudio.com](https://bookanakstudio.com) (canonical). Legacy `*.vercel.app` is not the public URL.

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
| `NEXT_PUBLIC_APP_URL` | Yes | Local `http://localhost:3000`; production `https://bookanakstudio.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Not used yet (placeholder for Storage/Auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Not used yet |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google login button stays disabled until set |
| `RESEND_API_KEY` | Optional | Resend API key for booking emails |
| `RESEND_FROM` | Optional* | Sandbox `Anak.Studio <onboarding@resend.dev>`; after verify `Anak.Studio <bookings@bookanakstudio.com>` |
| `TELNYX_API_KEY` | Optional | Telnyx API key for booking SMS |
| `TELNYX_FROM_NUMBER` | Optional* | E.164 sender (*required with Telnyx key) |
| `OWNER_NOTIFY_EMAIL` | Optional | Inbox copied on every booking (fallback `admin@anak.studio` / first owner) |

Without `DATABASE_URL`, booking APIs return a clear **503** config error (needed for Vercel if env is missing).

## Database setup (Supabase)

1. Create a Supabase project.
2. Put the **transaction pooler** connection string in `DATABASE_URL` (Dashboard → Connect → ORMs → connection pooling).
3. Apply schema + seed:

```bash
npm install
npm run db:seed
```

`npm run db:migrate` applies all `supabase/migrations/*.sql` (including notification templates). `npm run db:seed` runs `001_init.sql` then inserts owner, catalog, and three professionals.

Schema file: `supabase/migrations/001_init.sql` (RLS sketched in comments; app auth is cookie JWT over the DB connection).

## Local run

```bash
npm install
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Professional photo & Instagram

`professionals.photo_url` and `professionals.instagram` already exist (no migration). Set them in:

- **`/admin` → Professionals** → expand artist → Photo URL / Instagram
- **`/pro` → Profile** → Photo URL / Instagram (the pro themselves)

Photo URL: any https image (or drop a file under `public/` and use `/your-file.jpg`). Instagram: `@handle` or full URL — saved as `https://instagram.com/...`.

Professionals enter at **https://bookanakstudio.com/pro** (via `/login`). Public home does not advertise signup.

## Admin login (after reset)

| Role | Email / alias | Password |
|---|---|---|
| Owner | `admin` or `admin@anak.studio` | `admin` |

Professionals are created from `/admin` → Professionals. Alias `user` only works if a `user@anak.studio` account exists (no hardcoded demo email).

Change credentials in UI:
- **Owner**: `/admin` → Owner account (email and/or password)
- **Pro**: `/admin` → Professionals → expand artist → Change email / Set password

## Notification templates

Owner can edit booking email/SMS copy from **`/admin` → Notifications** (no code deploy).

- Emails: subject, headline, intro, footer per role (professional / owner / client). Booking details card is always auto-filled.
- SMS: one text field each for professional and client.
- Placeholders: `{{ref}}`, `{{service}}`, `{{when}}`, `{{place}}`, `{{price}}`, `{{clientName}}`, `{{clientPhone}}`, `{{clientEmail}}`, `{{professionalName}}`, `{{notes}}`
- Stored in `notification_templates`. `OWNER_NOTIFY_EMAIL` still comes from env.

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
2. Set `SESSION_SECRET` and `NEXT_PUBLIC_APP_URL=https://bookanakstudio.com`.
3. Attach custom domain **bookanakstudio.com** in Vercel (canonical). Optional: redirect `cita-studio.vercel.app` → custom domain in Vercel Domains.
4. Deploy. No local SQLite — serverless needs Postgres.
5. Re-run seed once against production DB if empty (`npm run db:seed` with prod `DATABASE_URL`).

## Español (breve)

Anak.Studio es un marketplace de pestañas y cejas en Houston. Clientes reservan sin cuenta; la profesional confirma por WhatsApp. Copia `.env.example` a `.env.local`, pon el `DATABASE_URL` del pooler de Supabase, ejecuta `npm run db:seed` y `npm run dev`. Panel pro: `/pro`. Admin: `/admin` con `admin` / `admin@anak.studio` (password `admin`).

## Booking notifications (Resend + Telnyx)

On successful `POST /api/book`, the API optionally sends:

- **Email** (Resend) to the professional (login email), the owner (`OWNER_NOTIFY_EMAIL`), and the client if `clientEmail` was provided.
- **SMS**: Telnyx outbound is **disabled** (no 10DLC). Pro/owner emails include a copy-paste SMS/WhatsApp block for staff to text the client manually.

If keys are missing, booking still succeeds. JSON includes:

```json
"notifications": {
  "email": "sent|skipped|failed",
  "sms": "skipped",
  "clientEmailSent": false,
  "clientEmail": "sent|skipped|failed",
  "clientSmsSent": false
}
```

`clientEmail` is `skipped` when the client left email blank, `sent` when Resend accepted it, or `failed` when Resend rejected it (UI shows a short notice).

### Resend domain (required for real client inboxes)

`RESEND_FROM="Anak.Studio <onboarding@resend.dev>"` is the **sandbox** sender. Until you verify **bookanakstudio.com** in [Resend Domains](https://resend.com/domains) and set `RESEND_FROM` to `Anak.Studio <bookings@bookanakstudio.com>`, Resend **only delivers to the Resend account email**. Typical symptom: owner (`OWNER_NOTIFY_EMAIL`) gets booking mail, but the client at another Gmail/Yahoo address never does — code still attempts the client send and logs `sandboxLikely: true`.

Production checklist:

1. Add **bookanakstudio.com** in Resend and publish the DNS records Resend shows (typically SPF/TXT, DKIM CNAMEs, and optionally MX for inbound).
2. Set Vercel env `RESEND_FROM="Anak.Studio <bookings@bookanakstudio.com>"` after the domain shows verified.
3. Set `NEXT_PUBLIC_APP_URL=https://bookanakstudio.com`.
4. Redeploy. Confirm a test booking to a non-account inbox.

```
RESEND_API_KEY=
RESEND_FROM="Anak.Studio <bookings@bookanakstudio.com>"  # after bookanakstudio.com is verified in Resend
TELNYX_API_KEY=
TELNYX_FROM_NUMBER=+1...
OWNER_NOTIFY_EMAIL=
```

Do not commit secrets. Set these in Vercel → Project → Settings → Environment Variables.

## Gaps / next

- Google OAuth stub only (button disabled)
- Supabase RLS not enforced (app uses server-side DB + JWT cookies)
- Photo upload (URL field only; SVG placeholders in `/public/avatars`)
- Card billing (owner marks `paid_until` manually)
- Verify Resend domain for production client emails (see above)
