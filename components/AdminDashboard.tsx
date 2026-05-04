'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
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
} from '../lib/api';
import { activeUsersCount, normalizeAdminRole, Tab, usageUsersCount } from './admin/format';
import AIBudgetTab from './admin/tabs/AIBudgetTab';
import AlertsTab from './admin/tabs/AlertsTab';
import CalibrationTab from './admin/tabs/CalibrationTab';
import ExecutiveTab from './admin/tabs/ExecutiveTab';
import GrowthTab from './admin/tabs/GrowthTab';
import OperationsTab from './admin/tabs/OperationsTab';
import OverviewTab from './admin/tabs/OverviewTab';
import SubscriptionsTab from './admin/tabs/SubscriptionsTab';
import UsageTab from './admin/tabs/UsageTab';
import UsersTab from './admin/tabs/UsersTab';

const PERIOD_OPTIONS = [7, 14, 30, 90];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingAction, setPendingAction] = useState('');

  const [runStatus, setRunStatus] = useState('');
  const [runMarketplace, setRunMarketplace] = useState('');
  const [runCountry, setRunCountry] = useState('');
  const [runUser, setRunUser] = useState('');
  const [runIncidentsOnly, setRunIncidentsOnly] = useState(false);

  const [usageUserFilter, setUsageUserFilter] = useState('');
  const [usageCallTypeFilter, setUsageCallTypeFilter] = useState('');
  const [usageFailuresOnly, setUsageFailuresOnly] = useState(false);

  const [missionIDInput, setMissionIDInput] = useState('');
  const [missionStatusInput, setMissionStatusInput] = useState<'active' | 'paused' | 'completed'>(
    'paused',
  );
  const [searchIDInput, setSearchIDInput] = useState('');
  const [searchEnabledInput, setSearchEnabledInput] = useState<'true' | 'false'>('true');
  const [runSearchIDInput, setRunSearchIDInput] = useState('');
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

  const [subStatus, setSubStatus] = useState('');
  const [subPlan, setSubPlan] = useState('');
  const [subUser, setSubUser] = useState('');
  const [subCountry, setSubCountry] = useState('');
  const [subPriceDrafts, setSubPriceDrafts] = useState<Record<string, string>>({});

  const viewerRole = (viewer?.role || '').toLowerCase();
  const isOwner = viewerRole === 'owner';

  const tabs: Tab[] = useMemo(() => {
    const base: Tab[] = ['overview', 'users', 'operations', 'usage'];
    if (isOwner) {
      return [
        ...base,
        'executive',
        'subscriptions',
        'growth',
        'alerts',
        'calibration',
        'ai-budget',
      ];
    }
    return base;
  }, [isOwner]);

  async function signOut() {
    try {
      await api.auth.logout();
    } catch {
      // Ignore and force redirect.
    }
    window.location.replace('/login');
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
    setError('');
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
      setError(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoadingCore(false);
    }
  }

  async function loadUsage(selectedDays: number) {
    setLoadingTabData(true);
    setError('');
    try {
      const result = await api.admin.usage(Math.min(selectedDays, 90));
      setUsage(result.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data.');
    } finally {
      setLoadingTabData(false);
    }
  }

  const loadRuns = useCallback(
    async (selectedDays: number) => {
      setLoadingTabData(true);
      setError('');
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
        setError(err instanceof Error ? err.message : 'Failed to load search runs.');
      } finally {
        setLoadingTabData(false);
      }
    },
    [runStatus, runMarketplace, runCountry, runUser],
  );

  async function loadBusinessExecutive(selectedDays: number) {
    setLoadingTabData(true);
    setError('');
    try {
      const [overviewRes, revenueRes] = await Promise.all([
        api.admin.businessOverview(selectedDays),
        api.admin.businessRevenue(selectedDays),
      ]);
      setBusinessOverview(overviewRes.overview || null);
      setBusinessRevenue(revenueRes.points || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executive data.');
    } finally {
      setLoadingTabData(false);
    }
  }

  const loadBusinessSubscriptions = useCallback(async () => {
    setLoadingTabData(true);
    setError('');
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
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions.');
    } finally {
      setLoadingTabData(false);
    }
  }, [subStatus, subPlan, subUser, subCountry]);

  async function loadBusinessGrowth(selectedDays: number) {
    setLoadingTabData(true);
    setError('');
    try {
      const [funnelRes, cohortRes] = await Promise.all([
        api.admin.businessFunnel(selectedDays),
        api.admin.businessCohorts(6),
      ]);
      setBusinessFunnel(funnelRes.funnel || null);
      setBusinessCohorts(cohortRes.cohorts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load growth data.');
    } finally {
      setLoadingTabData(false);
    }
  }

  async function loadBusinessAlerts(selectedDays: number) {
    setLoadingTabData(true);
    setError('');
    try {
      const result = await api.admin.businessAlerts(Math.min(selectedDays, 30));
      setBusinessAlerts(result.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business alerts.');
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
      setTab('overview');
    }
  }, [tab, tabs]);

  useEffect(() => {
    if (tab === 'usage') {
      void loadUsage(days);
      return;
    }
    if (tab === 'operations') {
      void loadRuns(days);
      return;
    }
    if (
      !isOwner &&
      (tab === 'executive' || tab === 'subscriptions' || tab === 'growth' || tab === 'alerts')
    ) {
      return;
    }
    if (tab === 'executive') {
      void loadBusinessExecutive(days);
      return;
    }
    if (tab === 'subscriptions') {
      void loadBusinessSubscriptions();
      return;
    }
    if (tab === 'growth') {
      void loadBusinessGrowth(days);
      return;
    }
    if (tab === 'alerts') {
      void loadBusinessAlerts(days);
    }
  }, [tab, days, isOwner, loadRuns, loadBusinessSubscriptions]);

  async function applyUserTier(user: AdminUser) {
    const tier = (tierDrafts[user.id] || user.tier).trim().toLowerCase();
    if (!tier) return;
    setPendingAction(`tier:${user.id}`);
    setError('');
    setNotice('');
    try {
      await api.admin.updateUserTier(user.id, tier);
      setNotice(`Updated tier for ${user.email} to ${tier}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user tier.');
    } finally {
      setPendingAction('');
    }
  }

  async function applyUserRole(user: AdminUser) {
    const role = (roleDrafts[user.id] || normalizeAdminRole(user.role, user.is_admin))
      .trim()
      .toLowerCase();
    if (!isOwner) return;
    if (role !== 'owner' && role !== 'operator' && role !== 'admin' && role !== 'user') {
      setError('Role must be owner, operator, admin, or user.');
      return;
    }
    setPendingAction(`role:${user.id}`);
    setError('');
    setNotice('');
    try {
      await api.admin.updateUserRole(user.id, role as 'owner' | 'operator' | 'admin' | 'user');
      setNotice(`Updated role for ${user.email} to ${role}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role.');
    } finally {
      setPendingAction('');
    }
  }

  async function toggleUserAdmin(user: AdminUser) {
    setPendingAction(`admin:${user.id}`);
    setError('');
    setNotice('');
    try {
      await api.admin.updateUserAdmin(user.id, !user.is_admin);
      setNotice(`Updated admin flag for ${user.email}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin flag.');
    } finally {
      setPendingAction('');
    }
  }

  async function submitMissionStatus(event: FormEvent) {
    event.preventDefault();
    const missionID = Number(missionIDInput);
    if (!Number.isFinite(missionID) || missionID <= 0) {
      setError('Enter a valid mission ID.');
      return;
    }
    setPendingAction('mission-status');
    setError('');
    setNotice('');
    try {
      await api.admin.updateMissionStatus(missionID, missionStatusInput);
      setNotice(`Mission ${missionID} status updated to ${missionStatusInput}.`);
      await loadCore(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mission status.');
    } finally {
      setPendingAction('');
    }
  }

  async function submitSearchEnabled(event: FormEvent) {
    event.preventDefault();
    const searchID = Number(searchIDInput);
    if (!Number.isFinite(searchID) || searchID <= 0) {
      setError('Enter a valid search ID.');
      return;
    }
    setPendingAction('search-enabled');
    setError('');
    setNotice('');
    try {
      await api.admin.updateSearchEnabled(searchID, searchEnabledInput === 'true');
      setNotice(`Search ${searchID} enabled=${searchEnabledInput}.`);
      await loadRuns(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update search enabled status.');
    } finally {
      setPendingAction('');
    }
  }

  async function submitRunSearch(event: FormEvent) {
    event.preventDefault();
    const searchID = Number(runSearchIDInput);
    if (!Number.isFinite(searchID) || searchID <= 0) {
      setError('Enter a valid search ID.');
      return;
    }
    setPendingAction('search-run');
    setError('');
    setNotice('');
    try {
      await api.admin.runSearchNow(searchID);
      setNotice(`Triggered run for search ${searchID}.`);
      await loadRuns(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger search run.');
    } finally {
      setPendingAction('');
    }
  }

  async function runNowFromRow(searchID: number) {
    setPendingAction(`row-run:${searchID}`);
    setError('');
    setNotice('');
    try {
      await api.admin.runSearchNow(searchID);
      setNotice(`Triggered run for search ${searchID}.`);
      await loadRuns(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger search run.');
    } finally {
      setPendingAction('');
    }
  }

  async function ownerSubscriptionAction(
    action: 'plan' | 'cancel' | 'resume' | 'pause' | 'sync',
    item: BusinessSubscription,
  ) {
    if (!isOwner) return;
    const subID = item.subscription_id;
    setPendingAction(`${action}:${subID}`);
    setError('');
    setNotice('');
    try {
      if (action === 'plan') {
        const nextPrice = (subPriceDrafts[subID] || item.plan_price_id).trim();
        if (!nextPrice) {
          setError('Set a target Stripe price ID first.');
          setPendingAction('');
          return;
        }
        await api.admin.ownerUpdatePlan(subID, nextPrice);
      } else if (action === 'cancel') {
        await api.admin.ownerCancelAtPeriodEnd(subID);
      } else if (action === 'resume') {
        await api.admin.ownerResume(subID);
      } else if (action === 'pause') {
        await api.admin.ownerPause(subID);
      } else {
        await api.admin.ownerSyncSubscription(subID);
      }
      setNotice(`Subscription ${subID} ${action} completed.`);
      await Promise.all([
        loadBusinessSubscriptions(),
        loadBusinessExecutive(days),
        loadBusinessAlerts(days),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription action failed.');
    } finally {
      setPendingAction('');
    }
  }

  async function runOwnerReconcile() {
    if (!isOwner) return;
    setPendingAction('reconcile');
    setError('');
    setNotice('');
    try {
      const result = await api.admin.ownerReconcile();
      setNotice(`Reconcile run ${result.run_id} completed.`);
      await Promise.all([
        loadBusinessExecutive(days),
        loadBusinessSubscriptions(),
        loadBusinessAlerts(days),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconcile failed.');
    } finally {
      setPendingAction('');
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
          <span className="subtle-pill">role: {viewerRole || 'admin'}</span>
          {isOwner && (
            <button
              className="btn muted"
              type="button"
              disabled={pendingAction === 'reconcile'}
              onClick={() => void runOwnerReconcile()}
            >
              Run reconcile
            </button>
          )}
          <button className="btn" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* XOL-168: data-allow-overflow — legitimate horizontal scroll for tab strip at <640px mobile viewports (XOL-164 pattern) */}
      <nav className="tabs" data-allow-overflow="true">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? 'tab active' : 'tab'}
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
          {tab === 'overview' && (
            <OverviewTab
              usersCount={users.length}
              activeUsers={activeUsersCount(users)}
              usageUsers={usageUsersCount(users)}
              stats={stats}
              searchStats={searchStats}
              isOwner={isOwner}
              businessOverview={businessOverview}
            />
          )}

          {tab === 'users' && (
            <UsersTab
              users={users}
              isOwner={isOwner}
              tierDrafts={tierDrafts}
              roleDrafts={roleDrafts}
              pendingAction={pendingAction}
              onTierDraftChange={(userID, value) =>
                setTierDrafts((prev) => ({ ...prev, [userID]: value }))
              }
              onRoleDraftChange={(userID, value) =>
                setRoleDrafts((prev) => ({ ...prev, [userID]: value }))
              }
              onApplyTier={(user) => void applyUserTier(user)}
              onApplyRole={(user) => void applyUserRole(user)}
              onToggleAdmin={(user) => void toggleUserAdmin(user)}
            />
          )}

          {tab === 'operations' && (
            <OperationsTab
              loadingTabData={loadingTabData}
              pendingAction={pendingAction}
              missionIDInput={missionIDInput}
              missionStatusInput={missionStatusInput}
              searchIDInput={searchIDInput}
              searchEnabledInput={searchEnabledInput}
              runSearchIDInput={runSearchIDInput}
              runStatus={runStatus}
              runMarketplace={runMarketplace}
              runCountry={runCountry}
              runUser={runUser}
              runIncidentsOnly={runIncidentsOnly}
              runs={runs}
              onMissionIDInputChange={setMissionIDInput}
              onMissionStatusInputChange={setMissionStatusInput}
              onSearchIDInputChange={setSearchIDInput}
              onSearchEnabledInputChange={setSearchEnabledInput}
              onRunSearchIDInputChange={setRunSearchIDInput}
              onRunStatusChange={setRunStatus}
              onRunMarketplaceChange={setRunMarketplace}
              onRunCountryChange={setRunCountry}
              onRunUserChange={setRunUser}
              onRunIncidentsOnlyChange={setRunIncidentsOnly}
              onSubmitMissionStatus={(event) => void submitMissionStatus(event)}
              onSubmitSearchEnabled={(event) => void submitSearchEnabled(event)}
              onSubmitRunSearch={(event) => void submitRunSearch(event)}
              onRunNowFromRow={(searchID) => void runNowFromRow(searchID)}
            />
          )}

          {tab === 'usage' && (
            <UsageTab
              usage={usage}
              loadingTabData={loadingTabData}
              usageUserFilter={usageUserFilter}
              usageCallTypeFilter={usageCallTypeFilter}
              usageFailuresOnly={usageFailuresOnly}
              onUsageUserFilterChange={setUsageUserFilter}
              onUsageCallTypeFilterChange={setUsageCallTypeFilter}
              onUsageFailuresOnlyChange={setUsageFailuresOnly}
            />
          )}

          {tab === 'executive' && (
            <ExecutiveTab
              days={days}
              loadingTabData={loadingTabData}
              businessOverview={businessOverview}
              businessRevenue={businessRevenue}
            />
          )}

          {tab === 'subscriptions' && (
            <SubscriptionsTab
              isOwner={isOwner}
              loadingTabData={loadingTabData}
              pendingAction={pendingAction}
              businessSubscriptions={businessSubscriptions}
              subStatus={subStatus}
              subPlan={subPlan}
              subUser={subUser}
              subCountry={subCountry}
              subPriceDrafts={subPriceDrafts}
              onSubStatusChange={setSubStatus}
              onSubPlanChange={setSubPlan}
              onSubUserChange={setSubUser}
              onSubCountryChange={setSubCountry}
              onSubPriceDraftChange={(subscriptionID, value) =>
                setSubPriceDrafts((prev) => ({ ...prev, [subscriptionID]: value }))
              }
              onSubscriptionAction={(action, item) => void ownerSubscriptionAction(action, item)}
            />
          )}

          {tab === 'growth' && (
            <GrowthTab
              loadingTabData={loadingTabData}
              businessFunnel={businessFunnel}
              businessCohorts={businessCohorts}
            />
          )}

          {tab === 'alerts' && (
            <AlertsTab
              loadingTabData={loadingTabData}
              businessOverview={businessOverview}
              businessAlerts={businessAlerts}
            />
          )}

          {tab === 'calibration' && <CalibrationTab isOwner={isOwner} />}

          {tab === 'ai-budget' && <AIBudgetTab isOwner={isOwner} />}
        </>
      )}
    </main>
  );
}
