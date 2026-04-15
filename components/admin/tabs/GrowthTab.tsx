import { BusinessCohort, BusinessFunnel } from '../../../lib/api';

type GrowthTabProps = {
  loadingTabData: boolean;
  businessFunnel: BusinessFunnel | null;
  businessCohorts: BusinessCohort[];
};

export default function GrowthTab({
  loadingTabData,
  businessFunnel,
  businessCohorts,
}: GrowthTabProps) {
  return (
    <section className="stack">
      <article className="panel">
        <h2>Signup → Paid funnel</h2>
        {loadingTabData ? (
          <p className="subtle">Loading funnel…</p>
        ) : (
          <div className="grid">
            <article className="panel metric">
              <span>Signups</span>
              <strong>{businessFunnel?.signups || 0}</strong>
            </article>
            <article className="panel metric">
              <span>Activated</span>
              <strong>{businessFunnel?.activated || 0}</strong>
            </article>
            <article className="panel metric">
              <span>Paid</span>
              <strong>{businessFunnel?.paid || 0}</strong>
            </article>
            <article className="panel metric">
              <span>Signup→Paid</span>
              <strong>{(businessFunnel?.signup_to_paid_pct || 0).toFixed(1)}%</strong>
            </article>
            <article className="panel metric">
              <span>Activation→Paid</span>
              <strong>{(businessFunnel?.activation_to_paid_pct || 0).toFixed(1)}%</strong>
            </article>
          </div>
        )}
      </article>
      <article className="panel">
        <h2>Cohort retention</h2>
        {loadingTabData ? (
          <p className="subtle">Loading cohorts…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cohort</th>
                  <th>Users</th>
                  <th>Paid M0</th>
                  <th>Paid M1</th>
                  <th>Paid M2</th>
                  <th>Retention M1</th>
                  <th>Retention M2</th>
                  <th>Churn buckets</th>
                </tr>
              </thead>
              <tbody>
                {businessCohorts.map((row) => (
                  <tr key={row.cohort_month}>
                    <td>{row.cohort_month}</td>
                    <td>{row.users}</td>
                    <td>{row.paid_month_0}</td>
                    <td>{row.paid_month_1}</td>
                    <td>{row.paid_month_2}</td>
                    <td>{row.retention_month_1_pct.toFixed(1)}%</td>
                    <td>{row.retention_month_2_pct.toFixed(1)}%</td>
                    <td>
                      early {row.churn_bucket_early}, middle {row.churn_bucket_middle}, late{' '}
                      {row.churn_bucket_late}
                    </td>
                  </tr>
                ))}
                {businessCohorts.length === 0 && (
                  <tr>
                    <td colSpan={8}>No cohort rows available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
