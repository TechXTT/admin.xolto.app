import { BusinessOverview, BusinessRevenuePoint } from '../../../lib/api';
import { formatDate, formatEUR, formatMinor } from '../format';

type ExecutiveTabProps = {
  days: number;
  loadingTabData: boolean;
  businessOverview: BusinessOverview | null;
  businessRevenue: BusinessRevenuePoint[];
};

export default function ExecutiveTab({
  days,
  loadingTabData,
  businessOverview,
  businessRevenue,
}: ExecutiveTabProps) {
  const safeRevenue = businessRevenue ?? [];
  const recurringRevenue = safeRevenue.reduce((sum, point) => sum + (point.amount_paid ?? 0), 0);

  return (
    <section className="stack">
      <article className="grid">
        <article className="panel metric">
          <span>MRR</span>
          <strong>{formatEUR(businessOverview?.mrr ?? 0)}</strong>
        </article>
        <article className="panel metric">
          <span>ARR</span>
          <strong>{formatEUR(businessOverview?.arr ?? 0)}</strong>
        </article>
        <article className="panel metric">
          <span>Active paid</span>
          <strong>{(businessOverview?.active_paid_accounts ?? 0).toLocaleString()}</strong>
        </article>
        <article className="panel metric">
          <span>Churn</span>
          <strong>{(businessOverview?.churn_rate_pct ?? 0).toFixed(1)}%</strong>
        </article>
        <article className="panel metric">
          <span>Revenue ({days}d)</span>
          <strong>{formatEUR(businessOverview?.revenue_eur_30d ?? 0)}</strong>
        </article>
        <article className="panel metric">
          <span>Revenue trend</span>
          <strong>{(businessOverview?.revenue_trend_pct ?? 0).toFixed(1)}%</strong>
        </article>
      </article>
      <article className="panel">
        <h2>Revenue timeline</h2>
        {loadingTabData ? (
          <p className="subtle">Loading revenue…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th>Currency</th>
                  <th>Paid amount</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {safeRevenue.map((point) => (
                  <tr key={`${point.bucket_start}-${point.currency}`}>
                    <td>{formatDate(point.bucket_start)}</td>
                    <td>{point.currency ?? '—'}</td>
                    <td>{formatMinor(point.amount_paid ?? 0, point.currency ?? 'EUR')}</td>
                    <td>{point.invoices ?? 0}</td>
                  </tr>
                ))}
                {safeRevenue.length === 0 && (
                  <tr>
                    <td colSpan={4}>No revenue rows for the selected window.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="subtle">
          Raw paid total across currencies: {formatEUR(recurringRevenue / 100)}
        </p>
      </article>
    </section>
  );
}
