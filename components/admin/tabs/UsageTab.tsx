import { AdminUsageEntry } from '../../../lib/api';
import { formatDate } from '../format';

type UsageTabProps = {
  usage: AdminUsageEntry[];
  loadingTabData: boolean;
  usageUserFilter: string;
  usageCallTypeFilter: string;
  usageFailuresOnly: boolean;
  onUsageUserFilterChange: (value: string) => void;
  onUsageCallTypeFilterChange: (value: string) => void;
  onUsageFailuresOnlyChange: (value: boolean) => void;
};

export default function UsageTab({
  usage,
  loadingTabData,
  usageUserFilter,
  usageCallTypeFilter,
  usageFailuresOnly,
  onUsageUserFilterChange,
  onUsageCallTypeFilterChange,
  onUsageFailuresOnlyChange,
}: UsageTabProps) {
  const safeUsage = usage ?? [];
  const usageFailures = safeUsage.filter((entry) => !entry.Success).length;
  const filteredUsage = safeUsage.filter((entry) => {
    if (usageFailuresOnly && entry.Success) return false;
    if (
      usageUserFilter &&
      !(entry.UserID ?? '').toLowerCase().includes(usageUserFilter.toLowerCase())
    ) {
      return false;
    }
    if (
      usageCallTypeFilter &&
      !(entry.CallType ?? '').toLowerCase().includes(usageCallTypeFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <section className="panel">
      <h2>Usage log</h2>
      <p className="subtle">
        {safeUsage.length} events loaded, {usageFailures} failures.
      </p>
      <div className="filter-row">
        <label className="inline-field">
          <span>User</span>
          <input
            value={usageUserFilter}
            onChange={(event) => onUsageUserFilterChange(event.target.value)}
          />
        </label>
        <label className="inline-field">
          <span>Call type</span>
          <input
            value={usageCallTypeFilter}
            onChange={(event) => onUsageCallTypeFilterChange(event.target.value)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={usageFailuresOnly}
            onChange={(event) => onUsageFailuresOnlyChange(event.target.checked)}
          />
          <span>Failures only</span>
        </label>
      </div>
      {loadingTabData ? (
        <p className="subtle">Loading usage log…</p>
      ) : (
        <div className="table-wrap" data-allow-overflow="true">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Mission</th>
                <th>Call type</th>
                <th>Model</th>
                <th>Tokens</th>
                <th>Latency</th>
                <th>Success</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsage.map((entry) => (
                <tr key={entry.ID}>
                  <td>{formatDate(entry.CreatedAt)}</td>
                  <td>{entry.UserID ?? '—'}</td>
                  <td>{(entry.MissionID ?? 0) > 0 ? `#${entry.MissionID}` : '—'}</td>
                  <td>{entry.CallType ?? '—'}</td>
                  <td>{entry.Model ?? '—'}</td>
                  <td>{(entry.TotalTokens ?? 0).toLocaleString()}</td>
                  <td>{entry.LatencyMs ?? 0} ms</td>
                  <td>{entry.Success ? 'yes' : 'no'}</td>
                  <td>{entry.ErrorMsg || '—'}</td>
                </tr>
              ))}
              {filteredUsage.length === 0 && (
                <tr>
                  <td colSpan={9}>No usage events matched the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
