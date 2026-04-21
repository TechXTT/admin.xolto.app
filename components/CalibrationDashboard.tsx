'use client';

import { useCallback, useState } from 'react';
import { api, CalibrationSummary } from '../lib/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS = ['1d', '7d', '14d', '30d', '90d'] as const;
type WindowOption = (typeof WINDOW_OPTIONS)[number];

const MARKETPLACE_OPTIONS = ['all', 'olxbg'] as const;
type MarketplaceOption = (typeof MARKETPLACE_OPTIONS)[number];

const VERDICT_COLORS: Record<string, string> = {
  buy: '#0f8f67',
  negotiate: '#2563eb',
  ask_seller: '#d97706',
  skip: '#9b1c1c',
};

const OUTCOME_COLORS: Record<string, string> = {
  unknown: '#9ca3af',
  sent: '#2563eb',
  replied: '#7c3aed',
  won: '#0f8f67',
  lost: '#9b1c1c',
};

const DELTA_ORDER = ['very_underpriced', 'underpriced', 'fair', 'overpriced', 'very_overpriced'];

// ---------------------------------------------------------------------------
// Inline SVG bar chart — horizontal bars, no external dep
// ---------------------------------------------------------------------------

type BarDatum = { label: string; value: number; color?: string };

function BarChart({ data, maxValue }: { data: BarDatum[]; maxValue?: number }) {
  if (data.length === 0) {
    return <p className="subtle">No data.</p>;
  }
  const top = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barH = 24;
  const gap = 8;
  const labelW = 120;
  const chartW = 260;
  const totalW = labelW + chartW + 48;
  const totalH = data.length * (barH + gap);

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      width="100%"
      style={{ display: 'block', maxWidth: 520, overflow: 'visible' }}
      aria-label="bar chart"
    >
      {data.map((datum, i) => {
        const y = i * (barH + gap);
        const fill = datum.color ?? '#0f8f67';
        const barW = Math.max(2, (datum.value / top) * chartW);
        return (
          <g key={datum.label}>
            <text
              x={labelW - 6}
              y={y + barH / 2 + 5}
              textAnchor="end"
              fontSize={12}
              fill="#4b6056"
              fontFamily="Inter, Segoe UI, sans-serif"
            >
              {datum.label}
            </text>
            <rect x={labelW} y={y} width={barW} height={barH} rx={4} fill={fill} opacity={0.85} />
            <text
              x={labelW + barW + 6}
              y={y + barH / 2 + 5}
              fontSize={12}
              fill="#102019"
              fontFamily="Inter, Segoe UI, sans-serif"
            >
              {datum.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Verdict counts slice
// ---------------------------------------------------------------------------

function VerdictCountsSlice({ summary }: { summary: CalibrationSummary }) {
  const counts = summary.verdict_counts ?? {};
  const data: BarDatum[] = Object.entries(counts)
    .filter(([, v]) => typeof v === 'number')
    .map(([label, value]) => ({
      label,
      value: value as number,
      color: VERDICT_COLORS[label] ?? '#0f8f67',
    }));

  return (
    <article className="panel">
      <h2>Verdict counts</h2>
      <p className="subtle">{summary.total_events ?? 0} total events</p>
      {data.length === 0 ? <p className="subtle">No verdict data.</p> : <BarChart data={data} />}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Confidence histogram slice — one small table per verdict
// ---------------------------------------------------------------------------

function ConfidenceHistogramSlice({ summary }: { summary: CalibrationSummary }) {
  const histogram = summary.confidence_histogram ?? {};
  const verdicts = Object.keys(histogram);

  if (verdicts.length === 0) {
    return (
      <article className="panel">
        <h2>Confidence histogram</h2>
        <p className="subtle">No histogram data.</p>
      </article>
    );
  }

  return (
    <article className="panel">
      <h2>Confidence histogram</h2>
      <p className="subtle">Count per confidence band (0.1-width), by verdict.</p>
      <div className="grid" style={{ marginTop: 10 }}>
        {verdicts.map((verdict) => {
          const bands = histogram[verdict as keyof typeof histogram] ?? {};
          const bandEntries = Object.entries(bands).sort(
            ([a], [b]) => parseFloat(b) - parseFloat(a),
          );
          const color = VERDICT_COLORS[verdict] ?? '#0f8f67';
          const maxVal = Math.max(...bandEntries.map(([, v]) => v as number), 1);
          const barData: BarDatum[] = bandEntries.map(([label, value]) => ({
            label: `≥${label}`,
            value: value as number,
            color,
          }));
          return (
            <div
              key={verdict}
              style={{
                border: '1px solid #d8dfdc',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  color,
                  textTransform: 'capitalize',
                }}
              >
                {verdict.replace('_', ' ')}
              </p>
              {barData.length === 0 ? (
                <p className="subtle">No data.</p>
              ) : (
                <BarChart data={barData} maxValue={maxVal} />
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Fair-price-delta slice
// ---------------------------------------------------------------------------

function FairPriceDeltaSlice({ summary }: { summary: CalibrationSummary }) {
  const delta = summary.fair_price_delta ?? {};
  const verdicts = Object.keys(delta);

  if (verdicts.length === 0) {
    return (
      <article className="panel">
        <h2>Fair-price delta</h2>
        <p className="subtle">No fair-price delta data.</p>
      </article>
    );
  }

  return (
    <article className="panel">
      <h2>Fair-price delta</h2>
      <p className="subtle">Bucket distribution per verdict.</p>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Verdict</th>
              {DELTA_ORDER.map((bucket) => (
                <th key={bucket}>{bucket.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {verdicts.map((verdict) => {
              const buckets = delta[verdict as keyof typeof delta] ?? {};
              return (
                <tr key={verdict}>
                  <td style={{ fontWeight: 600, color: VERDICT_COLORS[verdict] ?? '#102019' }}>
                    {verdict.replace('_', ' ')}
                  </td>
                  {DELTA_ORDER.map((bucket) => (
                    <td key={bucket}>{(buckets as Record<string, number>)[bucket] ?? '—'}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Outcome attribution slice
// ---------------------------------------------------------------------------

function OutcomeAttributionSlice({ summary }: { summary: CalibrationSummary }) {
  const attribution = summary.outcome_attribution ?? {};
  const entries = Object.entries(attribution).filter(([, v]) => typeof v === 'number');

  if (entries.length === 0) {
    return (
      <article className="panel">
        <h2>Outcome attribution</h2>
        <p className="subtle">No outcome data.</p>
      </article>
    );
  }

  const total = entries.reduce((sum, [, v]) => sum + (v as number), 0);
  const data: BarDatum[] = entries.map(([label, value]) => ({
    label,
    value: value as number,
    color: OUTCOME_COLORS[label] ?? '#4b6056',
  }));

  return (
    <article className="panel">
      <h2>Outcome attribution</h2>
      <p className="subtle">
        {total} listings tracked. &ldquo;unknown&rdquo; = no outreach row (expected to dominate
        early).
      </p>
      <BarChart data={data} />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function CalibrationDashboard() {
  const [window_, setWindow] = useState<WindowOption>('7d');
  const [marketplace, setMarketplace] = useState<MarketplaceOption>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<CalibrationSummary | null>(null);
  const [fetched, setFetched] = useState(false);

  const load = useCallback(async (w: WindowOption, mp: MarketplaceOption) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.calibrationSummary({ window: w, marketplace: mp });
      setSummary(res.summary ?? null);
      setFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calibration data.');
      setSummary(null);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount
  const [didMount, setDidMount] = useState(false);
  if (!didMount) {
    setDidMount(true);
    void load(window_, marketplace);
  }

  function handleWindowChange(value: WindowOption) {
    setWindow(value);
    void load(value, marketplace);
  }

  function handleMarketplaceChange(value: MarketplaceOption) {
    setMarketplace(value);
    void load(window_, value);
  }

  const isEmpty = fetched && !loading && !error && (summary?.total_events ?? 0) === 0;

  return (
    <main className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">internal — operator only</p>
          <h1>Calibration Dashboard</h1>
        </div>
        <div className="topbar-controls">
          <label className="inline-field">
            <span>Window</span>
            <select
              value={window_}
              onChange={(e) => handleWindowChange(e.target.value as WindowOption)}
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
              onChange={(e) => handleMarketplaceChange(e.target.value as MarketplaceOption)}
              disabled={loading}
            >
              {MARKETPLACE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn muted"
            type="button"
            disabled={loading}
            onClick={() => void load(window_, marketplace)}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading && !summary && (
        <section className="panel">
          <p className="subtle">Loading calibration data…</p>
        </section>
      )}

      {isEmpty && (
        <section className="panel">
          <p className="subtle">
            No events in the selected window ({window_}) for marketplace &quot;{marketplace}&quot;.
            Shadow logging may not have data yet.
          </p>
        </section>
      )}

      {!loading && summary && (summary.total_events ?? 0) > 0 && (
        <div className="stack">
          <VerdictCountsSlice summary={summary} />
          <ConfidenceHistogramSlice summary={summary} />
          <FairPriceDeltaSlice summary={summary} />
          <OutcomeAttributionSlice summary={summary} />
        </div>
      )}
    </main>
  );
}
