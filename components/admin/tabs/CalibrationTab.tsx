'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  CalibrationConfidenceHistogram,
  CalibrationFairPriceDelta,
  CalibrationOutcomeAttribution,
  CalibrationSummary,
  CalibrationVerdictCounts,
} from '../../../lib/api';
import Badge from '../../ui/Badge';

// VAL-1b — Calibration tab.
// Mounted from AdminDashboard, owner-only. Sources data from
// `api.admin.calibrationSummary` (GET /internal/calibration/summary).
//
// Bucket orderings below are the canonical left-to-right axes per the
// VAL-1a contract. Do NOT alphabetize: ordering is meaningful (signed
// delta from cheap → expensive; confidence low → high).

const WINDOW_OPTIONS = ['1d', '7d', '14d', '30d', '90d'] as const;
type WindowOption = (typeof WINDOW_OPTIONS)[number];

// Marketplace strings drawn from existing admin vocabulary
// (see OperationsTab.tsx placeholder "marktplaats / olxbg").
const MARKETPLACE_OPTIONS = ['all', 'olxbg', 'marktplaats'] as const;
type MarketplaceOption = (typeof MARKETPLACE_OPTIONS)[number];

const VERDICTS: ReadonlyArray<keyof CalibrationVerdictCounts> = [
  'buy',
  'negotiate',
  'ask_seller',
  'skip',
];

const CONFIDENCE_BUCKETS = ['0.0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'] as const;

const DELTA_BUCKETS = ['<-30%', '-30%..-10%', '-10%..+10%', '+10%..+30%', '>+30%'] as const;

const VERDICT_TONE: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  buy: 'success',
  negotiate: 'default',
  ask_seller: 'warning',
  skip: 'danger',
};

function formatVerdictLabel(verdict: string): string {
  return verdict.replace(/_/g, ' ');
}

function safePercent(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return '—';
  return `${((part / total) * 100).toFixed(1)}%`;
}

// Tiny, dependency-free horizontal bar primitive.
// Width is derived from the bar's value relative to the chart's
// max value, with a 0-count rendered as a thin baseline (visible 0).
function MiniBar({
  value,
  max,
  tone = 'brand',
}: {
  value: number;
  max: number;
  tone?: 'brand' | 'muted';
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
  const pct = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
  const fill = tone === 'muted' ? '#cbd6d0' : 'var(--brand)';
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
          width: `${pct}%`,
          height: '100%',
          background: fill,
          borderRadius: 6,
          minWidth: safeValue > 0 ? 2 : 0,
        }}
      />
    </div>
  );
}

type BucketRowProps = {
  buckets: ReadonlyArray<string>;
  values: Record<string, number> | undefined;
  max: number;
};

function BucketBars({ buckets, values, max }: BucketRowProps) {
  const safeValues = values ?? {};
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {buckets.map((bucket) => {
        const raw = safeValues[bucket];
        const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
        return (
          <div
            key={bucket}
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 36px',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span className="subtle" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {bucket}
            </span>
            <MiniBar value={value} max={max} tone={value > 0 ? 'brand' : 'muted'} />
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function maxOf(values: Record<string, number> | undefined, buckets: ReadonlyArray<string>): number {
  if (!values) return 1;
  let m = 0;
  for (const b of buckets) {
    const v = values[b];
    if (typeof v === 'number' && Number.isFinite(v) && v > m) m = v;
  }
  return m > 0 ? m : 1;
}

function VerdictDistribution({
  counts,
  totalEvents,
}: {
  counts: CalibrationVerdictCounts | undefined;
  totalEvents: number;
}) {
  const safeCounts = counts ?? {};
  // Normalize across the four canonical verdicts so a max scales the bars.
  const values = VERDICTS.map((v) => {
    const raw = safeCounts[v];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  });
  const max = Math.max(...values, 1);

  return (
    <article className="panel">
      <h2 style={{ marginBottom: 4 }}>Verdict distribution</h2>
      <p className="subtle" style={{ marginTop: 0 }}>
        Counts and share of total events.
      </p>
      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
        {VERDICTS.map((verdict, i) => {
          const value = values[i];
          const tone = VERDICT_TONE[verdict] ?? 'default';
          return (
            <div
              key={verdict}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 110px',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <Badge tone={tone}>{formatVerdictLabel(verdict)}</Badge>
              <MiniBar value={value} max={max} />
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem' }}>
                {value} ({safePercent(value, totalEvents)})
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PerVerdictHistograms({
  title,
  subtitle,
  data,
  buckets,
}: {
  title: string;
  subtitle: string;
  data: CalibrationConfidenceHistogram | CalibrationFairPriceDelta | undefined;
  buckets: ReadonlyArray<string>;
}) {
  const safeData = (data ?? {}) as Record<string, Record<string, number> | undefined>;
  return (
    <article className="panel">
      <h2 style={{ marginBottom: 4 }}>{title}</h2>
      <p className="subtle" style={{ marginTop: 0 }}>
        {subtitle}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
          marginTop: 10,
        }}
      >
        {VERDICTS.map((verdict) => {
          const verdictData = safeData[verdict];
          const tone = VERDICT_TONE[verdict] ?? 'default';
          const max = maxOf(verdictData, buckets);
          return (
            <div
              key={verdict}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 12,
                background: '#fbfdfc',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Badge tone={tone}>{formatVerdictLabel(verdict)}</Badge>
              </div>
              <BucketBars buckets={buckets} values={verdictData} max={max} />
            </div>
          );
        })}
      </div>
    </article>
  );
}

// Canonical UI buckets for outcome attribution, rendered in this fixed order.
// The wire shape from markt is a free-form `Record<string, number>` keyed by
// raw outreach_threads state (see CalibrationOutcomeAttribution in lib/api.ts).
// We classify each known state into one of the three canonical buckets, and
// any unrecognised key is counted into "other" so future markt additions
// surface visibly without crashing the dashboard.
const OUTCOME_BUCKETS = ['acted', 'skipped', 'unknown', 'other'] as const;
type OutcomeBucket = (typeof OUTCOME_BUCKETS)[number];

const OUTCOME_TONE: Record<OutcomeBucket, 'default' | 'success' | 'warning' | 'danger'> = {
  acted: 'success',
  skipped: 'danger',
  unknown: 'default',
  other: 'warning',
};

// classifyOutcomeState maps a raw outreach_threads.state value into one of the
// canonical UI buckets. This mapping is **authoritative** per the
// 2026-04-25 Decision Log entry "OutcomeAttribution: admin UI classifier is
// the canonical wire-state mapping" — markt ships raw outreach_threads.state
// counts and the UI owns the bucketing for display.
//
// Mapping (also documented in markt/internal/store/calibration.go):
//   won | sent | replied | awaiting_reply  → acted    (purchased or in-progress)
//   lost | stale                            → skipped  (gave up or aged out)
//   unknown | none                          → unknown  (no actionable signal)
// Anything else is bucketed as "other" — this keeps the UI stable if markt
// introduces new state values upstream. New states should be added here as
// they're observed; default new ones to "other" until semantics are clear.
function classifyOutcomeState(state: string): OutcomeBucket {
  switch (state) {
    case 'won':
    case 'sent':
    case 'replied':
    case 'awaiting_reply':
    case 'acted':
      return 'acted';
    case 'lost':
    case 'stale':
    case 'skipped':
      return 'skipped';
    case 'unknown':
    case 'none':
    case '':
      return 'unknown';
    default:
      return 'other';
  }
}

function OutcomeAttribution({
  attribution,
}: {
  attribution: CalibrationOutcomeAttribution | undefined;
}) {
  const safe = attribution ?? {};
  const buckets: Record<OutcomeBucket, number> = {
    acted: 0,
    skipped: 0,
    unknown: 0,
    other: 0,
  };
  for (const [state, raw] of Object.entries(safe)) {
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    if (value <= 0) continue;
    buckets[classifyOutcomeState(state)] += value;
  }

  const total = buckets.acted + buckets.skipped + buckets.unknown + buckets.other;
  const max = Math.max(buckets.acted, buckets.skipped, buckets.unknown, buckets.other, 1);

  return (
    <article className="panel">
      <h2 style={{ marginBottom: 4 }}>Outcome attribution</h2>
      <p className="subtle" style={{ marginTop: 0 }}>
        {total} listings tracked. &ldquo;unknown&rdquo; is expected to dominate before outreach
        coverage matures.
      </p>
      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
        {OUTCOME_BUCKETS.map((bucket) => {
          // Hide the "other" row when empty to keep the dashboard tidy in the
          // common case; show it only when an unrecognised wire key surfaces.
          if (bucket === 'other' && buckets.other === 0) return null;
          const value = buckets[bucket];
          const tone = OUTCOME_TONE[bucket];
          return (
            <div
              key={bucket}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 110px',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <Badge tone={tone}>{bucket}</Badge>
              <MiniBar value={value} max={max} />
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem' }}>
                {value} ({safePercent(value, total)})
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SkeletonPanel({ title, lines }: { title: string; lines: number }) {
  return (
    <article className="panel">
      <h2 style={{ marginBottom: 4 }}>{title}</h2>
      <p className="subtle" style={{ marginTop: 0 }}>
        Loading…
      </p>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 14,
              background: '#eef2f0',
              borderRadius: 6,
              width: `${60 + ((i * 13) % 35)}%`,
            }}
          />
        ))}
      </div>
    </article>
  );
}

type CalibrationTabProps = {
  isOwner: boolean;
};

export default function CalibrationTab({ isOwner }: CalibrationTabProps) {
  const [windowOpt, setWindowOpt] = useState<WindowOption>('7d');
  const [marketplace, setMarketplace] = useState<MarketplaceOption>('olxbg');
  // W19-23 Phase 2 — heuristic-fallback toggle.
  // Default OFF mirrors markt's default (excludes ai_path=heuristic_fallback
  // rows). Per Decision Log 2026-04-27, including those rows would corrupt
  // VAL-0 verdict-correctness measurements; the toggle is for ops debugging
  // only. When ON, a warning banner is rendered above the data panels.
  const [includeHeuristicFallback, setIncludeHeuristicFallback] = useState(false);
  const [summary, setSummary] = useState<CalibrationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [fetched, setFetched] = useState(false);

  const load = useCallback(
    async (w: WindowOption, mp: MarketplaceOption, includeFallback: boolean) => {
      if (!isOwner) return;
      setLoading(true);
      setError('');
      setErrorStatus(null);
      try {
        const res = await api.admin.calibrationSummary({
          window: w,
          marketplace: mp,
          includeHeuristicFallback: includeFallback,
        });
        setSummary(res?.summary ?? null);
        setFetched(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load calibration summary.';
        // apiFetch surfaces "Request failed (NNN)" — pluck the status code if present.
        const match = /\((\d{3})\)/.exec(message);
        setErrorStatus(match ? Number(match[1]) : null);
        setError(message);
        setSummary(null);
        setFetched(true);
      } finally {
        setLoading(false);
      }
    },
    [isOwner],
  );

  // Refetch on filter change (and on first owner-true mount).
  useEffect(() => {
    if (!isOwner) return;
    void load(windowOpt, marketplace, includeHeuristicFallback);
  }, [isOwner, windowOpt, marketplace, includeHeuristicFallback, load]);

  if (!isOwner) {
    return (
      <section className="panel">
        <h2>Calibration</h2>
        <p className="subtle">This view is owner-only.</p>
      </section>
    );
  }

  const totalEvents = summary && Number.isFinite(summary.total_events) ? summary.total_events : 0;
  const isEmpty = fetched && !loading && !error && totalEvents === 0;
  const showData = !loading && !error && summary && totalEvents > 0;

  return (
    <section className="stack">
      <article className="panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p className="eyebrow">VAL-1 — owner only</p>
            <h2 style={{ margin: '4px 0 0' }}>Calibration</h2>
            <p className="subtle" style={{ margin: '4px 0 0' }}>
              Is the scorer calibrated against real BG buyer behaviour?
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="inline-field">
              <span>Window</span>
              <select
                value={windowOpt}
                onChange={(event) => setWindowOpt(event.target.value as WindowOption)}
                disabled={loading}
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-field">
              <span>Marketplace</span>
              <select
                value={marketplace}
                onChange={(event) => setMarketplace(event.target.value as MarketplaceOption)}
                disabled={loading}
              >
                {MARKETPLACE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <span className="subtle-pill" aria-label="Total events">
              {loading
                ? 'loading…'
                : summary
                  ? `${totalEvents.toLocaleString()} events`
                  : '— events'}
            </span>
            <button
              type="button"
              className="btn muted"
              disabled={loading}
              onClick={() => void load(windowOpt, marketplace, includeHeuristicFallback)}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gap: 4,
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.9rem',
            }}
          >
            <input
              type="checkbox"
              checked={includeHeuristicFallback}
              disabled={loading}
              onChange={(event) => setIncludeHeuristicFallback(event.target.checked)}
            />
            <span>Include heuristic-fallback rows</span>
          </label>
          <p className="subtle" style={{ margin: 0, fontSize: '0.8rem' }}>
            Heuristic-fallback rows are scoring events created during AI-budget cap-fire. They are
            excluded from calibration measurements by default — enabling this shows ALL rows
            including the fallback path.
          </p>
        </div>
      </article>

      {includeHeuristicFallback && (
        <article
          className="panel"
          style={{
            background: '#fff3f3',
            border: '1px solid #efc1c1',
          }}
        >
          <p style={{ margin: 0, color: '#9a2424', fontWeight: 600 }}>
            Showing all rows including heuristic-fallback. These rows do NOT represent normal
            calibration data — use for ops debugging only.
          </p>
        </article>
      )}

      {error && (
        <article className="panel">
          <p className="error" style={{ marginBottom: 8 }}>
            Couldn&apos;t load calibration summary
            {errorStatus ? ` (${errorStatus})` : ''}.
          </p>
          <p className="subtle" style={{ margin: '0 0 10px' }}>
            {error}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => void load(windowOpt, marketplace, includeHeuristicFallback)}
          >
            Retry
          </button>
        </article>
      )}

      {loading && !summary && (
        <>
          <SkeletonPanel title="Verdict distribution" lines={4} />
          <SkeletonPanel title="Confidence histogram" lines={6} />
          <SkeletonPanel title="Fair-price delta" lines={6} />
        </>
      )}

      {isEmpty && (
        <article className="panel">
          <h2 style={{ marginBottom: 4 }}>No scoring events</h2>
          <p className="subtle" style={{ marginTop: 0 }}>
            No scoring events in the last {windowOpt}
            {marketplace !== 'all' ? ` for ${marketplace}` : ''}. Shadow logging may not have
            written rows yet, or the window is too narrow.
          </p>
        </article>
      )}

      {showData && summary && (
        <>
          <VerdictDistribution counts={summary.verdict_counts} totalEvents={totalEvents} />
          <PerVerdictHistograms
            title="Confidence histogram"
            subtitle="Count of events per confidence bucket, by verdict."
            data={summary.confidence_histogram}
            buckets={CONFIDENCE_BUCKETS}
          />
          <PerVerdictHistograms
            title="Fair-price delta"
            subtitle="Distribution of (listing − fair) % delta per verdict. Buy should skew negative; skip should skew positive."
            data={summary.fair_price_delta}
            buckets={DELTA_BUCKETS}
          />
          <OutcomeAttribution attribution={summary.outcome_attribution} />
        </>
      )}
    </section>
  );
}
