# Admin UI Sweep — XOL-167 / XOL-171

Regression baseline for `admin.xolto.app`. Captures full-page screenshots across 8 viewports × 10 owner-role tabs (80 PNGs total) and asserts no horizontal overflow and no error-boundary renders.

## Why this exists

XOL-160 fixed a Class-5 inner-container overflow on admin tabs (Users, Operations, Usage, Subscriptions, Growth) at viewports ≤640px by adding `min-width: 0` to grid children. This sweep provides a committed baseline so that regression is caught automatically on every future PR.

## Required env vars

| Variable                          | Description                                                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL`             | Admin app base URL. On PR runs, automatically set to the Vercel preview URL (XOL-171). Defaults to `https://admin.xolto.app` when unset.                                                     |
| `ADMIN_TEST_EMAIL`                | Email for the admin/owner test account                                                                                                                                                       |
| `ADMIN_TEST_PASSWORD`             | Password for the admin/owner test account                                                                                                                                                    |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | (NEW — XOL-171) Vercel protection-bypass token for preview deployments. Required to reach Vercel preview URLs that are behind Deployment Protection. Omit for local runs against production. |

The test account must have `owner` role to exercise all 10 tabs (the extra 6 owner-only tabs: executive, subscriptions, growth, alerts, calibration, ai-budget only render for owner-role viewers).

## Local credentials

Create `.env.test` at the repo root (this file is gitignored — never commit it):

```
# xolto-admin/.env.test (LOCAL ONLY - never commit)
PLAYWRIGHT_BASE_URL=https://admin.xolto.app
ADMIN_TEST_EMAIL=your-owner-account@example.com
ADMIN_TEST_PASSWORD=your-password
```

Then load it before running the sweep:

```bash
export $(cat .env.test | grep -v '^#' | xargs)
pnpm exec playwright test __tests__/ui-sweep/admin.spec.ts --reporter=line
```

Or use `dotenv-cli` if available:

```bash
pnpm exec dotenv -e .env.test -- playwright test __tests__/ui-sweep/admin.spec.ts
```

## Running locally

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install chromium

# Run the full sweep (80 tests)
pnpm test:ui-sweep

# Run a single viewport
pnpm exec playwright test __tests__/ui-sweep/admin.spec.ts --project=390x844

# Run a single tab across all viewports
pnpm exec playwright test __tests__/ui-sweep/admin.spec.ts --grep "tab: users"
```

## Updating baselines

Re-run the sweep. The PNGs are overwritten in place. Commit the updated PNGs as a new commit on the PR.

```bash
pnpm test:ui-sweep
git add __tests__/ui-sweep/
git commit -m "chore(admin): update UI sweep baselines"
```

## CI

The workflow at `.github/workflows/admin-ui-sweep.yml` runs on every pull request. On failure, screenshot diffs are uploaded as GitHub Actions artifacts.

### How `PLAYWRIGHT_BASE_URL` resolves in CI (XOL-171)

The workflow uses `patrickedqvist/wait-for-vercel-preview@v1.3.1` to poll Vercel's deployment status API for the commit SHA associated with the PR. Once the preview deployment is live, its URL is piped into `PLAYWRIGHT_BASE_URL` for the Playwright step. This means every PR sweep tests the proposed state of the code (the preview), not the pre-merge production state.

Fallback: if the `wait-for-vercel-preview` step does not produce a URL (e.g., on a direct push to main that bypasses the PR path), `PLAYWRIGHT_BASE_URL` falls back to `https://admin.xolto.app` (production).

### How Vercel Deployment Protection bypass works (XOL-171)

Vercel preview deployments are protected by password or SSO by default. The bypass mechanism uses two HTTP headers injected on every Playwright request:

- `x-vercel-protection-bypass: <secret>` — authenticates the request past Deployment Protection
- `x-vercel-set-bypass-cookie: true` — tells Vercel to set a bypass cookie in the response, so subsequent navigations (after the initial page load) also bypass protection without re-sending the header

`playwright.config.ts` injects these headers via `extraHTTPHeaders` when `VERCEL_AUTOMATION_BYPASS_SECRET` is present. When the secret is absent (local runs against production), the block is empty and no headers are added — behavior is identical to pre-XOL-171.

**Required GitHub Secrets** (set in admin repo settings → Secrets → Actions):

- `ADMIN_TEST_EMAIL` — already configured (XOL-167)
- `ADMIN_TEST_PASSWORD` — already configured (XOL-167)
- `VERCEL_AUTOMATION_BYPASS_SECRET` — NEW (XOL-171); must be set before this PR merges

**How to obtain `VERCEL_AUTOMATION_BYPASS_SECRET`:**
Vercel dashboard → admin.xolto.app project → Settings → Deployment Protection → Protection Bypass for Automation → generate token. Copy the token value and set it as a GitHub Actions secret in the admin repo.

### How to test locally against a preview URL

```bash
PLAYWRIGHT_BASE_URL=https://<your-preview-slug>.vercel.app \
  VERCEL_AUTOMATION_BYPASS_SECRET=<bypass-token> \
  ADMIN_TEST_EMAIL=your-owner-account@example.com \
  ADMIN_TEST_PASSWORD=your-password \
  pnpm exec playwright test __tests__/ui-sweep/admin.spec.ts --reporter=line --workers=2
```

The bypass headers will be automatically injected by `playwright.config.ts` when `VERCEL_AUTOMATION_BYPASS_SECRET` is set.

## Screenshot layout

```
__tests__/ui-sweep/
  320x568/
    overview.png
    users.png
    operations.png
    usage.png
    executive.png
    subscriptions.png
    growth.png
    alerts.png
    calibration.png
    ai-budget.png
  375x667/
    ... (same 10 files)
  ... (8 viewport directories total)
```

## Auth fixture

`global-setup.ts` logs in once before the suite, persists cookies to `__tests__/.auth/admin-storage-state.json`. That file is gitignored (contains session tokens). Each test loads the storageState from the playwright config.
