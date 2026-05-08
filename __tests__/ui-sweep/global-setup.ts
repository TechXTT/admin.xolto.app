// XOL-167: Admin UI sweep — globalSetup
//
// Logs in once before the whole suite runs and persists the browser storageState
// (cookies) to __tests__/.auth/admin-storage-state.json.
// All spec tests load that file via playwright.config.ts `use.storageState`.
//
// Required env vars (read from process.env; set via .env.test locally or
// GitHub Secrets in CI):
//   ADMIN_TEST_EMAIL    — admin account email
//   ADMIN_TEST_PASSWORD — admin account password
//   PLAYWRIGHT_BASE_URL — optional; defaults to https://admin.xolto.app

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'admin-storage-state.json');

export default async function globalSetup(): Promise<void> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://admin.xolto.app';
  const email = process.env.ADMIN_TEST_EMAIL;
  const password = process.env.ADMIN_TEST_PASSWORD;

  if (!email) {
    throw new Error(
      'globalSetup: ADMIN_TEST_EMAIL is not set. ' +
        'Set it in .env.test (local) or GitHub Secrets (CI). ' +
        'See __tests__/ui-sweep/README.md for details.',
    );
  }
  if (!password) {
    throw new Error(
      'globalSetup: ADMIN_TEST_PASSWORD is not set. ' +
        'Set it in .env.test (local) or GitHub Secrets (CI). ' +
        'See __tests__/ui-sweep/README.md for details.',
    );
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // XOL-171: inject the Vercel Deployment Protection bypass header so globalSetup
  // can reach the preview URL. The playwright.config.ts `use.extraHTTPHeaders` only
  // applies to spec-level contexts; globalSetup creates its own context here, so we
  // must set the header explicitly. The length guard mirrors playwright.config.ts to
  // avoid injecting an empty-string bypass (which would yield a confusing Vercel 401).
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const extraHTTPHeaders =
    bypass && bypass.length > 0
      ? {
          'x-vercel-protection-bypass': bypass,
          'x-vercel-set-bypass-cookie': 'true',
        }
      : undefined;

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ...(extraHTTPHeaders ? { extraHTTPHeaders } : {}),
  });
  const page = await context.newPage();

  // Navigate to admin root — middleware will redirect to /login if unauthenticated
  await page.goto(baseURL + '/', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {
    // networkidle may not fire; fall through to URL check below
  });

  const url = page.url();
  if (url.includes('/login')) {
    // Fill the login form — selectors match LoginPage in app/login/page.tsx
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect away from /login (Next.js does window.location.replace('/'))
    await page.waitForURL((u) => !u.toString().includes('/login'), {
      timeout: 20000,
    });
  }

  // Confirm we reached an authenticated route
  const finalUrl = page.url();
  if (finalUrl.includes('/login')) {
    throw new Error(
      `globalSetup: Auth failed — still on ${finalUrl} after login attempt. ` +
        'Check ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD and that the account has admin/owner role.',
    );
  }

  // Persist cookies so all spec tests skip re-login
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
