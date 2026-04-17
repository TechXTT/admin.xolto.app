# xolto-admin

Internal operations dashboard for the xolto buying-copilot platform. Surfaces
business KPIs, system health, search-run telemetry, user/tier management and
Stripe subscription tooling for owners and operators.

xolto-admin is one of four xolto repos:

- `markt` — backend, Railway, `api.xolto.app`
- `xolto-app` — primary user dashboard, Vercel, `dash.xolto.app`
- `xolto-landing` — marketing site, Vercel, `www.xolto.app`
- `xolto-admin` — this repo, Vercel, **admin-gated**

## Security posture

This app is NOT a public dashboard. Treat any accidental public exposure as a
production incident.

- The Vercel deployment is admin-gated and must not be opened to the public
  web. The app assumes an authenticated admin session for every screen.
- `components/AdminGuard.tsx` runs on every protected route and redirects
  non-admin sessions back to `/login`. The guard accepts a user only if
  `is_admin === true` or `role ∈ {owner, operator, admin}`.
- The backend (`markt`) independently enforces the same predicate —
  `is_admin || role in [owner, operator, admin]` — on every `admin/*`
  endpoint. The frontend guard is defense-in-depth, never the only check.
- If you need staging access without an admin role, ask for role elevation
  on a staging user — do not bypass the guard.

## Admin-login flow

1. `pnpm dev` starts the app on `http://localhost:3002`.
2. Point `NEXT_PUBLIC_API_URL` at the backend you want to hit —
   `https://api.xolto.app` for staging/prod, or your local `markt` backend on
   `http://localhost:8000`.
3. Visit `http://localhost:3002/login` and sign in with an account that has
   `is_admin = true` or `role` in `{owner, operator, admin}`.
4. On success the login page redirects to `/`, which renders
   `AdminDashboard` inside `AdminGuard`.
5. If the account lacks admin rights, the login page surfaces
   `"This account does not have operator/owner access."` and blocks the
   redirect. The guard enforces the same predicate on every navigation.
6. If you do not have admin credentials locally: grant `is_admin = true` to
   your user in the `markt` database (`users.is_admin`) or set `role` to one
   of the accepted values. Do not edit the guard.

Auth is cookie-based (`credentials: include`). There is no local token state;
`/auth/refresh` is attempted automatically on a 401.

## Tab views

The dashboard renders one of eight tabs at a time. Owner-only tabs are hidden
from non-owner admin/operator sessions.

| Tab             | File                                         | Access     | Purpose                                                                                                 |
| --------------- | -------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `overview`      | `components/admin/tabs/OverviewTab.tsx`      | admin +    | System-wide snapshot of users, missions, searches and scoring.                                          |
| `users`         | `components/admin/tabs/UsersTab.tsx`         | admin +    | User table with role, tier, `is_admin`, created_at and per-user usage counters; inline tier/role edits. |
| `operations`    | `components/admin/tabs/OperationsTab.tsx`    | admin +    | Worker/scraper/scoring-pipeline health, recent search runs, mission/search controls, run-now triggers.  |
| `usage`         | `components/admin/tabs/UsageTab.tsx`         | admin +    | AI reasoner + feature usage per user with call-type and failure filters.                                |
| `executive`     | `components/admin/tabs/ExecutiveTab.tsx`     | owner only | Top-level business KPIs: MRR, ARR, paid accounts, churn, revenue trend.                                 |
| `subscriptions` | `components/admin/tabs/SubscriptionsTab.tsx` | owner only | Stripe subscription list with plan/cancel/resume/pause/sync actions and reconcile.                      |
| `growth`        | `components/admin/tabs/GrowthTab.tsx`        | owner only | Acquisition + activation funnel and monthly retention cohorts.                                          |
| `alerts`        | `components/admin/tabs/AlertsTab.tsx`        | owner only | Business alerts (payment failures, webhook lag, reconcile lag, anomalies).                              |

Owner-gating happens in `AdminDashboard.tsx`: `isOwner = role === 'owner'`
restricts the tab list. If you add a tab, update this table and update the
tabs array in `AdminDashboard.tsx`.

## Null-safety release gate

Admin tables historically crashed on null fields returned by the API (missing
optional fields, empty arrays omitted from the envelope, partially hydrated
business records). Every PR that reads a new API field MUST:

- Default arrays with `?? []` before mapping.
- Default numeric KPIs with `?? 0` before `toFixed`, `toLocaleString` or
  arithmetic.
- Default string displays with `?? '—'` so empty cells never render
  `undefined`.
- Manually verify against staging data containing nulls before merge. It is
  not enough to test on a fully populated seed.

The existing tabs (see `ExecutiveTab`, `GrowthTab`, `UsageTab`,
`SubscriptionsTab`) are the canonical examples — match that style.

A PR that introduces a raw `.map` on a possibly-undefined array, or a
`.toFixed` on a possibly-undefined number, should be flagged in review.

## Stack

- Next.js 14 App Router, React 18, TypeScript.
- `components/AdminGuard.tsx` wraps every protected route under
  `app/(protected)/`.
- API client in `lib/api.ts` (cookie-based auth, envelope unwrapping,
  automatic `/auth/refresh` retry).
- `@vercel/analytics` for page-view telemetry.
- `@sentry/nextjs` for error/transition monitoring.
- pnpm workspace; `next dev -p 3002` / `next start -p 3002`.

## Deploy target

- Production deploys to Vercel behind an admin-gated project.
- Default backend is `https://api.xolto.app` (Railway, see the `markt`
  repo).
- Vercel auto-populates `VERCEL_GIT_COMMIT_SHA`, which feeds
  `NEXT_PUBLIC_RELEASE` via `next.config.mjs`.

## Environment variables

Only variables actually read by the code are listed. Do not add speculative
vars here.

| Variable                 | Required    | Default                 | Purpose                                                                                                              |
| ------------------------ | ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`    | yes in prod | `http://localhost:8000` | Base URL for the `markt` backend. Set to `https://api.xolto.app` for staging/prod. Read by `lib/api.ts`.             |
| `NEXT_PUBLIC_SENTRY_DSN` | no          | unset                   | Sentry DSN for client, edge and server runtimes. When unset, Sentry initialises as a silent no-op.                   |
| `NEXT_PUBLIC_GIT_SHA`    | no          | unset                   | Local override for the release identifier used by Sentry; normally Vercel supplies the SHA automatically.            |
| `VERCEL_GIT_COMMIT_SHA`  | auto        | set by Vercel           | Populated by the Vercel build; feeds `NEXT_PUBLIC_RELEASE`.                                                          |
| `NEXT_PUBLIC_RELEASE`    | auto        | derived                 | Resolved by `next.config.mjs` from `VERCEL_GIT_COMMIT_SHA` → `NEXT_PUBLIC_GIT_SHA` → `dev`. Tagged on Sentry events. |

`NEXT_RUNTIME` is read by `instrumentation.ts` but is set by the Next.js
runtime itself; do not set it manually.

## Observability

- Sentry is wired through `instrumentation.ts`, `sentry.server.config.ts`,
  `sentry.edge.config.ts` and `instrumentation-client.ts`. `tracesSampleRate`
  is `0` — errors and router transitions only, no performance sampling.
- When `NEXT_PUBLIC_SENTRY_DSN` is unset, `Sentry.init` receives `undefined`
  and becomes a silent no-op. Local dev does not need a DSN.
- The `/monitoring` route is a Sentry tunnel and should not be treated as an
  application endpoint.

## Run locally

```bash
pnpm install
cp .env.example .env.local
# edit .env.local: point NEXT_PUBLIC_API_URL at staging (https://api.xolto.app)
# or your local markt backend (http://localhost:8000)
pnpm dev
```

App serves at `http://localhost:3002`. Sign in at
`http://localhost:3002/login` with an admin account.

Additional scripts: `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`,
`pnpm format` / `pnpm format:check`.

## Backend contract

The backend contract (verdict enum, `/matches` dual-envelope shape,
`/draft-note` schema, risk-flag set, SSE contract) is owned and documented by
the `markt` repo. Do not restate it here.

See: [`markt` README — Contracts](https://github.com/TechXTT/xolto/blob/main/README.md#contracts).

If a field we read changes, update the relevant tab and add the null-safety
fallback in the same PR.

## Do not

- Do not expose this app to the public web.
- Do not bypass `AdminGuard` for convenience.
- Do not duplicate the backend contract here.
- Do not ship a column that does not apply `?? []` / `?? 0` / `?? '—'`.
- Do not add marketing copy to the admin surface.
