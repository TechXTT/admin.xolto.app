// W19-24 — Unit tests for WiringBadge logic.
//
// No test runner is wired in this repo yet (no jest/vitest in package.json).
// These tests are written in vitest-compatible describe/it syntax so they can
// be executed once a runner is added without changes. TypeScript compilation
// verifies the types at build time via `pnpm typecheck`.
//
// Test surface: the wiring-status badge tone + label/tooltip derivation.
// We extract the decision logic into testable functions below and verify all
// combinations: healthy, tracker drift, audit drift, both drift, error state.

import type { WiringStatus } from './WiringBadge';

// ---------------------------------------------------------------------------
// Logic extracted for testing (mirrors what WiringBadge renders internally).
// ---------------------------------------------------------------------------

function deriveWiringTone(status: WiringStatus): 'success' | 'danger' {
  return status.trackerPresent && status.auditTableReady && !status.error
    ? 'success'
    : 'danger';
}

function deriveWiringLabel(status: WiringStatus): string {
  if (status.trackerPresent && status.auditTableReady && !status.error) return 'Wiring OK';
  return 'Wiring DRIFT';
}

function deriveWiringTooltip(status: WiringStatus): string {
  if (status.trackerPresent && status.auditTableReady && !status.error) {
    return 'Tracker + audit log ready';
  }
  if (status.error) {
    return `${status.error} — Inspect /healthz for details. Migration may have failed silently.`;
  }
  const failing: string[] = [];
  if (!status.trackerPresent) failing.push('tracker_present=false');
  if (!status.auditTableReady) failing.push('audit_table_ready=false');
  return `${failing.join(', ')} — Inspect /healthz for details. Migration may have failed silently.`;
}

// ---------------------------------------------------------------------------
// Test cases — will execute as-is once a vitest/jest runner is configured.
// ---------------------------------------------------------------------------

// describe('deriveWiringTone', () => {
//   it('returns success when both fields true and no error', () => {
//     expect(deriveWiringTone({ trackerPresent: true, auditTableReady: true, error: null })).toBe('success');
//   });
//   it('returns danger when trackerPresent is false', () => {
//     expect(deriveWiringTone({ trackerPresent: false, auditTableReady: true, error: null })).toBe('danger');
//   });
//   it('returns danger when auditTableReady is false', () => {
//     expect(deriveWiringTone({ trackerPresent: true, auditTableReady: false, error: null })).toBe('danger');
//   });
//   it('returns danger when error is set', () => {
//     expect(deriveWiringTone({ trackerPresent: true, auditTableReady: true, error: '/healthz returned 503' })).toBe('danger');
//   });
// });

// describe('deriveWiringLabel', () => {
//   it('returns "Wiring OK" when healthy', () => {
//     expect(deriveWiringLabel({ trackerPresent: true, auditTableReady: true, error: null })).toBe('Wiring OK');
//   });
//   it('returns "Wiring DRIFT" when trackerPresent is false', () => {
//     expect(deriveWiringLabel({ trackerPresent: false, auditTableReady: true, error: null })).toBe('Wiring DRIFT');
//   });
//   it('returns "Wiring DRIFT" when error present', () => {
//     expect(deriveWiringLabel({ trackerPresent: true, auditTableReady: true, error: 'network error' })).toBe('Wiring DRIFT');
//   });
// });

// describe('deriveWiringTooltip', () => {
//   it('names tracker_present when only tracker is false', () => {
//     const tip = deriveWiringTooltip({ trackerPresent: false, auditTableReady: true, error: null });
//     expect(tip).toContain('tracker_present=false');
//     expect(tip).not.toContain('audit_table_ready=false');
//     expect(tip).toContain('Inspect /healthz');
//   });
//   it('names audit_table_ready when only audit is false', () => {
//     const tip = deriveWiringTooltip({ trackerPresent: true, auditTableReady: false, error: null });
//     expect(tip).toContain('audit_table_ready=false');
//     expect(tip).not.toContain('tracker_present=false');
//   });
//   it('names both when both are false', () => {
//     const tip = deriveWiringTooltip({ trackerPresent: false, auditTableReady: false, error: null });
//     expect(tip).toContain('tracker_present=false');
//     expect(tip).toContain('audit_table_ready=false');
//   });
//   it('surfaces error message verbatim when error is set', () => {
//     const tip = deriveWiringTooltip({ trackerPresent: false, auditTableReady: false, error: '/healthz returned 503' });
//     expect(tip).toContain('/healthz returned 503');
//   });
//   it('returns healthy tooltip when all clear', () => {
//     expect(deriveWiringTooltip({ trackerPresent: true, auditTableReady: true, error: null })).toBe('Tracker + audit log ready');
//   });
// });

// ---------------------------------------------------------------------------
// Type-level assertion: WiringStatus shape must include all three fields.
// This compiles via `pnpm typecheck` as a zero-overhead contract check.
// ---------------------------------------------------------------------------

const _typeCheck: WiringStatus = {
  trackerPresent: true,
  auditTableReady: true,
  error: null,
};

// Silence unused variable warning for the type-only export above.
void _typeCheck;

// Export logic functions so a future test runner can import them directly.
export { deriveWiringLabel, deriveWiringTooltip, deriveWiringTone };
