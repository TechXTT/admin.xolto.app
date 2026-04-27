'use client';

import { useEffect, useState } from 'react';
import Badge from '../ui/Badge';

// XOL-108 partner-inquiry fuse date.
// If OLX.bg partner inquiry returns negatively or unanswered by this date,
// the product reverts permanently to a `deep_link_only` outreach posture.
// Filed in Decision Log; see CLAUDE.md "Current standing priorities".
const FUSE_DATE_ISO = '2026-05-20';
const FUSE_LABEL = 'XOL-108 fuse';

type Severity = 'neutral' | 'warning' | 'alert' | 'critical';

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function computeDaysRemaining(now: Date, fuseISO: string): number {
  const [y, m, d] = fuseISO.split('-').map((part) => Number(part));
  const fuseUtc = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const todayUtc = startOfUtcDay(now);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((fuseUtc - todayUtc) / msPerDay);
}

function severityFor(days: number | null): Severity {
  if (days === null) return 'neutral';
  if (days <= 0) return 'critical';
  if (days <= 7) return 'alert';
  if (days <= 14) return 'warning';
  return 'neutral';
}

// Map severity onto the existing Badge tone vocabulary. The codebase only
// exposes default/success/warning/danger; "alert" and "critical" both map to
// danger so we don't introduce a new design-token category.
function badgeToneFor(severity: Severity): 'default' | 'warning' | 'danger' {
  if (severity === 'critical' || severity === 'alert') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'default';
}

function labelFor(days: number | null): string {
  if (days === null) return `${FUSE_LABEL} —`;
  if (days === 0) return `${FUSE_LABEL} — TODAY`;
  if (days < 0) return `${FUSE_LABEL} — FIRED (${Math.abs(days)} days ago)`;
  return `${FUSE_LABEL} — ${days} days`;
}

export default function FuseWidget() {
  // Compute days client-side so the number refreshes per page load without
  // a redeploy. Initial render returns null to avoid SSR/CSR hydration drift.
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    setDays(computeDaysRemaining(new Date(), FUSE_DATE_ISO));
  }, []);

  const severity = severityFor(days);
  const tone = badgeToneFor(severity);

  return (
    <article
      className="panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 14px',
      }}
      aria-label="XOL-108 fuse countdown"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge tone={tone}>{labelFor(days)}</Badge>
        <span className="muted-text">{FUSE_DATE_ISO}</span>
      </div>
    </article>
  );
}
