# Product Roadmap & Build Status

Legend: ✅ done · 🚧 in progress · ⬜ not started

## Phase 1 — Foundation

| Item | Status | Notes |
| --- | --- | --- |
| Next.js 16 + TypeScript + Tailwind v4 app | ✅ | App Router, React 19 |
| Design tokens, light/dark theme | ✅ | Semantic colour tokens in `globals.css` |
| App shell + responsive sidebar navigation | ✅ | Desktop sidebar, mobile drawer |
| Email/password auth + registration | ✅ | NextAuth v5, JWT sessions, bcrypt |
| Google sign-in | 🚧 | Code ready; needs redirect URI in Google Cloud Console |
| PostgreSQL schema + migrations | ✅ | Users, assets, holdings, transactions, prices, snapshots, goals, liabilities |
| Portfolio + transaction management | ✅ | Add/edit holdings, buy/sell/SIP/dividend/deposit, delete with reversal |
| Dashboard (net worth, P&L, allocation, performance) | ✅ | Live data via `/api/summary` |
| Deterministic finance engine | ✅ | 26 unit tests (`npm test`) |
| Calculator centre | ✅ | 20 calculators, search, category filter, CSV export |
| CSV import | ⬜ | Next foundation item |
| Budget, income & expense tracking | ⬜ | Schema models designed, UI pending |
| Financial Health / Power Age v1 | ✅ | Six weighted factors, unknown-data handling, saved check-ins with history chart, optional income/expenses/age profile, milestone-based financial age |
| Goals & planning | ✅ | Create, edit, archive and delete goals; record contributions; progress, months remaining, required monthly contribution and on-track status; feeds the Financial Health goal factor |

## Phase 2 — Investment insights

| Item | Status |
| --- | --- |
| Watchlists & alerts | ✅ | Multiple watchlists, provider quotes or manual prices, above/below/percentage-change rules with crossing detection, in-app alert history and read state. Evaluated on manual refresh and the daily cron. |
| Financial progress timeline | ⬜ |
| What-if simulator | ⬜ |
| Portfolio allocation simulator | ⬜ |
| Market-data adapters, quote cache, scheduled alerts | ✅ | Yahoo Finance + MFAPI adapters behind a provider interface, DB-backed 15-minute cache with stale fallback, manual prices preserved, `/api/cron/alerts` with `CRON_SECRET` (daily schedule on Vercel Hobby) |
| Email alert digests | ✅ | One digest per run via Brevo (free 300/day, verified sender without a domain), opt-out in Profile, unnotified events retried after provider failure; in-app alerts work without email configured |
| Mutual fund / ETF tracking & NAV history | ⬜ | NAV quotes via MFAPI exist in watchlists; no fund pages or NAV history yet |
| Fund overlap, fund and stock comparison | ⬜ |
| Benchmark comparison, risk–return | ⬜ |

## Phase 3 — Advanced analytics

| Item | Status |
| --- | --- |
| Portfolio X-ray (look-through exposure) | ⬜ |
| Stock & ETF screener | ⬜ |
| CAS statement import | ⬜ |
| Retirement & goal planning suite | 🚧 | Calculators exist; goal persistence pending |
| Reports (PDF/Excel) | ⬜ |

## Phase 4 — Intelligence & expansion

| Item | Status |
| --- | --- |
| AI Financial Copilot (grounded in app data) | ⬜ |
| Tax-aware reports | 🚧 | Capital gains + post-tax calculators shipped |
| International markets and currencies | ⬜ |
| PWA / Android shell | ⬜ |

## Data providers

Watchlists resolve quotes through `src/lib/market-data`: Yahoo Finance for
stocks/ETFs/indices and MFAPI for Indian fund NAVs, cached in Postgres with
per-source timestamps and stale fallback. `/api/prices` remains deterministic mock
data. Yahoo is unofficial and delayed, so quotes are labelled and not
investment-grade; manual prices are never overwritten. See `DEPLOYMENT_GUIDE.md`
for provider limits and the optional Brevo email setup.
is presented as real.

## Known limitations

- The finance engine uses nominal constant returns; no Monte Carlo or volatility modelling yet.
- Indian tax rates are hard-coded at the post-July-2024 equity regime.
- The AI Copilot is not implemented; no AI-generated financial claims are shown anywhere.
