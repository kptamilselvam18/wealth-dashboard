# Wealth Dashboard

A personal investment and net-worth tracker built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Prisma** and **NextAuth**, styled with **Tailwind CSS v4**.

## Features

- Email/password authentication (plus Google sign-in when OAuth credentials are configured)
- **Dashboard** with net worth, investments, cash, liabilities and recent activity
- **Portfolio** with per-holding invested/current value, P&L, return %, allocation and performance history
- **Transactions** for buys, sells, SIPs, dividends, interest, deposits and withdrawals, with automatic holding updates
- **Analytics** with top/under performers and a monthly investment trend chart
- Cash balances and liabilities included in net worth
- **Calculator centre** — 20 deterministic calculators (SIP, step-up SIP, lumpsum, SWP, CAGR, EMI, prepayment, retirement, FIRE, goals, emergency fund, net worth, savings rate, average buy price, dividend yield, capital gains, inflation, expense-ratio drag) with charts, formulas, assumptions and CSV export
- Light / dark / system theme, persisted in the browser

## Local setup

Requirements: Node.js 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET

npx prisma migrate deploy # create the tables from prisma/migrations
npm run db:seed           # optional: demo portfolio
npm run dev
```

Generate a secret with `openssl rand -base64 32`.

Open http://localhost:3000 — you are redirected to `/auth/signin`, where new
accounts can be created from the sign-in form.

**Demo account (after seeding):** `demo@wealth.app` / `demo1234`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the finance engine unit tests (Vitest) |
| `npm run db:migrate` | Apply committed Prisma migrations |
| `npm run db:migrate:dev` | Create a migration from schema changes |
| `npm run db:push` | Sync schema without migrations (prototyping) |
| `npm run db:seed` | Reset and load the demo portfolio |

## Build status

See [ROADMAP.md](ROADMAP.md) for what is implemented and what remains. No section is
faked: unbuilt features are marked as not started rather than shown as dead UI.

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). Vercel builds run
`prisma migrate deploy && next build`, so migrations are applied on every deploy.

## API

| Route | Methods | Description |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers |
| `/api/auth/register` | POST | Create a credentials account |
| `/api/summary` | GET | Portfolio totals, allocation, holdings, history |
| `/api/assets` | GET, POST, PUT, DELETE | Assets/holdings |
| `/api/transactions` | GET, POST, DELETE | Transaction history (keeps holdings in sync) |
| `/api/prices` | GET, POST | Manual/mock prices per symbol |
| `/api/profile` | PATCH, DELETE | Update name, delete account |

## Notes

- Prices come from a deterministic mock feed in `/api/prices`; wire in a real market-data provider for live quotes.
- Portfolio snapshots are recorded whenever a holding or transaction changes, which powers the performance chart.
- `prisma/seed.mjs` creates the demo user, eight holdings, monthly SIPs, two liabilities and twelve months of snapshots.
