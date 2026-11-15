# Wealth Dashboard — Deployment Guide

Next.js 16 · React 19 · TypeScript · Prisma (PostgreSQL) · NextAuth v5 · Tailwind CSS v4

## 1. Prerequisites

| Thing | Notes |
| --- | --- |
| GitHub repository | This project, pushed to a branch Vercel can read |
| Vercel account | Import the repository as a Next.js project |
| PostgreSQL database | Vercel Postgres, Neon or Supabase all work |

The Prisma datasource is `postgresql`. SQLite is not supported by the schema (it uses enums).

## 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for
Production (and Preview if you need previews to work):

| Variable | Required | Example / notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/wealth?schema=public` |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | No | Only needed for Google sign-in |
| `GOOGLE_CLIENT_SECRET` | No | Only needed for Google sign-in |
| `MARKET_DATA_PROVIDER` | No | `yahoo` (default) or `sample` for deterministic placeholders |
| `QUOTE_TTL_SECONDS` | No | Quote cache lifetime, default `900` (fund NAVs use 6 hours) |
| `CRON_SECRET` | No | Enables scheduled alert evaluation; without it `/api/cron/alerts` returns 503 |

Notes:

- **Use the direct (non-pooled) connection string.** `prisma migrate deploy` runs
  during the build, and pooled/pgbouncer endpoints cannot always run migrations.
  If your provider only gives a pooled URL, add the unpooled host to the
  connection string used at build time.
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` are **not** used by NextAuth v5. The app sets
  `trustHost: true`, so it works on Vercel preview and production domains
  without extra host configuration.
- Google sign-in is optional; see the setup section below.

### Google sign-in setup

1. Google Cloud Console → **APIs & Services → Credentials** → open the
   **Web application** OAuth client used by this app.
2. Under **Authorised redirect URIs**, add this exact value for each domain that
   serves the app (scheme included, no trailing slash):
   - `https://wealth-dashboard-khaki.vercel.app/api/auth/callback/google` (production)
   - `http://localhost:3000/api/auth/callback/google` (local)
   - Preview deployments use `https://<preview-domain>/api/auth/callback/google`;
     add them one at a time or use a stable custom domain.
3. Add the same origin under **Authorised JavaScript origins**.
4. If the OAuth consent screen is in **Testing** mode, add your Google account as a
   **test user**, or publish the app.
5. Save, wait about a minute, then retry. The sign-in page shows the exact URI to
   copy whenever Google reports a mismatch.

Notes:

- `redirect_uri_mismatch` is returned by Google before the app is reached. The
  refused URI is in the `redirect_uri` query parameter of the error URL; it must
  match a registered URI character for character (no `www`, no trailing slash).
- The callback URL is derived from the request host (`trustHost: true`), so moving
  to a custom domain requires adding that domain's callback URI too.
- Google verifies email ownership, so an existing password account is linked when
  the same address signs in with Google.

### Market data and scheduled alerts

- Quotes are resolved through `src/lib/market-data`: **Yahoo Finance** for stocks,
  ETFs and indices (NSE symbols get `.NS`, BSE gets `.BO`) and **MFAPI** for
  Indian mutual fund NAVs (a numeric scheme code is required).
- Every lookup is cached in the `QuoteCache` table for `QUOTE_TTL_SECONDS`
  (default 15 minutes; fund NAVs 6 hours). Provider failures never invent a
  price: the last cached value is served marked **cached/stale**, otherwise the
  symbol is reported unavailable.
- These are unofficial, key-free endpoints. They can change or rate-limit, and
  their terms do not grant redistribution rights. The app labels the source and
  is not investment-grade data. Manual prices are never overwritten by a refresh.
- Scheduled evaluation lives at `GET /api/cron/alerts` and is registered in
  `vercel.json` (`30 2 * * *`). Set `CRON_SECRET` in Vercel — Vercel Cron sends
  it as `Authorization: Bearer $CRON_SECRET`, and the route returns 503 without a
  configured secret, 401 with a wrong one.
- Vercel Hobby only runs cron jobs **once per day**. On Hobby, alerts therefore
  evaluate daily; the watchlist "Refresh quotes" button evaluates on demand.
  More frequent scheduling needs Vercel Pro (~$20/month) or an external scheduler
  calling the same endpoint with the bearer secret.

## 3. What the deploy does

`vercel.json` pins the build:

```json
{
  "buildCommand": "npx prisma migrate deploy && next build",
  "installCommand": "npm ci",
  "framework": "nextjs"
}
```

- `npm ci` installs from `package-lock.json`; the `postinstall` hook runs
  `prisma generate`.
- `prisma migrate deploy` applies the committed migrations in
  `prisma/migrations/` — the explicit database step. It is idempotent, so repeat
  deploys are safe.
- `next build` compiles the app. API routes and auth are server-rendered, so no
  database access is needed at build time beyond the migration step.

## 4. Deploy

```bash
git push origin <branch>
```

Then in Vercel: **Add New → Project → import the repo → set the environment
variables → Deploy**. The first build creates the schema in your database.

If you prefer the CLI:

```bash
npx vercel
npx vercel --prod
```

## 5. First run

1. Open `https://<your-domain>` — you are redirected to `/auth/signin`.
2. Click **Create an account** and register (email + password, minimum 8 characters).
3. Add an investment from the dashboard; totals, allocation and the performance
   chart update immediately.

To load the demo portfolio into a hosted database, run the seed locally against it:

```bash
DATABASE_URL="<production-url>" npm run db:seed
```

⚠️ The seed **deletes and recreates** the `demo@wealth.app` user, so only run it on
a database where that is acceptable.

## 6. Database workflow

| Task | Command |
| --- | --- |
| Create/apply a migration locally | `npx prisma migrate dev --name <name>` |
| Apply committed migrations (deploy) | `npm run db:migrate` |
| Sync schema without migrations (prototyping) | `npm run db:push` |
| Load demo data | `npm run db:seed` |
| Inspect data | `npx prisma studio` |

Commit migration files whenever the schema changes; Vercel applies them
automatically on the next deploy.

## 7. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Build fails on `prisma migrate deploy` | `DATABASE_URL` missing, database unreachable, or a pooled URL that cannot run DDL. Use the direct connection string. |
| `Environment variable not found: DATABASE_URL` | Variable not set for the environment being built. |
| Login redirects back to `/auth/signin` | `AUTH_SECRET` missing or changed between deploys. |
| Empty dashboard after login | Expected on a fresh database — add an investment or seed. |
| Google button missing | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` not set; the app only registers the provider when both exist. |
| `Error 400: redirect_uri_mismatch` | Google rejected the callback. Register the exact `https://<domain>/api/auth/callback/google` URI on the OAuth client (see the Google sign-in setup section). |
| `OAuthAccountNotLinked` | An account with that email already exists. Sign in with the original method; Google sign-in links automatically when the address matches. |

## 8. Production notes

- Prices in `/api/prices` are a deterministic mock feed; replace with a real
  market-data provider for live quotes.
- Every holding/transaction write records a portfolio snapshot, which powers the
  performance chart. Snapshots accumulate over time.
- Auth sessions use JWTs, so no session table is required.
