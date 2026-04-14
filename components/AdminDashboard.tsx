"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AdminAIStats,
  AdminSearchRun,
  AdminSearchStats,
  AdminUsageEntry,
  AdminUser,
  api,
  BusinessAlert,
  BusinessCohort,
  BusinessFunnel,
  BusinessOverview,
  BusinessRevenuePoint,
  BusinessSubscription,
  User,
} from "../lib/api";

type Tab =
  | "overview"
  | "users"
  | "operations"
  | "usage"
  | "executive"
  | "subscriptions"
  | "growth"
  | "alerts";

const PERIOD_OPTIONS = [7, 14, 30, 90];
type AdminRole = "owner" | "operator" | "admin" | "user";

function normalizeAdminRole(role: string | undefined, isAdmin: boolean): AdminRole {
  const value = (role || "").trim().toLowerCase();
  if (value === "owner" || value === "operator" || value === "admin" || value === "user") {
    return value;
  }
  if (isAdmin) {
    return "admin";
  }
  return "user";
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatEUR(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatMinor(amount: number, currency: string) {
  const major = (amount || 0) / 100;
  const code = (currency || "EUR").toUpperCase();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(major);
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [days, setDays] = useState(30);
  const [viewer, setViewer] = useState<User | null>(null);
  const [stats, setStats] = useState<AdminAIStats | null>(null);
  const [searchStats, setSearchStats] = useState<AdminSearchStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usage, setUsage] = useState<AdminUsageEntry[]>([]);
  const [runs, setRuns] = useState<AdminSearchRun[]>([]);
  const [businessOverview, setBusinessOverview] = useState<BusinessOverview | null>(null);
  const [businessRevenue, setBusinessRevenue] = useState<BusinessRevenuePoint[]>([]);
  const [businessSubscriptions, setBusinessSubscriptions] = useState<BusinessSubscription[]>([]);
  const [businessFunnel, setBusinessFunnel] = useState<BusinessFunnel | null>(null);
  const [businessCohorts, setBusinessCohorts] = useState<BusinessCohort[]>([]);
  const [businessAlerts, setBusinessAlerts] = useState<BusinessAlert[]>([]);
  const [loadingCore, setLoadingCore] = useState(true);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState("");

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
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

  const [subStatus, setSubStatus] = useState("");
  const [subPlan, setSubPlan] = useState("");
  const [subUser, setSubUser] = useState("");
  const [subCountry, setSubCountry] = useState("");
  const [subPriceDrafts, setSubPriceDrafts] = useState<Record<string, string>>({});

  const viewerRole = (viewer?.role || "").toLowerCase();
  const isOwner = viewerRole === "owner";

  const tabs: Tab[] = useMemo(() => {
    const base: Tab[] = ["overview", "users", "operations", "usage"];
    if (isOwner) {
      return [...base, "executive", "subscriptions", "growth", "alerts"];
    }
    return base;
  }, [isOwner]);

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
  const teamUsers = useMemo(
    () => users.filter((entry) => normalizeAdminRole(entry.role, entry.is_admin) !== "user"),
    [users],
  );
  const productUsers = useMemo(
    () => users.filter((entry) => normalizeAdminRole(entry.role, entry.is_admin) === "user"),
    [users],
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
  const recurringRevenue = useMemo(() => {
    return businessRevenue.reduce((sum, point) => sum + (point.amount_paid || 0), 0);
  }, [businessRevenue]);

  async function signOut() {
    try {
      await api.auth.logout();
    } catch {
      // Ignore and force redirect.
    }
    window.location.replace("/login");
  }

  async function loadViewer() {
    try {
      const me = await api.auth.me();
      setViewer(me);
    } catch {
      // Guard handles redirect/errors.
    }
  }

  async function loadCore(selectedDays: number) {
    setLoadingCore(true);
    setError("");
    try {
      const [statsRes, usersRes, businessOverviewRes] = await Promise.all([
        api.admin.stats(selectedDays),
        api.admin.users(),
        api.admin.businessOverview(selectedDays),
      ]);
      setStats(statsRes.stats);
      setSearchStats(statsRes.search_stats);
      setUsers(usersRes.users || []);
      setBusinessOverview(businessOverviewRes.overview || null);
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

  async function loadBusinessExecutive(selectedDays: number) {
    setLoadingTabData(true);
    setError("");
    try {
      const [overviewRes, revenueRes] = await Promise.all([
        api.admin.businessOverview(selectedDays),
        api.admin.businessRevenue(selectedDays),
      ]);
      setBusinessOverview(overviewRes.overview || null);
      setBusinessRevenue(revenueRes.points || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load executive data.");
    } finally {
      setLoadingTabData(false);
    }
  }

  async function loadBusinessSubscriptions() {
    setLoadingTabData(true);
    setError("");
    try {
      const result = await api.admin.businessSubscriptions({
        limit: 200,
        status: subStatus,
        plan: subPlan,
        user: subUser,
        country: subCountry,
      });
      setBusinessSubscriptions(result.subscriptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions.");
    } finally {
      setLoadingTabData(false);
    }
  }

  async function loadBusinessGrowth(selectedDays: number) {
    setLoadingTabData(true);
    setError("");
    try {
      const [funnelRes, cohortRes] = await Promise.all([
        api.admin.businessFunnel(selectedDays),
        api.admin.businessCohorts(6),
      ]);
      setBusinessFunnel(funnelRes.funnel || null);
      setBusinessCohorts(cohortRes.cohorts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load growth data.");
    } finally {
      setLoadingTabData(false);
    }
  }

  async function loadBusinessAlerts(selectedDays: number) {
    setLoadingTabData(true);
    setError("");
    try {
      const result = await api.admin.businessAlerts(Math.min(selectedDays, 30));
      setBusinessAlerts(result.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load business alerts.");
    } finally {
      setLoadingTabData(false);
    }
  }

  useEffect(() => {
    void loadViewer();
    void loadCore(days);
  }, [days]);

  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab("overview");
    }
  }, [tab, tabs]);

  useEffect(() => {
    if (tab === "usage") {
      void loadUsage(days);
      return;
    }
    if (tab === "operations") {
      void loadRuns(days);
      return;
    }
    if (!isOwner && (tab === "executive" || tab === "subscriptions" || tab === "growth" || tab === "alerts")) {
      return;
    }
    if (tab === "executive") {
      void loadBusinessExecutive(days);
      return;
    }
    if (tab === "subscriptions") {
      void loadBusinessSubscriptions();
      return;
    }
    if (tab === "growth") {
      void loadBusinessGrowth(days);
      return;
    }
    if (tab === "alerts") {
      void loadBusinessAlerts(days);
    }
  }, [tab, days, isOwner, runStatus, runMarketplace, runCountry, runUser, subStatus, subPlan, subUser, subCountry]);

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

  async function applyUserRole(user: AdminUser) {
    const role = (roleDrafts[user.id] || normalizeAdminRole(user.role, user.is_admin)).trim().toLowerCase();
    if (!isOwner) return;
    if (role !== "owner" && role !== "operator" && role !== "admin" && role !== "user") {
      setError("Role must be owner, operator, admin, or user.");
      return;
    }
    setPendingAction(`role:${user.id}`);
    setError("");
    setNotice("");
    try {
      await api.admin.updateUserRole(user.id, role as "owner" | "operator" | "admin" | "user");
      setNotice(`Updated role for ${user.email} to ${role}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user role.");
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

  async function ownerSubscriptionAction(action: "plan" | "cancel" | "resume" | "pause" | "sync", item: BusinessSubscription) {
    if (!isOwner) return;
    const subID = item.subscription_id;
    setPendingAction(`${action}:${subID}`);
    setError("");
    setNotice("");
    try {
      if (action === "plan") {
        const nextPrice = (subPriceDrafts[subID] || item.plan_price_id).trim();
        if (!nextPrice) {
          setError("Set a target Stripe price ID first.");
          setPendingAction("");
          return;
        }
        await api.admin.ownerUpdatePlan(subID, nextPrice);
      } else if (action === "cancel") {
        await api.admin.ownerCancelAtPeriodEnd(subID);
      } else if (action === "resume") {
        await api.admin.ownerResume(subID);
      } else if (action === "pause") {
        await api.admin.ownerPause(subID);
      } else {
        await api.admin.ownerSyncSubscription(subID);
      }
      setNotice(`Subscription ${subID} ${action} completed.`);
      await Promise.all([loadBusinessSubscriptions(), loadBusinessExecutive(days), loadBusinessAlerts(days)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription action failed.");
    } finally {
      setPendingAction("");
    }
  }

  async function runOwnerReconcile() {
    if (!isOwner) return;
    setPendingAction("reconcile");
    setError("");
    setNotice("");
    try {
      const result = await api.admin.ownerReconcile();
      setNotice(`Reconcile run ${result.run_id} completed.`);
      await Promise.all([loadBusinessExecutive(days), loadBusinessSubscriptions(), loadBusinessAlerts(days)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconcile failed.");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <main className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">xolto-admin v2</p>
          <h1>Owner Business Suite</h1>
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
          <span className="subtle-pill">role: {viewerRole || "admin"}</span>
          {isOwner && (
            <button className="btn" type="button" disabled={pendingAction === "reconcile"} onClick={() => void runOwnerReconcile()}>
              Run reconcile
            </button>
          )}
          <button className="btn muted" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((item) => (
          <button key={item} type="button" className={tab === item ? "tab active" : "tab"} onClick={() => setTab(item)}>
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
                <strong>{formatUSD(stats?.EstimatedCostUSD || 0)}</strong>
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
          )}

          {tab === "users" && (
            <section className="panel">
              <h2>Users</h2>
              <p className="subtle">Team users (owner/operator/admin) are separated from product users (user).</p>
              <h3>Team users ({teamUsers.length})</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Tier</th>
                      <th>Role</th>
                      <th>Admin</th>
                      <th>Missions</th>
                      <th>Searches</th>
                      <th>AI Calls</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamUsers.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.email}</td>
                        <td>
                          <select
                            value={tierDrafts[entry.id] ?? entry.tier}
                            onChange={(event) => setTierDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                          >
                            <option value="free">free</option>
                            <option value="pro">pro</option>
                            <option value="power">power</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={roleDrafts[entry.id] ?? normalizeAdminRole(entry.role, entry.is_admin)}
                            onChange={(event) => setRoleDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                            disabled={!isOwner}
                          >
                            <option value="admin">admin</option>
                            <option value="operator">operator</option>
                            <option value="owner">owner</option>
                            <option value="user">user</option>
                          </select>
                        </td>
                        <td>{entry.is_admin ? "yes" : "no"}</td>
                        <td>{entry.mission_count}</td>
                        <td>{entry.search_count}</td>
                        <td>{entry.ai_call_count}</td>
                        <td className="actions">
                          <button className="btn" type="button" disabled={pendingAction === `tier:${entry.id}`} onClick={() => void applyUserTier(entry)}>
                            Apply tier
                          </button>
                          <button
                            className="btn muted"
                            type="button"
                            disabled={!isOwner || pendingAction === `role:${entry.id}`}
                            onClick={() => void applyUserRole(entry)}
                          >
                            Apply role
                          </button>
                          <button
                            className="btn muted"
                            type="button"
                            disabled={pendingAction === `admin:${entry.id}`}
                            onClick={() => void toggleUserAdmin(entry)}
                          >
                            {entry.is_admin ? "Revoke admin" : "Grant admin"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {teamUsers.length === 0 && (
                      <tr>
                        <td colSpan={8}>No team users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <h3 style={{ marginTop: 20 }}>Product users ({productUsers.length})</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Tier</th>
                      <th>Role</th>
                      <th>Admin</th>
                      <th>Missions</th>
                      <th>Searches</th>
                      <th>AI Calls</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productUsers.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.email}</td>
                        <td>
                          <select
                            value={tierDrafts[entry.id] ?? entry.tier}
                            onChange={(event) => setTierDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                          >
                            <option value="free">free</option>
                            <option value="pro">pro</option>
                            <option value="power">power</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={roleDrafts[entry.id] ?? normalizeAdminRole(entry.role, entry.is_admin)}
                            onChange={(event) => setRoleDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                            disabled={!isOwner}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="operator">operator</option>
                            <option value="owner">owner</option>
                          </select>
                        </td>
                        <td>{entry.is_admin ? "yes" : "no"}</td>
                        <td>{entry.mission_count}</td>
                        <td>{entry.search_count}</td>
                        <td>{entry.ai_call_count}</td>
                        <td className="actions">
                          <button className="btn" type="button" disabled={pendingAction === `tier:${entry.id}`} onClick={() => void applyUserTier(entry)}>
                            Apply tier
                          </button>
                          <button
                            className="btn muted"
                            type="button"
                            disabled={!isOwner || pendingAction === `role:${entry.id}`}
                            onClick={() => void applyUserRole(entry)}
                          >
                            Apply role
                          </button>
                          <button
                            className="btn muted"
                            type="button"
                            disabled={pendingAction === `admin:${entry.id}`}
                            onClick={() => void toggleUserAdmin(entry)}
                          >
                            {entry.is_admin ? "Revoke admin" : "Grant admin"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {productUsers.length === 0 && (
                      <tr>
                        <td colSpan={8}>No product users found.</td>
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
                    <input type="checkbox" checked={runIncidentsOnly} onChange={(event) => setRunIncidentsOnly(event.target.checked)} />
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
                            <td>
                              {entry.marketplace_id} / {entry.country_code}
                            </td>
                            <td>
                              {entry.results_found} results
                              <div className="muted-text">
                                {entry.new_listings} new, {entry.deal_hits} hits
                              </div>
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
                  <input type="checkbox" checked={usageFailuresOnly} onChange={(event) => setUsageFailuresOnly(event.target.checked)} />
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
                          <td>{entry.UserID}</td>
                          <td>{entry.MissionID > 0 ? `#${entry.MissionID}` : "—"}</td>
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
                          <td colSpan={9}>No usage events matched the current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === "executive" && (
            <section className="stack">
              <article className="grid">
                <article className="panel metric">
                  <span>MRR</span>
                  <strong>{formatEUR(businessOverview?.mrr || 0)}</strong>
                </article>
                <article className="panel metric">
                  <span>ARR</span>
                  <strong>{formatEUR(businessOverview?.arr || 0)}</strong>
                </article>
                <article className="panel metric">
                  <span>Active paid</span>
                  <strong>{(businessOverview?.active_paid_accounts || 0).toLocaleString()}</strong>
                </article>
                <article className="panel metric">
                  <span>Churn</span>
                  <strong>{(businessOverview?.churn_rate_pct || 0).toFixed(1)}%</strong>
                </article>
                <article className="panel metric">
                  <span>Revenue ({days}d)</span>
                  <strong>{formatEUR(businessOverview?.revenue_eur_30d || 0)}</strong>
                </article>
                <article className="panel metric">
                  <span>Revenue trend</span>
                  <strong>{(businessOverview?.revenue_trend_pct || 0).toFixed(1)}%</strong>
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
                        {businessRevenue.map((point) => (
                          <tr key={`${point.bucket_start}-${point.currency}`}>
                            <td>{formatDate(point.bucket_start)}</td>
                            <td>{point.currency}</td>
                            <td>{formatMinor(point.amount_paid, point.currency)}</td>
                            <td>{point.invoices}</td>
                          </tr>
                        ))}
                        {businessRevenue.length === 0 && (
                          <tr>
                            <td colSpan={4}>No revenue rows for the selected window.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="subtle">Raw paid total across currencies: {formatEUR(recurringRevenue / 100)}</p>
              </article>
            </section>
          )}

          {tab === "subscriptions" && (
            <section className="panel">
              <h2>Subscriptions</h2>
              <div className="filter-row">
                <label className="inline-field">
                  <span>Status</span>
                  <input value={subStatus} onChange={(event) => setSubStatus(event.target.value)} placeholder="active, canceled…" />
                </label>
                <label className="inline-field">
                  <span>Plan price id</span>
                  <input value={subPlan} onChange={(event) => setSubPlan(event.target.value)} placeholder="price_..." />
                </label>
                <label className="inline-field">
                  <span>User ID</span>
                  <input value={subUser} onChange={(event) => setSubUser(event.target.value)} placeholder="user id" />
                </label>
                <label className="inline-field">
                  <span>Country</span>
                  <input value={subCountry} onChange={(event) => setSubCountry(event.target.value)} placeholder="NL / BG" />
                </label>
              </div>

              {loadingTabData ? (
                <p className="subtle">Loading subscriptions…</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Subscription</th>
                        <th>User</th>
                        <th>Status</th>
                        <th>Plan</th>
                        <th>Period</th>
                        <th>Invoice</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businessSubscriptions.map((entry) => (
                        <tr key={entry.subscription_id}>
                          <td>{entry.subscription_id}</td>
                          <td>
                            {entry.user_email || entry.user_id}
                            <div className="muted-text">{entry.user_tier}</div>
                          </td>
                          <td>
                            {entry.status}
                            {entry.paused && <div className="muted-text">paused collection</div>}
                          </td>
                          <td>
                            <input
                              value={subPriceDrafts[entry.subscription_id] ?? entry.plan_price_id}
                              onChange={(event) =>
                                setSubPriceDrafts((prev) => ({ ...prev, [entry.subscription_id]: event.target.value }))
                              }
                              disabled={!isOwner}
                            />
                            <div className="muted-text">{entry.plan_interval || "n/a"}</div>
                          </td>
                          <td>
                            {formatDate(entry.current_period_start)}
                            <div className="muted-text">to {formatDate(entry.current_period_end)}</div>
                          </td>
                          <td>
                            {entry.invoice_status || "—"}
                            <div className="muted-text">
                              due {formatMinor(entry.amount_due, entry.currency)} / paid {formatMinor(entry.amount_paid, entry.currency)}
                            </div>
                          </td>
                          <td className="actions">
                            <button
                              className="btn muted"
                              type="button"
                              disabled={!isOwner || pendingAction === `plan:${entry.subscription_id}`}
                              onClick={() => void ownerSubscriptionAction("plan", entry)}
                            >
                              Plan switch
                            </button>
                            <button
                              className="btn muted"
                              type="button"
                              disabled={!isOwner || pendingAction === `cancel:${entry.subscription_id}`}
                              onClick={() => void ownerSubscriptionAction("cancel", entry)}
                            >
                              Cancel end
                            </button>
                            <button
                              className="btn muted"
                              type="button"
                              disabled={!isOwner || pendingAction === `resume:${entry.subscription_id}`}
                              onClick={() => void ownerSubscriptionAction("resume", entry)}
                            >
                              Resume
                            </button>
                            <button
                              className="btn muted"
                              type="button"
                              disabled={!isOwner || pendingAction === `pause:${entry.subscription_id}`}
                              onClick={() => void ownerSubscriptionAction("pause", entry)}
                            >
                              Pause
                            </button>
                            <button
                              className="btn muted"
                              type="button"
                              disabled={!isOwner || pendingAction === `sync:${entry.subscription_id}`}
                              onClick={() => void ownerSubscriptionAction("sync", entry)}
                            >
                              Sync
                            </button>
                          </td>
                        </tr>
                      ))}
                      {businessSubscriptions.length === 0 && (
                        <tr>
                          <td colSpan={7}>No subscriptions matched the current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === "growth" && (
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
                              early {row.churn_bucket_early}, middle {row.churn_bucket_middle}, late {row.churn_bucket_late}
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
          )}

          {tab === "alerts" && (
            <section className="stack">
              <article className="grid">
                <article className="panel metric">
                  <span>Webhook lag</span>
                  <strong>{businessOverview?.webhook_lag_minutes || 0} min</strong>
                </article>
                <article className="panel metric">
                  <span>Reconcile lag</span>
                  <strong>{businessOverview?.reconcile_lag_minutes || 0} min</strong>
                </article>
                <article className="panel metric">
                  <span>Failed payments</span>
                  <strong>{businessOverview?.failed_payments || 0}</strong>
                </article>
                <article className="panel metric">
                  <span>Churn</span>
                  <strong>{(businessOverview?.churn_rate_pct || 0).toFixed(1)}%</strong>
                </article>
              </article>
              <article className="panel">
                <h2>Anomaly cards</h2>
                {loadingTabData ? (
                  <p className="subtle">Loading alerts…</p>
                ) : (
                  <div className="stack">
                    {businessAlerts.map((alert) => (
                      <article key={alert.key} className={`alert-card ${alert.severity}`}>
                        <h3>{alert.title}</h3>
                        <p>{alert.description}</p>
                        <p className="subtle">
                          value: {alert.value} • threshold: {alert.threshold}
                        </p>
                      </article>
                    ))}
                    {businessAlerts.length === 0 && <p className="subtle">No active business alerts for the current window.</p>}
                  </div>
                )}
              </article>
            </section>
          )}
        </>
      )}
    </main>
  );
}
