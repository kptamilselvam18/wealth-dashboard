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

## Phase 2 — Investment insights

| Item | Status |
| --- | --- |
| Watchlists & alerts | ⬜ |
| Financial progress timeline | ⬜ |
| What-if simulator | ⬜ |
| Portfolio allocation simulator | ⬜ |
| Mutual fund / ETF tracking & NAV history | ⬜ |
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

No live market data is integrated yet. `/api/prices` serves **clearly labelled,
deterministic mock prices** and manual price entry. A provider adapter layer with
caching, staleness flags and per-source timestamps is required before any price
is presented as real.

## Known limitations

- The finance engine uses nominal constant returns; no Monte Carlo or volatility modelling yet.
- Indian tax rates are hard-coded at the post-July-2024 equity regime.
- The AI Copilot is not implemented; no AI-generated financial claims are shown anywhere.
