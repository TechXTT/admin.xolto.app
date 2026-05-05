import type { FormEvent } from 'react';
import { AdminSearchRun } from '../../../lib/api';
import { formatDate } from '../format';

type OperationsTabProps = {
  loadingTabData: boolean;
  pendingAction: string;
  missionIDInput: string;
  missionStatusInput: 'active' | 'paused' | 'completed';
  searchIDInput: string;
  searchEnabledInput: 'true' | 'false';
  runSearchIDInput: string;
  runStatus: string;
  runMarketplace: string;
  runCountry: string;
  runUser: string;
  runIncidentsOnly: boolean;
  runs: AdminSearchRun[];
  onMissionIDInputChange: (value: string) => void;
  onMissionStatusInputChange: (value: 'active' | 'paused' | 'completed') => void;
  onSearchIDInputChange: (value: string) => void;
  onSearchEnabledInputChange: (value: 'true' | 'false') => void;
  onRunSearchIDInputChange: (value: string) => void;
  onRunStatusChange: (value: string) => void;
  onRunMarketplaceChange: (value: string) => void;
  onRunCountryChange: (value: string) => void;
  onRunUserChange: (value: string) => void;
  onRunIncidentsOnlyChange: (value: boolean) => void;
  onSubmitMissionStatus: (event: FormEvent) => void;
  onSubmitSearchEnabled: (event: FormEvent) => void;
  onSubmitRunSearch: (event: FormEvent) => void;
  onRunNowFromRow: (searchID: number) => void;
};

export default function OperationsTab({
  loadingTabData,
  pendingAction,
  missionIDInput,
  missionStatusInput,
  searchIDInput,
  searchEnabledInput,
  runSearchIDInput,
  runStatus,
  runMarketplace,
  runCountry,
  runUser,
  runIncidentsOnly,
  runs,
  onMissionIDInputChange,
  onMissionStatusInputChange,
  onSearchIDInputChange,
  onSearchEnabledInputChange,
  onRunSearchIDInputChange,
  onRunStatusChange,
  onRunMarketplaceChange,
  onRunCountryChange,
  onRunUserChange,
  onRunIncidentsOnlyChange,
  onSubmitMissionStatus,
  onSubmitSearchEnabled,
  onSubmitRunSearch,
  onRunNowFromRow,
}: OperationsTabProps) {
  const safeRuns = runs ?? [];
  const filteredRuns = runIncidentsOnly
    ? safeRuns.filter((entry) => entry.status !== 'success' || entry.error_code !== '')
    : safeRuns;

  return (
    <section className="stack">
      <article className="panel">
        <h2>Operations controls</h2>
        <div className="ops-grid">
          <form className="control-card" onSubmit={onSubmitMissionStatus}>
            <h3>Mission status</h3>
            <label className="field">
              <span>Mission ID</span>
              <input
                value={missionIDInput}
                onChange={(event) => onMissionIDInputChange(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={missionStatusInput}
                onChange={(event) =>
                  onMissionStatusInputChange(
                    event.target.value as 'active' | 'paused' | 'completed',
                  )
                }
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="completed">completed</option>
              </select>
            </label>
            <button className="btn" type="submit" disabled={pendingAction === 'mission-status'}>
              Update mission
            </button>
          </form>

          <form className="control-card" onSubmit={onSubmitSearchEnabled}>
            <h3>Search enabled</h3>
            <label className="field">
              <span>Search ID</span>
              <input
                value={searchIDInput}
                onChange={(event) => onSearchIDInputChange(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Enabled</span>
              <select
                value={searchEnabledInput}
                onChange={(event) =>
                  onSearchEnabledInputChange(event.target.value as 'true' | 'false')
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <button className="btn" type="submit" disabled={pendingAction === 'search-enabled'}>
              Update search
            </button>
          </form>

          <form className="control-card" onSubmit={onSubmitRunSearch}>
            <h3>Run search now</h3>
            <label className="field">
              <span>Search ID</span>
              <input
                value={runSearchIDInput}
                onChange={(event) => onRunSearchIDInputChange(event.target.value)}
              />
            </label>
            <button className="btn" type="submit" disabled={pendingAction === 'search-run'}>
              Trigger run
            </button>
          </form>
        </div>
      </article>

      <article className="panel">
        <h2>Recent search runs</h2>
        <div className="filter-row">
          <label className="inline-field">
            <span>Status</span>
            <input
              value={runStatus}
              onChange={(event) => onRunStatusChange(event.target.value)}
              placeholder="success, search_failed"
            />
          </label>
          <label className="inline-field">
            <span>Marketplace</span>
            <input
              value={runMarketplace}
              onChange={(event) => onRunMarketplaceChange(event.target.value)}
              placeholder="marktplaats / olxbg"
            />
          </label>
          <label className="inline-field">
            <span>Country</span>
            <input
              value={runCountry}
              onChange={(event) => onRunCountryChange(event.target.value)}
              placeholder="NL / BG"
            />
          </label>
          <label className="inline-field">
            <span>User</span>
            <input
              value={runUser}
              onChange={(event) => onRunUserChange(event.target.value)}
              placeholder="user id"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={runIncidentsOnly}
              onChange={(event) => onRunIncidentsOnlyChange(event.target.checked)}
            />
            <span>Incidents only</span>
          </label>
        </div>
        {loadingTabData ? (
          <p className="subtle">Loading search runs…</p>
        ) : (
          <div className="table-wrap" data-allow-overflow="true">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>Search</th>
                  <th>Marketplace</th>
                  <th>Results</th>
                  <th>Error</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.started_at)}</td>
                    <td>{entry.status ?? '—'}</td>
                    <td>{entry.user_email || entry.user_id || '—'}</td>
                    <td>
                      {entry.search_name || `#${entry.search_config_id ?? '—'}`}
                      <div className="muted-text">mission #{entry.mission_id ?? '—'}</div>
                    </td>
                    <td>
                      {entry.marketplace_id ?? '—'} / {entry.country_code ?? '—'}
                    </td>
                    <td>
                      {entry.results_found ?? 0} results
                      <div className="muted-text">
                        {entry.new_listings ?? 0} new, {entry.deal_hits ?? 0} hits
                      </div>
                    </td>
                    <td>{entry.error_code || '—'}</td>
                    <td>
                      <button
                        className="btn muted"
                        type="button"
                        disabled={pendingAction === `row-run:${entry.search_config_id}`}
                        onClick={() => onRunNowFromRow(entry.search_config_id)}
                      >
                        Run now
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRuns.length === 0 && (
                  <tr>
                    <td colSpan={8}>No runs matched the current filters.</td>
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
