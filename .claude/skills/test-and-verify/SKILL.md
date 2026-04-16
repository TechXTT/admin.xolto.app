# Test and Verify — xolto-admin

Run this skill after making changes to verify nothing is broken.

## Steps

1. Run the build:
   ```
   npm run build
   ```
   If it fails, fix the errors before proceeding.

2. Run TypeScript check:
   ```
   npm run typecheck
   ```

3. Run lint:
   ```
   npm run lint
   ```

4. If any step fails, fix the issue and re-run from the beginning.

5. Confirm the following by inspecting the code:
   - AdminGuard still wraps all protected routes
   - Owner-only tabs (Executive, Subscriptions, Growth, Alerts) check role before rendering
   - API calls go through `lib/api.ts`
   - No null/undefined access on stats cards (check optional chaining on API responses)
   - No hardcoded API URLs

## When done

Report which checks passed and any issues found.
