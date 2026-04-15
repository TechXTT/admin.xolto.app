import { AdminAIStats, AdminSearchStats, BusinessOverview } from '../../../lib/api';
import { formatEUR, formatUSD } from '../format';

type OverviewTabProps = {
  usersCount: number;
  activeUsers: number;
  usageUsers: number;
  stats: AdminAIStats | null;
  searchStats: AdminSearchStats | null;
  isOwner: boolean;
  businessOverview: BusinessOverview | null;
};

export default function OverviewTab({
  usersCount,
  activeUsers,
  usageUsers,
  stats,
  searchStats,
  isOwner,
  businessOverview,
}: OverviewTabProps) {
  return (
    <section className="grid">
      <article className="panel metric">
        <span>Total users</span>
        <strong>{usersCount.toLocaleString()}</strong>
      </article>
      <article className="panel metric">
        <span>Active users</span>
        <strong>{activeUsers.toLocaleString()}</strong>
      </article>
      <article className="panel metric">
        <span>AI users</span>
        <strong>{usageUsers.toLocaleString()}</strong>
      </article>
      <article className="panel metric">
        <span>AI calls</span>
        <strong>{stats?.TotalCalls.toLocaleString() || '0'}</strong>
      </article>
      <article className="panel metric">
        <span>Estimated AI cost</span>
        <strong>{formatUSD(stats?.EstimatedCostUSD || 0)}</strong>
      </article>
      <article className="panel metric">
        <span>Search runs</span>
        <strong>{searchStats?.total_runs.toLocaleString() || '0'}</strong>
      </article>
      <article className="panel metric">
        <span>Search failures</span>
        <strong>{searchStats?.failed_runs.toLocaleString() || '0'}</strong>
      </article>
      <article className="panel metric">
        <span>Failure rate</span>
        <strong>{(searchStats?.failure_rate_pct || 0).toFixed(1)}%</strong>
      </article>
      {isOwner && (
        <article className="panel metric">
          <span>MRR (EUR)</span>
          <strong>{formatEUR(businessOverview?.mrr || 0)}</strong>
        </article>
      )}
      {isOwner && (
        <article className="panel metric">
          <span>Failed payments</span>
          <strong>{businessOverview?.failed_payments || 0}</strong>
        </article>
      )}
    </section>
  );
}
