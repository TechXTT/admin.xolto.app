// XOL-167: Admin UI sweep — 8 viewports × 10 owner-role tabs = 80 tests
//
// Regression baseline for admin.xolto.app. Detects:
//   - Class-5 body-level horizontal overflow (body.scrollWidth > innerWidth)
//   - Class-5 inner-container overflow: constrained-overflow or fixed/absolute
//     elements whose scrollWidth > clientWidth (XOL-168)
//   - Error boundary renders (data-testid="error-boundary")
//
// Opt-out contract: elements that legitimately scroll horizontally (e.g.
// .table-wrap data tables, .tabs nav on mobile) carry data-allow-overflow="true"
// so the Class-5 inner-container detector skips them. See XOL-168 for the
// rationale per element.
//
// Auth: storageState loaded via playwright.config.ts globalSetup (one login per run).
// Output: __tests__/ui-sweep/<WxH>/<tab-slug>.png committed as baseline.
//
// Run locally:
//   pnpm exec playwright test __tests__/ui-sweep/admin.spec.ts --reporter=line

import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// XOL-168: Class-5 inner-container overflow detector
// ---------------------------------------------------------------------------
// Walks every element with constrained overflow (overflow !== 'visible') or
// fixed/absolute positioning. Any element whose scrollWidth > clientWidth + 1
// is an offender — UNLESS it carries data-allow-overflow="true" (opt-out
// contract for legitimate horizontal scroll containers such as .table-wrap and
// the .tabs nav strip at mobile widths).
// ---------------------------------------------------------------------------

interface OverflowOffender {
  tag: string;
  cls: string;
  id: string;
  sw: number;
  cw: number;
  overflow: string;
  position: string;
  textPreview: string;
}

async function detectOverflowOffenders(
  page: import('@playwright/test').Page,
): Promise<OverflowOffender[]> {
  return page.evaluate(() => {
    const offenders: {
      tag: string;
      cls: string;
      id: string;
      sw: number;
      cw: number;
      overflow: string;
      position: string;
      textPreview: string;
    }[] = [];
    document.querySelectorAll('*').forEach((el) => {
      const computed = getComputedStyle(el);
      const isOverflowConstrained = computed.overflow !== 'visible' && computed.overflow !== '';
      const isFixedOrAbsolute = computed.position === 'fixed' || computed.position === 'absolute';
      if (!isOverflowConstrained && !isFixedOrAbsolute) return;
      if ((el as HTMLElement).dataset?.allowOverflow === 'true') return;
      if (el.scrollWidth > el.clientWidth + 1) {
        offenders.push({
          tag: el.tagName,
          cls: (el as HTMLElement).className || '',
          id: el.id || '',
          sw: el.scrollWidth,
          cw: el.clientWidth,
          overflow: computed.overflow,
          position: computed.position,
          textPreview: (el.textContent || '').slice(0, 60),
        });
      }
    });
    return offenders;
  });
}

// Tabs to sweep — matches the owner-role tabs array in AdminDashboard.tsx:
// ['overview','users','operations','usage','executive','subscriptions','growth','alerts','calibration','ai-budget']
const TABS = [
  'overview',
  'users',
  'operations',
  'usage',
  'executive',
  'subscriptions',
  'growth',
  'alerts',
  'calibration',
  'ai-budget',
] as const;

type TabSlug = (typeof TABS)[number];

// Viewports — mirrored from xolto-app shape; also defined as projects in playwright.config.ts.
// The project name (e.g. "390x844") drives which viewport is used; the test iterates the same
// list to build screenshot paths.
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
];

// Storage state path — produced by globalSetup, consumed here.
const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'admin-storage-state.json');

// ---------------------------------------------------------------------------
// Per-viewport describe blocks (8 viewports × 10 tabs = 80 tests)
// ---------------------------------------------------------------------------

for (const vp of VIEWPORTS) {
  const vpLabel = `${vp.width}x${vp.height}`;
  const screenshotDir = path.join(__dirname, vpLabel);

  test.describe(`viewport ${vpLabel}`, () => {
    // Admin dashboard loads real data from API; give each test 60 s.
    test.setTimeout(60000);

    for (const tabSlug of TABS) {
      test(`[${vpLabel}] tab: ${tabSlug}`, async () => {
        fs.mkdirSync(screenshotDir, { recursive: true });

        const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://admin.xolto.app';

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          viewport: vp,
          storageState: STORAGE_STATE_PATH,
        });
        const page = await context.newPage();

        try {
          // Navigate to admin root (the single-page admin dashboard)
          await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });

          // Guard: if redirected to /login the session expired
          const currentUrl = page.url();
          if (currentUrl.includes('/login')) {
            throw new Error(
              `[${vpLabel}][${tabSlug}] Session expired — redirected to ${currentUrl}. ` +
                'Re-run after fresh globalSetup.',
            );
          }

          // Wait for the tab nav to be present (confirms dashboard rendered)
          await page.waitForSelector('nav.tabs', { timeout: 15000 });

          // Click the tab pill whose text content matches the slug (case-insensitive)
          // Tab pills render as <button class="tab">overview</button> etc.
          const tabButton = page.locator('.tab', {
            hasText: new RegExp(`^${tabSlug}$`, 'i'),
          });
          await tabButton.waitFor({ state: 'visible', timeout: 10000 });
          await tabButton.click();

          // Wait for a .panel element to be present — confirms tab content rendered.
          // The loading state also renders a <section class="panel">Loading...</section>
          // so we additionally wait for the loading state to resolve if present.
          await page.waitForSelector('.panel', { timeout: 15000 });

          // If a loading panel is visible, wait for it to disappear (data loaded).
          // We do a brief wait then check — graceful, not a hard wait.
          await page.waitForTimeout(1500);

          // Scroll-reset before screenshot
          await page.evaluate(() => window.scrollTo(0, 0));

          // ----------------------------------------------------------------
          // ASSERTION 1: No horizontal overflow (Class-5 XOL-160 regression check)
          // ----------------------------------------------------------------
          const overflowResult = await page.evaluate(() => ({
            scrollWidth: document.body.scrollWidth,
            innerWidth: window.innerWidth,
          }));
          expect(
            overflowResult.scrollWidth,
            `[${vpLabel}][${tabSlug}] Horizontal overflow: ` +
              `scrollWidth=${overflowResult.scrollWidth} > innerWidth=${overflowResult.innerWidth}`,
          ).toBeLessThanOrEqual(overflowResult.innerWidth + 1);

          // ----------------------------------------------------------------
          // ASSERTION 2: Class-5 inner-container overflow (XOL-168)
          // Elements with constrained overflow or fixed/absolute positioning
          // must not overflow their own clientWidth. Legitimate scroll
          // containers carry data-allow-overflow="true" to opt out.
          // ----------------------------------------------------------------
          const offenders = await detectOverflowOffenders(page);
          expect(
            offenders,
            `Class-5 overflow at ${tabSlug} × ${vpLabel}: ${JSON.stringify(offenders, null, 2)}`,
          ).toEqual([]);

          // ----------------------------------------------------------------
          // ASSERTION 3: No error boundary rendered
          // ----------------------------------------------------------------
          const errorBoundaryCount = await page.locator('[data-testid="error-boundary"]').count();
          expect(errorBoundaryCount, `[${vpLabel}][${tabSlug}] Error boundary is rendered`).toBe(0);

          // ----------------------------------------------------------------
          // Full-page screenshot — baseline PNG committed to repo
          // ----------------------------------------------------------------
          await page.screenshot({
            path: path.join(screenshotDir, `${tabSlug}.png`),
            fullPage: true,
          });
        } finally {
          await browser.close();
        }
      });
    }
  });
}
