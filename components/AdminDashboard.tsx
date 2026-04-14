"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AdminSearchRun,
  AdminSearchStats,
  AdminUsageEntry,
  AdminUser,
  api,
  AdminAIStats,
} from "../lib/api";

type Tab = "overview" | "users" | "operations" | "usage";

const PERIOD_OPTIONS = [7, 14, 30, 90];

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<AdminAIStats | null>(null);
  const [searchStats, setSearchStats] = useState<AdminSearchStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usage, setUsage] = useState<AdminUsageEntry[]>([]);
  const [runs, setRuns] = useState<AdminSearchRun[]>([]);
  const [loadingCore, setLoadingCore] = useState(true);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [runStatus, setRunStatus] = useState("");
  const [runMarketplace, setRunMarketplace] = useState("");
  const [runCountry, setRunCountry] = useState("");
  const [runUser, setRunUser] = useState("");
  const [runIncidentsOnly, setRunIncidentsOnly] = useState(false);

  const [usageUserFilter, setUsageUserFilter] = useState("");
  const [usageCallTypeFilter, setUsageCallTypeFilter] = useState("");
  const [usageFailuresOnly, setUsageFailuresOnly] = useState(false);

  const [missionIDInput, setMissionIDInput] = useState("");
  const [missionStatusInput, setMissionStatusInput] = useState<"active" | "paused" | "completed">("paused");
  const [searchIDInput, setSearchIDInput] = useState("");
  const [searchEnabledInput, setSearchEnabledInput] = useState<"true" | "false">("true");
  const [runSearchIDInput, setRunSearchIDInput] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});

  const activeUsers = useMemo(
    () => users.filter((entry) => entry.mission_count > 0 || entry.search_count > 0).length,
    [users],
  );
  const usageUsers = useMemo(
    () => users.filter((entry) => entry.ai_call_count > 0).length,
    [users],
  );
  const usageFailures = useMemo(
    () => usage.filter((entry) => !entry.Success).length,
    [usage],
  );

  const filteredRuns = useMemo(() => {
    if (!runIncidentsOnly) return runs;
    return runs.filter((entry) => entry.status !== "success" || entry.error_code !== "");
  }, [runs, runIncidentsOnly]);

  const filteredUsage = useMemo(() => {
    return usage.filter((entry) => {
      if (usageFailuresOnly && entry.Success) return false;
      if (usageUserFilter && !entry.UserID.toLowerCase().includes(usageUserFilter.toLowerCase())) return false;
      if (usageCallTypeFilter && !entry.CallType.toLowerCase().includes(usageCallTypeFilter.toLowerCase())) return false;
      return true;
    });
  }, [usage, usageFailuresOnly, usageUserFilter, usageCallTypeFilter]);

  async function signOut() {
    try {
      await api.auth.logout();
    } catch {
      // Ignore and force redirect.
    }
    window.location.replace("/login");
  }

  async function loadCore(selectedDays: number) {
    setLoadingCore(true);
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.admin.stats(selectedDays),
        api.admin.users(),
      ]);
      setStats(statsRes.stats);
      setSearchStats(statsRes.search_stats);
      setUsers(usersRes.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data.");
    } finally {
      setLoadingCore(false);
    }
  }

  async function loadUsage(selectedDays: number) {
    setLoadingTabData(true);
    setError("");
    try {
      const result = await api.admin.usage(Math.min(selectedDays, 90));
      setUsage(result.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage data.");
    } finally {
      setLoadingTabData(false);
    }
  }

  async function loadRuns(selectedDays: number) {
    setLoadingTabData(true);
    setError("");
    try {
      const result = await api.admin.searchRuns({
        days: selectedDays,
        limit: 200,
        status: runStatus,
        marketplace: runMarketplace,
        country: runCountry,
        user: runUser,
      });
      setRuns(result.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load search runs.");
    } finally {
      setLoadingTabData(false);
    }
  }

  useEffect(() => {
    void loadCore(days);
  }, [days]);

  useEffect(() => {
    if (tab === "usage") {
      void loadUsage(days);
      return;
    }
    if (tab === "operations") {
      void loadRuns(days);
    }
  }, [tab, days, runStatus, runMarketplace, runCountry, runUser]);

  async function applyUserTier(user: AdminUser) {
    const tier = (tierDrafts[user.id] || user.tier).trim().toLowerCase();
    if (!tier) return;
    setPendingAction(`tier:${user.id}`);
    setError("");
    setNotice("");
    try {
      await api.admin.updateUserTier(user.id, tier);
      setNotice(`Updated tier for ${user.email} to ${tier}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user tier.");
    } finally {
      setPendingAction("");
    }
  }

  async function toggleUserAdmin(user: AdminUser) {
    setPendingAction(`admin:${user.id}`);
    setError("");
    setNotice("");
    try {
      await api.admin.updateUserAdmin(user.id, !user.is_admin);
      setNotice(`Updated admin flag for ${user.email}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update admin flag.");
    } finally {
      setPendingAction("");
    }
  }

  async function submitMissionStatus(event: FormEvent) {
    event.preventDefault();
    const missionID = Number(missionIDInput);
    if (!Number.isFinite(missionID) || missionID <= 0) {
      setError("Enter a valid mission ID.");
      return;
    }
    setPendingAction("mission-status");
    setError("");
    setNotice("");
    try {
      await api.admin.updateMissionStatus(missionID, missionStatusInput);
      setNotice(`Mission ${missionID} status updated to ${missionStatusInput}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mission status.");
    } finally {
      setPendingAction("");
    }
  }

  async function submitSearchEnabled(event: FormEvent) {
    event.preventDefault();
    const searchID = Number(searchIDInput);
    if (!Number.isFinite(searchID) || searchID <= 0) {
      setError("Enter a valid search ID.");
      return;
    }
    setPendingAction("search-enabled");
    setError("");
    setNotice("");
    try {
      await api.admin.updateSearchEnabled(searchID, searchEnabledInput === "true");
      setNotice(`Search ${searchID} enabled=${searchEnabledInput}.`);
      await loadRuns(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update search enabled status.");
    } finally {
      setPendingAction("");
    }
  }

  async function submitRunSearch(event: FormEvent) {
    event.preventDefault();
    const searchID = Number(runSearchIDInput);
    if (!Number.isFinite(searchID) || searchID <= 0) {
      setError("Enter a valid search ID.");
      return;
    }
    setPendingAction("search-run");
    setError("");
    setNotice("");
    try {
      await api.admin.runSearchNow(searchID);
      setNotice(`Triggered run for search ${searchID}.`);
      await loadRuns(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger search run.");
    } finally {
      setPendingAction("");
    }
  }

  async function runNowFromRow(searchID: number) {
    setPendingAction(`row-run:${searchID}`);
    setError("");
    setNotice("");
    try {
      await api.admin.runSearchNow(searchID);
      setNotice(`Triggered run for search ${searchID}.`);
      await loadRuns(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger search run.");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <main className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">xolto-admin v1</p>
          <h1>Operations + Statistics</h1>
        </div>
        <div className="topbar-controls">
          <label className="inline-field">
            <span>Window</span>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              {PERIOD_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  Last {value} days
                </option>
              ))}
            </select>
          </label>
          <button className="btn muted" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
        {(["overview", "users", "operations", "usage"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "tab active" : "tab"}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {loadingCore ? (
        <section className="panel">Loading admin data…</section>
      ) : (
        <>
          {tab === "overview" && (
            <section className="grid">
              <article className="panel metric">
                <span>Total users</span>
                <strong>{users.length.toLocaleString()}</strong>
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
                <strong>{stats?.TotalCalls.toLocaleString() || "0"}</strong>
              </article>
              <article className="panel metric">
                <span>Estimated AI cost</span>
                <strong>{formatCost(stats?.EstimatedCostUSD || 0)}</strong>
              </article>
              <article className="panel metric">
                <span>Search runs</span>
                <strong>{searchStats?.total_runs.toLocaleString() || "0"}</strong>
              </article>
              <article className="panel metric">
                <span>Search failures</span>
                <strong>{searchStats?.failed_runs.toLocaleString() || "0"}</strong>
              </article>
              <article className="panel metric">
                <span>Search failure rate</span>
                <strong>{(searchStats?.failure_rate_pct || 0).toFixed(1)}%</strong>
              </article>
              <article className="panel metric">
                <span>Avg queue wait</span>
                <strong>{searchStats?.average_queue_wait_ms || 0} ms</strong>
              </article>
              <article className="panel metric">
                <span>Mission freshness</span>
                <strong>{searchStats?.average_mission_freshness_mins || 0} min</strong>
              </article>
            </section>
          )}

          {tab === "users" && (
            <section className="panel">
              <h2>Users</h2>
              <p className="subtle">Manage tier and admin privileges.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Tier</th>
                      <th>Admin</th>
                      <th>Missions</th>
                      <th>Searches</th>
                      <th>AI Calls</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>
                          <select
                            value={tierDrafts[user.id] ?? user.tier}
                            onChange={(event) => setTierDrafts((prev) => ({ ...prev, [user.id]: event.target.value }))}
                          >
                            <option value="free">free</option>
                            <option value="pro">pro</option>
                            <option value="power">power</option>
                          </select>
                        </td>
                        <td>{user.is_admin ? "yes" : "no"}</td>
                        <td>{user.mission_count}</td>
                        <td>{user.search_count}</td>
                        <td>{user.ai_call_count}</td>
                        <td className="actions">
                          <button
                            className="btn"
                            type="button"
                            disabled={pendingAction === `tier:${user.id}`}
                            onClick={() => void applyUserTier(user)}
                          >
                            Apply tier
                          </button>
                          <button
                            className="btn muted"
                            type="button"
                            disabled={pendingAction === `admin:${user.id}`}
                            onClick={() => void toggleUserAdmin(user)}
                          >
                            {user.is_admin ? "Revoke admin" : "Grant admin"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7}>No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "operations" && (
            <section className="stack">
              <article className="panel">
                <h2>Operations controls</h2>
                <div className="ops-grid">
                  <form className="control-card" onSubmit={submitMissionStatus}>
                    <h3>Mission status</h3>
                    <label className="field">
                      <span>Mission ID</span>
                      <input value={missionIDInput} onChange={(event) => setMissionIDInput(event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select value={missionStatusInput} onChange={(event) => setMissionStatusInput(event.target.value as "active" | "paused" | "completed")}>
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="completed">completed</option>
                      </select>
                    </label>
                    <button className="btn" type="submit" disabled={pendingAction === "mission-status"}>
                      Update mission
                    </button>
                  </form>

                  <form className="control-card" onSubmit={submitSearchEnabled}>
                    <h3>Search enabled</h3>
                    <label className="field">
                      <span>Search ID</span>
                      <input value={searchIDInput} onChange={(event) => setSearchIDInput(event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Enabled</span>
                      <select value={searchEnabledInput} onChange={(event) => setSearchEnabledInput(event.target.value as "true" | "false")}>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </label>
                    <button className="btn" type="submit" disabled={pendingAction === "search-enabled"}>
                      Update search
                    </button>
                  </form>

                  <form className="control-card" onSubmit={submitRunSearch}>
                    <h3>Run search now</h3>
                    <label className="field">
                      <span>Search ID</span>
                      <input value={runSearchIDInput} onChange={(event) => setRunSearchIDInput(event.target.value)} />
                    </label>
                    <button className="btn" type="submit" disabled={pendingAction === "search-run"}>
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
                    <input value={runStatus} onChange={(event) => setRunStatus(event.target.value)} placeholder="success, search_failed" />
                  </label>
                  <label className="inline-field">
                    <span>Marketplace</span>
                    <input value={runMarketplace} onChange={(event) => setRunMarketplace(event.target.value)} placeholder="marktplaats / olxbg" />
                  </label>
                  <label className="inline-field">
                    <span>Country</span>
                    <input value={runCountry} onChange={(event) => setRunCountry(event.target.value)} placeholder="NL / BG" />
                  </label>
                  <label className="inline-field">
                    <span>User</span>
                    <input value={runUser} onChange={(event) => setRunUser(event.target.value)} placeholder="user id" />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={runIncidentsOnly}
                      onChange={(event) => setRunIncidentsOnly(event.target.checked)}
                    />
                    <span>Incidents only</span>
                  </label>
                </div>

                {loadingTabData ? (
                  <p className="subtle">Loading search runs…</p>
                ) : (
                  <div className="table-wrap">
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
                            <td>{entry.status}</td>
                            <td>{entry.user_email || entry.user_id}</td>
                            <td>
                              {entry.search_name || `#${entry.search_config_id}`}
                              <div className="muted-text">mission #{entry.mission_id}</div>
                            </td>
                            <td>{entry.marketplace_id} / {entry.country_code}</td>
                            <td>
                              {entry.results_found} results
                              <div className="muted-text">{entry.new_listings} new, {entry.deal_hits} hits</div>
                            </td>
                            <td>{entry.error_code || "—"}</td>
                            <td>
                              <button
                                className="btn muted"
                                type="button"
                                disabled={pendingAction === `row-run:${entry.search_config_id}`}
                                onClick={() => void runNowFromRow(entry.search_config_id)}
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
          )}

          {tab === "usage" && (
            <section className="panel">
              <h2>Usage log</h2>
              <p className="subtle">
                {usage.length} events loaded, {usageFailures} failures.
              </p>
              <div className="filter-row">
                <label className="inline-field">
                  <span>User</span>
                  <input value={usageUserFilter} onChange={(event) => setUsageUserFilter(event.target.value)} />
                </label>
                <label className="inline-field">
                  <span>Call type</span>
                  <input value={usageCallTypeFilter} onChange={(event) => setUsageCallTypeFilter(event.target.value)} />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={usageFailuresOnly}
                    onChange={(event) => setUsageFailuresOnly(event.target.checked)}
                  />
                  <span>Failures only</span>
                </label>
              </div>

              {loadingTabData ? (
                <p className="subtle">Loading usage log…</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>User</th>
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
                          <td>{entry.UserID}</td>
                          <td>{entry.CallType}</td>
                          <td>{entry.Model}</td>
                          <td>{entry.TotalTokens.toLocaleString()}</td>
                          <td>{entry.LatencyMs} ms</td>
                          <td>{entry.Success ? "yes" : "no"}</td>
                          <td>{entry.ErrorMsg || "—"}</td>
                        </tr>
                      ))}
                      {filteredUsage.length === 0 && (
                        <tr>
                          <td colSpan={8}>No usage events matched the current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
