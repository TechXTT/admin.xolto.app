# Repo Context — xolto-admin (admin.xolto.app)

## What this repo is

Internal admin dashboard for xolto. Manages users, operations, AI usage, billing, and business analytics. Role-gated: owner > operator > admin.

## Stack

- Next.js 14.2.0 (App Router)
- React 18, TypeScript 5.4
- Tailwind CSS (PostCSS)
- Sentry for error tracking
- Vercel Analytics
- Cookie-based auth (same as main app)

## Key routes

```
/login                  — admin login (public)
/(protected)/           — main dashboard (AdminGuard protected)
```

## Key files

- `components/AdminDashboard.tsx` — main dashboard with 8 tabs
- `components/AdminGuard.tsx` — auth protection, role check on mount
- `components/admin/tabs/` — tab components:
  - OverviewTab — summary metrics (users, AI calls, search runs)
  - UsersTab — user management (tier, role, admin flag)
  - OperationsTab — mission/search management (status, triggers)
  - UsageTab — AI call tracking (tokens, costs, models, latency)
  - ExecutiveTab — revenue tracking (owner only)
  - SubscriptionsTab — subscription management (owner only)
  - GrowthTab — funnel & cohort analysis (owner only)
  - AlertsTab — business alerts & thresholds (owner only)
- `components/ui/` — Badge, Button, Input, Modal, Table
- `lib/api.ts` — admin API client (stats, users, usage, business analytics)
- `components/format.ts` — number formatting, role normalization

## Auth & roles

- Cookie-based JWT, same refresh mechanism as main app
- AdminGuard checks /users/me on mount
- Role hierarchy: owner > operator > admin — user role is blocked
- Owner-only tabs: Executive, Subscriptions, Growth, Alerts

## Commands

```
npm run dev         # dev server on port 3002
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run format      # Prettier
```

## Conventions

- Tab-based dashboard — add new features as tabs, not new routes
- Owner-only features check role before rendering
- API client in lib/api.ts — never use raw fetch in components
- UI components in components/ui/ — reuse before creating new ones
- Format utilities in components/format.ts for consistent display

## Do not

- Expose owner-only data to operator/admin roles
- Break the AdminGuard protection
- Add new routes unless explicitly asked — use tabs
- Hardcode API URLs — use env vars

## Definition of done

1. `npm run build` passes
2. Protected routes still require auth
3. Stats/admin cards render without null crashes
4. Role gating intact (owner-only tabs hidden from lower roles)
