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

Notes:

- **Use the direct (non-pooled) connection string.** `prisma migrate deploy` runs
  during the build, and pooled/pgbouncer endpoints cannot always run migrations.
  If your provider only gives a pooled URL, add the unpooled host to the
  connection string used at build time.
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` are **not** used by NextAuth v5. The app sets
  `trustHost: true`, so it works on Vercel preview and production domains
  without extra host configuration.
- For Google sign-in, add `https://<your-domain>/api/auth/callback/google` to the
  authorised redirect URIs in Google Cloud Console.

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

## 8. Production notes

- Prices in `/api/prices` are a deterministic mock feed; replace with a real
  market-data provider for live quotes.
- Every holding/transaction write records a portfolio snapshot, which powers the
  performance chart. Snapshots accumulate over time.
- Auth sessions use JWTs, so no session table is required.
