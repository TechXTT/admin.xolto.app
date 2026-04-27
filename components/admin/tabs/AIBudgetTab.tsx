'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import AIBudgetTile, {
  BudgetBar,
  formatPercentageLabel,
  severityForPercentage,
  useAIBudgetSnapshot,
} from '../AIBudgetTile';
import { formatDate, formatRelativeTime, formatUSD } from '../format';
import Modal from '../../ui/Modal';

// W19-23 Phase 2 — AI Budget tab.
//
// Owner-only surface for inspecting the rolling-24h spend and audit log,
// plus issuing a $-cap override (POST /admin/ai-budget/override).
//
// Founder-locked constraint per Decision Log 2026-04-27: the $3/day cap
// stays $3 until founder explicitly raises. The override form is
// gated by:
//   - owner role (markt-side: operator-or-owner; UI gates further to
//     owner only — non-owner viewers don't reach this tab via tab bar)
//   - confirmation modal that names the cap and reason before POST
//   - mandatory reason >= 10 chars
//   - audit-log table immediately below the form
// All four exist for operational discipline; markt's audit row is the
// canonical record.

type AIBudgetTabProps = {
  isOwner: boolean;
};

const MIN_REASON_LEN = 10;
const MIN_CAP = 0.5;
const MAX_CAP = 100;

export default function AIBudgetTab({ isOwner }: AIBudgetTabProps) {
  const state = useAIBudgetSnapshot(isOwner);
  const { snapshot, error: snapshotError, ownerOnly } = state;

  const [capInput, setCapInput] = useState('3');
  const [reasonInput, setReasonInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isOwner) {
    return (
      <section className="panel">
        <h2>AI Budget</h2>
        <p className="subtle">This view is owner-only.</p>
      </section>
    );
  }

  if (ownerOnly) {
    return (
      <section className="panel">
        <h2>AI Budget</h2>
        <p className="subtle">This view is owner-only.</p>
      </section>
    );
  }

  const cap = Number.isFinite(snapshot?.cap_usd) && (snapshot?.cap_usd ?? 0) > 0
    ? (snapshot!.cap_usd as number)
    : 0;
  const spend = Number.isFinite(snapshot?.rolling_24h_spend_usd)
    ? (snapshot!.rolling_24h_spend_usd as number)
    : 0;
  const pct = Number.isFinite(snapshot?.percentage) ? (snapshot!.percentage as number) : null;
  const severity = severityForPercentage(pct);
  const overrides = Array.isArray(snapshot?.recent_overrides)
    ? snapshot!.recent_overrides
    : [];

  const parsedCap = Number(capInput);
  const capValid =
    Number.isFinite(parsedCap) && parsedCap >= MIN_CAP && parsedCap <= MAX_CAP;
  const reasonTrimmed = reasonInput.trim();
  const reasonValid = reasonTrimmed.length >= MIN_REASON_LEN;
  const formValid = capValid && reasonValid;

  function openConfirm() {
    setSubmitError(null);
    setSubmitNotice(null);
    if (!formValid) {
      if (!capValid) setSubmitError(`new_cap_usd must be between ${MIN_CAP} and ${MAX_CAP}.`);
      else if (!reasonValid)
        setSubmitError(`reason must be at least ${MIN_REASON_LEN} characters.`);
      return;
    }
    setConfirmOpen(true);
  }

  async function submitOverride() {
    if (!formValid) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);
    try {
      const res = await api.admin.aiBudgetOverride({
        new_cap_usd: parsedCap,
        reason: reasonTrimmed,
      });
      setSubmitNotice(
        `Cap set to ${formatUSD(res.cap_usd ?? parsedCap)} at ${
          res.set_at ? formatDate(res.set_at) : 'now'
        }.`,
      );
      setReasonInput('');
      setConfirmOpen(false);
      await state.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to set override.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stack">
      <article className="panel">
        <p className="eyebrow">W19-23 Phase 2 — owner only</p>
        <h2 style={{ margin: '4px 0 0' }}>AI Budget</h2>
        <p className="subtle" style={{ margin: '4px 0 0' }}>
          Rolling 24h AI-spend cap. Per-call-site graceful degradation, Sentry alerting, and
          owner override.
        </p>
      </article>

      {/* Current state — full readout. The compact tile component is reused
          so visual language matches the overview-tab tile exactly. */}
      <AIBudgetTile state={state} />

      <article className="panel">
        <h2 style={{ marginBottom: 4 }}>Current state</h2>
        <p className="subtle" style={{ marginTop: 0 }}>
          {snapshotError
            ? snapshotError
            : 'Snapshot polled every 60s while this tab is mounted.'}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 8,
          }}
        >
          <div>
            <span className="subtle">Rolling 24h spend</span>
            <strong style={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {formatUSD(spend)}
            </strong>
          </div>
          <div>
            <span className="subtle">Current cap</span>
            <strong style={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {formatUSD(cap)}
            </strong>
          </div>
          <div>
            <span className="subtle">Utilisation</span>
            <strong style={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {formatPercentageLabel(pct)}
            </strong>
          </div>
          <div>
            <span className="subtle">Oldest entry</span>
            <strong style={{ display: 'block' }}>
              {formatRelativeTime(snapshot?.oldest_entry_at) ?? 'no spend in window'}
            </strong>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <BudgetBar percentage={pct} severity={severity} />
        </div>
      </article>

      {/* Override form — guardrail copy first, form second. */}
      <article className="panel">
        <h2 style={{ marginBottom: 4 }}>Override cap</h2>
        <p
          className="subtle"
          style={{
            marginTop: 0,
            background: '#fffbf2',
            border: '1px solid #f2d39e',
            borderRadius: 8,
            padding: 10,
          }}
        >
          The $3/day cap is founder-locked per Decision Log 2026-04-27. Override only when
          explicit founder approval received. Reason field is mandatory and audit-logged.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 12,
          }}
        >
          <label className="inline-field">
            <span>New cap (USD)</span>
            <input
              type="number"
              step={0.5}
              min={MIN_CAP}
              max={MAX_CAP}
              value={capInput}
              onChange={(event) => setCapInput(event.target.value)}
              disabled={submitting}
            />
          </label>
        </div>

        <label className="inline-field" style={{ marginTop: 12, display: 'grid' }}>
          <span>Reason (min {MIN_REASON_LEN} chars, audit-logged)</span>
          <textarea
            rows={3}
            value={reasonInput}
            onChange={(event) => setReasonInput(event.target.value)}
            disabled={submitting}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 10px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
            placeholder="e.g. scaling test for cohort-1 onboarding"
          />
        </label>

        {!capValid && capInput.length > 0 && (
          <p className="subtle" style={{ marginTop: 6, color: '#9a2424' }}>
            new_cap_usd must be a number between {MIN_CAP} and {MAX_CAP}.
          </p>
        )}
        {!reasonValid && reasonInput.length > 0 && (
          <p className="subtle" style={{ marginTop: 6, color: '#9a2424' }}>
            reason must be at least {MIN_REASON_LEN} characters.
          </p>
        )}

        {submitError && (
          <p className="error" style={{ marginTop: 10 }}>
            {submitError}
          </p>
        )}
        {submitNotice && (
          <p className="notice" style={{ marginTop: 10 }}>
            {submitNotice}
          </p>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={openConfirm}
            disabled={submitting || !formValid}
          >
            Set override
          </button>
          <button
            type="button"
            className="btn muted"
            onClick={() => {
              setReasonInput('');
              setCapInput(String(cap || 3));
              setSubmitError(null);
              setSubmitNotice(null);
            }}
            disabled={submitting}
          >
            Reset
          </button>
        </div>
      </article>

      {/* Audit log */}
      <article className="panel">
        <h2 style={{ marginBottom: 4 }}>Audit log — recent overrides</h2>
        <p className="subtle" style={{ marginTop: 0 }}>
          Sourced from markt&apos;s `ai_budget_overrides` table. Newest first.
        </p>
        {overrides.length === 0 ? (
          <p className="subtle" style={{ marginTop: 12 }}>
            No overrides recorded.
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Set at</th>
                  <th>New cap</th>
                  <th>Reason</th>
                  <th>Set by</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((entry, idx) => (
                  <tr key={`${entry.set_at}-${idx}`}>
                    <td>
                      <span title={entry.set_at}>
                        {formatRelativeTime(entry.set_at) ?? formatDate(entry.set_at)}
                      </span>
                      <div className="muted-text" style={{ fontSize: '0.78rem' }}>
                        {formatDate(entry.set_at)}
                      </div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatUSD(
                        Number.isFinite(entry.new_cap_usd) ? entry.new_cap_usd : 0,
                      )}
                    </td>
                    <td>{entry.reason || '—'}</td>
                    <td className="muted-text">{entry.set_by_user_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <Modal
        open={confirmOpen}
        title="Confirm AI budget override"
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
      >
        <p style={{ margin: '8px 0' }}>
          Set cap to <strong>{formatUSD(parsedCap)}</strong>? This is audit-logged.
        </p>
        <p className="subtle" style={{ margin: '0 0 12px' }}>
          Reason: {reasonTrimmed}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            className="btn muted"
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void submitOverride()}
            disabled={submitting || !formValid}
          >
            {submitting ? 'Setting…' : 'Confirm override'}
          </button>
        </div>
      </Modal>
    </section>
  );
}
