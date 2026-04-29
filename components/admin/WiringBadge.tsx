'use client';

import { useEffect, useRef, useState } from 'react';
import Badge from '../ui/Badge';

// W19-24 — Wiring-status badge consuming /healthz.
//
// Backend dependency: markt commit d8818ad (merged + Railway-deployed 2026-04-28).
// /healthz now returns ai_budget.tracker_present and ai_budget.audit_table_ready.
// If either field is false the wiring migration has silently failed and operators
// should inspect /healthz directly and re-run the migration.
//
// Polling cadence: 60s while mounted (same as AIBudgetTile). Errors do not stop
// polling — a transient network blip should recover on the next tick.

const POLL_INTERVAL_MS = 60_000;
const HEALTHZ_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/healthz`
  : 'http://localhost:8000/healthz';

type HealthzAiBudget = {
  tracker_present?: boolean;
  audit_table_ready?: boolean;
};

type HealthzPayload = {
  ok?: boolean;
  service?: string;
  ai_budget?: HealthzAiBudget;
};

export type WiringStatus = {
  trackerPresent: boolean;
  auditTableReady: boolean;
  error: string | null;
};

export function useWiringStatus(): WiringStatus {
  const [trackerPresent, setTrackerPresent] = useState(false);
  const [auditTableReady, setAuditTableReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function tick() {
      try {
        const res = await fetch(HEALTHZ_URL, { credentials: 'include' });
        if (cancelledRef.current) return;
        if (!res.ok) {
          setError(`/healthz returned ${res.status}`);
          return;
        }
        const payload = (await res.json()) as HealthzPayload;
        if (cancelledRef.current) return;
        const budget = payload?.ai_budget ?? {};
        setTrackerPresent(budget.tracker_present === true);
        setAuditTableReady(budget.audit_table_ready === true);
        setError(null);
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to fetch /healthz';
        setError(message);
      }
    }

    void tick();
    const timer = setInterval(() => void tick(), POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(timer);
    };
  }, []);

  return { trackerPresent, auditTableReady, error };
}

// WiringBadge renders inside OverviewTab next to AIBudgetTile.
// Success state: both tracker_present and audit_table_ready are true.
// Drift state: either field is false (or /healthz is unreachable).
export default function WiringBadge() {
  const { trackerPresent, auditTableReady, error } = useWiringStatus();

  const healthy = trackerPresent && auditTableReady && !error;
  const tone: 'success' | 'danger' = healthy ? 'success' : 'danger';

  let label: string;
  let tooltip: string;

  if (healthy) {
    label = 'Wiring OK';
    tooltip = 'Tracker + audit log ready';
  } else if (error) {
    label = 'Wiring DRIFT';
    tooltip = `${error} — Inspect /healthz for details. Migration may have failed silently.`;
  } else {
    const failing: string[] = [];
    if (!trackerPresent) failing.push('tracker_present=false');
    if (!auditTableReady) failing.push('audit_table_ready=false');
    label = 'Wiring DRIFT';
    tooltip = `${failing.join(', ')} — Inspect /healthz for details. Migration may have failed silently.`;
  }

  return (
    <article
      className="panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
      }}
      aria-label="AI wiring status"
    >
      <Badge tone={tone} title={tooltip}>
        {label}
      </Badge>
      <span className="muted-text" style={{ fontSize: '0.85rem' }}>
        /healthz · ai_budget wiring
      </span>
    </article>
  );
}
