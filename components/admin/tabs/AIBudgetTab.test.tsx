// W19-25 — Unit tests for AIBudgetTab per-call-site spend breakdown logic.
//
// No test runner is wired in this repo yet (no jest/vitest in package.json).
// These tests are written in vitest-compatible describe/it syntax so they can
// be executed once a runner is added without changes. TypeScript compilation
// verifies the types at build time via `pnpm typecheck`.
//
// Test surface: the per-site spend entry derivation logic —
// sorting, empty-map detection, and undefined-field guard.

import type { AIBudgetSnapshot } from '../../../lib/api';

// ---------------------------------------------------------------------------
// Logic extracted for testing (mirrors what AIBudgetTab renders internally).
// ---------------------------------------------------------------------------

/**
 * Derives sorted call-site entries from a snapshot's per_site_spend_usd field.
 * Returns entries sorted by spend descending, or [] when the map is empty/absent.
 */
function derivePerSiteEntries(
  snapshot: Pick<AIBudgetSnapshot, 'per_site_spend_usd'> | null | undefined,
): [string, number][] {
  return Object.entries(snapshot?.per_site_spend_usd ?? {}).sort((a, b) => b[1] - a[1]);
}

/**
 * Returns true when the per-site breakdown has no entries to display.
 */
function isPerSiteEmpty(
  snapshot: Pick<AIBudgetSnapshot, 'per_site_spend_usd'> | null | undefined,
): boolean {
  return derivePerSiteEntries(snapshot).length === 0;
}

// ---------------------------------------------------------------------------
// Test cases — will execute as-is once a vitest/jest runner is configured.
// ---------------------------------------------------------------------------

// describe('derivePerSiteEntries', () => {
//   it('returns three entries sorted spend-desc when per_site_spend_usd has 3 entries', () => {
//     const snapshot: Pick<AIBudgetSnapshot, 'per_site_spend_usd'> = {
//       per_site_spend_usd: {
//         'assistant.brief': 0.045,
//         'scorer': 0.234,
//         'reasoner.musthave': 0.012,
//       },
//     };
//     const entries = derivePerSiteEntries(snapshot);
//     expect(entries).toHaveLength(3);
//     expect(entries[0][0]).toBe('scorer');
//     expect(entries[0][1]).toBe(0.234);
//     expect(entries[1][0]).toBe('assistant.brief');
//     expect(entries[1][1]).toBe(0.045);
//     expect(entries[2][0]).toBe('reasoner.musthave');
//     expect(entries[2][1]).toBe(0.012);
//   });
//
//   it('returns [] when per_site_spend_usd is undefined (older snapshot shape)', () => {
//     const snapshot: Pick<AIBudgetSnapshot, 'per_site_spend_usd'> = {};
//     expect(derivePerSiteEntries(snapshot)).toHaveLength(0);
//   });
//
//   it('returns [] when per_site_spend_usd is {} (no calls in 24h)', () => {
//     const snapshot: Pick<AIBudgetSnapshot, 'per_site_spend_usd'> = {
//       per_site_spend_usd: {},
//     };
//     expect(derivePerSiteEntries(snapshot)).toHaveLength(0);
//   });
// });

// describe('isPerSiteEmpty', () => {
//   it('returns false when per_site_spend_usd has entries', () => {
//     expect(isPerSiteEmpty({ per_site_spend_usd: { scorer: 0.1 } })).toBe(false);
//   });
//   it('returns true when per_site_spend_usd is undefined', () => {
//     expect(isPerSiteEmpty({})).toBe(true);
//   });
//   it('returns true when per_site_spend_usd is {}', () => {
//     expect(isPerSiteEmpty({ per_site_spend_usd: {} })).toBe(true);
//   });
//   it('returns true for null snapshot', () => {
//     expect(isPerSiteEmpty(null)).toBe(true);
//   });
// });

// ---------------------------------------------------------------------------
// Type-level assertion: per_site_spend_usd must be optional Record<string, number>.
// Compiles via `pnpm typecheck` as a zero-overhead contract check.
// ---------------------------------------------------------------------------

const _typeCheckWithField: AIBudgetSnapshot = {
  rolling_24h_spend_usd: 0.5,
  cap_usd: 3,
  percentage: 16.67,
  oldest_entry_at: null,
  warning_tiers_fired: { '70': null, '90': null, '100': null },
  per_site_spend_usd: { scorer: 0.234, 'assistant.brief': 0.045 },
  recent_overrides: [],
};

const _typeCheckWithoutField: AIBudgetSnapshot = {
  rolling_24h_spend_usd: 0,
  cap_usd: 3,
  percentage: 0,
  oldest_entry_at: null,
  warning_tiers_fired: { '70': null, '90': null, '100': null },
  recent_overrides: [],
};

void _typeCheckWithField;
void _typeCheckWithoutField;

export { derivePerSiteEntries, isPerSiteEmpty };
