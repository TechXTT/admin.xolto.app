import { AdminAIStats, AdminSearchStats, BusinessOverview } from '../../../lib/api';
import AIBudgetTile, { useAIBudgetSnapshot } from '../AIBudgetTile';
import FuseWidget from '../FuseWidget';
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
  // W19-23 Phase 2 — AI Budget tile.
  // Owner-only by spec; non-owner viewers see nothing in this slot.
  // The hook self-disables when isOwner=false so we don't poll for
  // operators or admins.
  const aiBudgetState = useAIBudgetSnapshot(isOwner);
  return (
    <div className="stack">
      <FuseWidget />
      {isOwner && <AIBudgetTile state={aiBudgetState} />}
      <section className="grid">
        <article className="panel metric">
          <span>Total users</span>
          <strong>{(usersCount ?? 0).toLocaleString()}</strong>
        </article>
        <article className="panel metric">
          <span>Active users</span>
          <strong>{(activeUsers ?? 0).toLocaleString()}</strong>
        </article>
        <article className="panel metric">
          <span>AI users</span>
          <strong>{(usageUsers ?? 0).toLocaleString()}</strong>
        </article>
        <article className="panel metric">
          <span>AI calls</span>
          <strong>{(stats?.TotalCalls ?? 0).toLocaleString()}</strong>
        </article>
        <article className="panel metric">
          <span>Estimated AI cost</span>
          <strong>{formatUSD(stats?.EstimatedCostUSD ?? 0)}</strong>
        </article>
        <article className="panel metric">
          <span>Search runs</span>
          <strong>{(searchStats?.total_runs ?? 0).toLocaleString()}</strong>
        </article>
        <article className="panel metric">
          <span>Search failures</span>
          <strong>{(searchStats?.failed_runs ?? 0).toLocaleString()}</strong>
        </article>
        <article className="panel metric">
          <span>Failure rate</span>
          <strong>{(searchStats?.failure_rate_pct ?? 0).toFixed(1)}%</strong>
        </article>
        {isOwner && (
          <article className="panel metric">
            <span>MRR (EUR)</span>
            <strong>{formatEUR(businessOverview?.mrr ?? 0)}</strong>
          </article>
        )}
        {isOwner && (
          <article className="panel metric">
            <span>Failed payments</span>
            <strong>{businessOverview?.failed_payments ?? 0}</strong>
          </article>
        )}
      </section>
    </div>
  );
}
