import { BusinessAlert, BusinessOverview } from '../../../lib/api';

type AlertsTabProps = {
  loadingTabData: boolean;
  businessOverview: BusinessOverview | null;
  businessAlerts: BusinessAlert[];
};

export default function AlertsTab({
  loadingTabData,
  businessOverview,
  businessAlerts,
}: AlertsTabProps) {
  const safeAlerts = businessAlerts ?? [];

  return (
    <section className="stack">
      <article className="grid">
        <article className="panel metric">
          <span>Webhook lag</span>
          <strong>{businessOverview?.webhook_lag_minutes ?? 0} min</strong>
        </article>
        <article className="panel metric">
          <span>Reconcile lag</span>
          <strong>{businessOverview?.reconcile_lag_minutes ?? 0} min</strong>
        </article>
        <article className="panel metric">
          <span>Failed payments</span>
          <strong>{businessOverview?.failed_payments ?? 0}</strong>
        </article>
        <article className="panel metric">
          <span>Churn</span>
          <strong>{(businessOverview?.churn_rate_pct ?? 0).toFixed(1)}%</strong>
        </article>
      </article>
      <article className="panel">
        <h2>Anomaly cards</h2>
        {loadingTabData ? (
          <p className="subtle">Loading alerts…</p>
        ) : (
          <div className="stack">
            {safeAlerts.map((alert) => (
              <article key={alert.key} className={`alert-card ${alert.severity ?? ''}`}>
                <h3>{alert.title ?? 'Alert'}</h3>
                <p>{alert.description ?? ''}</p>
                <p className="subtle">
                  value: {alert.value ?? '—'} • threshold: {alert.threshold ?? '—'}
                </p>
              </article>
            ))}
            {safeAlerts.length === 0 && (
              <p className="subtle">No active business alerts for the current window.</p>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
