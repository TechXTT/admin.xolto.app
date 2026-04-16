# Bug Hunt — xolto-admin

Use this skill to investigate and fix bugs. Follows a reproduce-diagnose-patch-verify cycle.

## Steps

### 1. Reproduce
- Understand the reported behavior and expected behavior
- Identify the tab and component where the bug occurs
- Check if it's a data issue (API), render issue (component), or auth issue (role gating)

### 2. Diagnose
- Read the relevant tab component in `components/admin/tabs/`
- Check API calls in `lib/api.ts` — correct endpoint? correct auth?
- Check AdminGuard if it's an access issue
- Look for null/undefined access on API response data (common in stats cards)
- Check role-gating logic for owner-only features

### 3. Summarize
Before patching, state:
- **Root cause**: what exactly is wrong and why
- **Affected files**: which files need changes
- **Risk**: what else could break from the fix

### 4. Patch
- Make the minimal fix that addresses the root cause
- Keep role gating intact
- Add defensive null checks on API response data where needed
- Don't refactor unrelated code

### 5. Verify
```
npm run build
npm run typecheck
```
Both must pass. Verify the affected tab renders correctly.
