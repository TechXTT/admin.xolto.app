// XOL-167: Admin UI sweep regression baseline config
// Mirrors xolto-app shape; admin-specific differences noted inline.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Spec files for the admin sweep
  testMatch: '__tests__/ui-sweep/admin.spec.ts',

  // Playwright runtime artifacts (traces, .last-run.json, failure screenshots) go here.
  // MUST NOT be test-results/ — the Class-8 gate treats any content in test-results/ as
  // evidence of a failed test. Keep this path in sync with .gitignore and admin-ui-sweep.yml.
  outputDir: 'playwright-failures',

  // One-time login before the whole suite runs
  globalSetup: './__tests__/ui-sweep/global-setup.ts',

  use: {
    // baseURL is set via env; falls back to production admin URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://admin.xolto.app',

    // Load the storageState produced by globalSetup so every test starts authenticated
    storageState: '__tests__/.auth/admin-storage-state.json',

    // Headless Chromium — consistent with xolto-app shape
    browserName: 'chromium',
    headless: true,

    // Cookie-based auth requires credentials to be included on every request
    // (Playwright storageState handles cookies automatically; this is belt-and-suspenders)
    ignoreHTTPSErrors: false,

    // XOL-171: Vercel Deployment Protection bypass for preview URLs.
    // When VERCEL_AUTOMATION_BYPASS_SECRET is set (CI on PRs), inject the bypass
    // headers so Playwright can reach the password-protected preview deployment.
    // x-vercel-set-bypass-cookie ensures Playwright's storageState picks up the
    // bypass cookie, keeping subsequent navigations authenticated past the initial fetch.
    // When the secret is absent (local runs against prod), the block is empty and
    // no headers are added — no behavior change for existing local/prod runs.
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          extraHTTPHeaders: {
            'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
            'x-vercel-set-bypass-cookie': 'true',
          },
        }
      : {}),
  },

  // 8 viewports: mobile → tablet → desktop
  // Names drive the screenshot directory slug: __tests__/ui-sweep/<name>/<tab>.png
  projects: [
    { name: '320x568', use: { viewport: { width: 320, height: 568 } } },
    { name: '375x667', use: { viewport: { width: 375, height: 667 } } },
    { name: '390x844', use: { viewport: { width: 390, height: 844 } } },
    { name: '414x896', use: { viewport: { width: 414, height: 896 } } },
    { name: '430x932', use: { viewport: { width: 430, height: 932 } } },
    { name: '768x1024', use: { viewport: { width: 768, height: 1024 } } },
    { name: '1024x768', use: { viewport: { width: 1024, height: 768 } } },
    { name: '1280x720', use: { viewport: { width: 1280, height: 720 } } },
  ],

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-junit/junit.xml' }],
  ],
});
