# Admin UI Sweep — XOL-167

Regression baseline for `admin.xolto.app`. Captures full-page screenshots across 8 viewports × 10 owner-role tabs (80 PNGs total) and asserts no horizontal overflow and no error-boundary renders.

## Why this exists

XOL-160 fixed a Class-5 inner-container overflow on admin tabs (Users, Operations, Usage, Subscriptions, Growth) at viewports ≤640px by adding `min-width: 0` to grid children. This sweep provides a committed baseline so that regression is caught automatically on every future PR.

## Required env vars

| Variable              | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL` | Admin app base URL (default: `https://admin.xolto.app`) |
| `ADMIN_TEST_EMAIL`    | Email for the admin/owner test account                  |
| `ADMIN_TEST_PASSWORD` | Password for the admin/owner test account               |

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

**Required GitHub Secrets** (set in admin repo settings → Secrets → Actions):

- `ADMIN_TEST_EMAIL`
- `ADMIN_TEST_PASSWORD`

These must be set by the repo owner before the CI workflow can authenticate.

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
