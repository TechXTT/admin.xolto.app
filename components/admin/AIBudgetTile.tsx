'use client';

import { useEffect, useRef, useState } from 'react';
import { AIBudgetSnapshot, api } from '../../lib/api';
import { formatRelativeTime, formatUSD } from './format';

// W19-23 Phase 2 — Shared snapshot poller + tile renderer.
//
// The poller is exported as a hook so both the Overview tile and the
// AI Budget tab can subscribe to the same snapshot endpoint without
// double-fetching when both surfaces are mounted in the same SPA tree
// — but the hook is stateful per-call (not deduplicated), which is
// fine here because the two surfaces are mutually exclusive (tile on
// overview tab, table+form on the AI Budget tab).
//
// Polling cadence: 60s while mounted (admin is internal; cap data
// changes slowly). 401/403 sets ownerOnly so the parent can render an
// "owner-only" message and stop the poll. Other errors are surfaced
// for transient debugging but do not stop polling — the next tick may
// recover.

const POLL_INTERVAL_MS = 60_000;

export type AIBudgetSnapshotState = {
  snapshot: AIBudgetSnapshot | null;
  loading: boolean;
  error: string | null;
  ownerOnly: boolean;
  refresh: () => Promise<void>;
};

export function useAIBudgetSnapshot(enabled: boolean): AIBudgetSnapshotState {
  const [snapshot, setSnapshot] = useState<AIBudgetSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerOnly, setOwnerOnly] = useState(false);
  // refreshCounter exists so callers can imperatively trigger a refetch
  // (e.g. after submitting an override) without restarting the poll.
  const [refreshCounter, setRefreshCounter] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    cancelledRef.current = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      setLoading(true);
      try {
        const res = await api.admin.aiBudgetSnapshot();
        if (cancelledRef.current) return;
        setSnapshot(res);
        setError(null);
        setOwnerOnly(false);
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to load AI budget.';
        const match = /\((\d{3})\)/.exec(message);
        const status = match ? Number(match[1]) : null;
        if (status === 401 || status === 403) {
          setOwnerOnly(true);
          setError(null);
          setSnapshot(null);
          // Stop polling once we know the viewer isn't allowed; markt
          // won't suddenly start permitting them mid-session.
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          return;
        }
        setError(message);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    }

    void tick();
    timer = setInterval(() => void tick(), POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      if (timer) clearInterval(timer);
    };
  }, [enabled, refreshCounter]);

  const refresh = async () => {
    setRefreshCounter((c) => c + 1);
  };

  return { snapshot, loading, error, ownerOnly, refresh };
}

// Severity tier per percentage thresholds from the task spec.
//   < 70%     neutral / brand
//   70-89%    warning (amber)
//   90-99%    alert  (red-orange)
//   >=100%    critical (red, "cap-fire active")
export type BudgetSeverity = 'neutral' | 'warning' | 'alert' | 'critical';

export function severityForPercentage(pct: number | null | undefined): BudgetSeverity {
  if (pct == null || !Number.isFinite(pct)) return 'neutral';
  if (pct >= 100) return 'critical';
  if (pct >= 90) return 'alert';
  if (pct >= 70) return 'warning';
  return 'neutral';
}

function severityFill(severity: BudgetSeverity): string {
  switch (severity) {
    case 'critical':
      return '#c63030';
    case 'alert':
      return '#e26a2c';
    case 'warning':
      return '#d4a017';
    default:
      return 'var(--brand)';
  }
}

function severityLabel(severity: BudgetSeverity): string | null {
  if (severity === 'critical') return 'cap-fire active';
  return null;
}

export function BudgetBar({
  percentage,
  severity,
}: {
  percentage: number | null | undefined;
  severity: BudgetSeverity;
}) {
  const safePct = typeof percentage === 'number' && Number.isFinite(percentage) ? percentage : 0;
  // Width is clamped to the visible 0-100% range so the bar doesn't grow
  // off the panel during cap-fire over-spend. The label still surfaces
  // ">=100%" via severityLabel + the parent label so operators see the
  // over-spend explicitly.
  const widthPct = Math.max(0, Math.min(100, safePct));
  return (
    <div
      style={{
        position: 'relative',
        height: 10,
        background: '#eef2f0',
        borderRadius: 6,
        overflow: 'hidden',
      }}
      aria-hidden
    >
      <div
        style={{
          width: `${widthPct}%`,
          height: '100%',
          background: severityFill(severity),
          borderRadius: 6,
          minWidth: safePct > 0 ? 2 : 0,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

export function formatPercentageLabel(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  if (pct >= 100) return '100%+';
  return `${Math.round(pct)}%`;
}

type AIBudgetTileProps = {
  state: AIBudgetSnapshotState;
};

// Compact tile rendered on the OverviewTab below FuseWidget. Mirrors the
// FuseWidget shape (single panel, flex row) so the two ops widgets sit
// side-by-side in the operator's eye-line.
export default function AIBudgetTile({ state }: AIBudgetTileProps) {
  const { snapshot, loading, error, ownerOnly } = state;

  if (ownerOnly) {
    return (
      <article className="panel" aria-label="AI budget — owner only">
        <p className="subtle" style={{ margin: 0 }}>
          AI Budget — owner only.
        </p>
      </article>
    );
  }

  if (error && !snapshot) {
    return (
      <article className="panel" aria-label="AI budget — error">
        <p className="error" style={{ margin: 0 }}>
          AI Budget — couldn&apos;t load snapshot.
        </p>
        <p className="subtle" style={{ margin: '4px 0 0' }}>
          {error}
        </p>
      </article>
    );
  }

  if (!snapshot) {
    return (
      <article className="panel" aria-label="AI budget — loading">
        <p className="subtle" style={{ margin: 0 }}>
          AI Budget — {loading ? 'loading…' : 'no data'}
        </p>
      </article>
    );
  }

  const spend = Number.isFinite(snapshot.rolling_24h_spend_usd)
    ? snapshot.rolling_24h_spend_usd
    : 0;
  const cap = Number.isFinite(snapshot.cap_usd) && snapshot.cap_usd > 0 ? snapshot.cap_usd : 0;
  const pct = Number.isFinite(snapshot.percentage) ? snapshot.percentage : null;
  const severity = severityForPercentage(pct);
  const oldestRel = formatRelativeTime(snapshot.oldest_entry_at);
  const overrides = Array.isArray(snapshot.recent_overrides) ? snapshot.recent_overrides : [];
  const activeOverride = overrides[0] ?? null;
  const fireLabel = severityLabel(severity);

  return (
    <article
      className="panel"
      style={{
        display: 'grid',
        gap: 8,
        padding: '12px 14px',
      }}
      aria-label="AI budget — rolling 24h"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <strong style={{ fontSize: '0.95rem' }}>AI Budget — 24h</strong>
          <span className="subtle" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatUSD(spend)} / {formatUSD(cap)} ({formatPercentageLabel(pct)})
          </span>
        </div>
        {fireLabel && (
          <span className="subtle-pill" style={{ background: '#fff3f3', color: '#9a2424' }}>
            {fireLabel}
          </span>
        )}
      </div>
      <BudgetBar percentage={pct} severity={severity} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span className="subtle" style={{ fontSize: '0.85rem' }}>
          {oldestRel ? `oldest entry: ${oldestRel}` : 'no spend in current window.'}
        </span>
        {activeOverride && (
          <span
            className="subtle-pill"
            style={{ background: '#fffbf2', color: '#7a5a00' }}
            title={activeOverride.reason || 'override active'}
          >
            OVERRIDE ACTIVE: {formatUSD(activeOverride.new_cap_usd ?? 0)} cap
            {activeOverride.set_at
              ? `, set ${formatRelativeTime(activeOverride.set_at) ?? ''}`
              : ''}
          </span>
        )}
      </div>
    </article>
  );
}
