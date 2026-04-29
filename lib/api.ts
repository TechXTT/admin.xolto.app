export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type User = {
  id: string;
  email: string;
  name: string;
  tier: string;
  role?: 'owner' | 'operator' | 'admin' | 'user' | '';
  is_admin?: boolean;
};

export type AdminAIStats = {
  TotalCalls: number;
  TotalTokens: number;
  TotalPrompt: number;
  TotalCompletion: number;
  FailedCalls: number;
  EstimatedCostUSD: number;
};

export type AdminSearchStats = {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  failure_rate_pct: number;
  total_results_found: number;
  total_new_listings: number;
  total_deal_hits: number;
  total_throttled: number;
  searches_avoided_by_scoping: number;
  average_queue_wait_ms: number;
  average_mission_freshness_mins: number;
  by_status: Record<string, number>;
  by_plan: Record<string, number>;
  by_country: Record<string, number>;
  by_marketplace: Record<string, number>;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  tier: string;
  role: string;
  is_admin: boolean;
  created_at: string;
  mission_count: number;
  search_count: number;
  ai_call_count: number;
  ai_tokens: number;
};

export type AdminUsageEntry = {
  ID: number;
  UserID: string;
  MissionID: number;
  CallType: string;
  Model: string;
  PromptTokens: number;
  CompletionTokens: number;
  TotalTokens: number;
  LatencyMs: number;
  Success: boolean;
  ErrorMsg: string;
  CreatedAt: string;
};

export type AdminSearchRun = {
  id: number;
  search_config_id: number;
  search_name: string;
  user_id: string;
  user_email: string;
  mission_id: number;
  mission_name: string;
  plan: string;
  marketplace_id: string;
  country_code: string;
  started_at: string;
  finished_at: string;
  queue_wait_ms: number;
  priority: number;
  status: string;
  results_found: number;
  new_listings: number;
  deal_hits: number;
  throttled: boolean;
  error_code: string;
  searches_avoided: number;
};

export type BusinessOverview = {
  window_days: number;
  mrr: number;
  arr: number;
  active_paid_accounts: number;
  churn_rate_pct: number;
  failed_payments: number;
  revenue_eur_30d: number;
  revenue_trend_pct: number;
  subscriptions_total: number;
  subscriptions_active: number;
  webhook_lag_minutes: number;
  reconcile_lag_minutes: number;
};

export type BusinessSubscription = {
  subscription_id: string;
  customer_id: string;
  user_id: string;
  user_email: string;
  user_tier: string;
  status: string;
  plan_price_id: string;
  plan_interval: string;
  currency: string;
  unit_amount: number;
  quantity: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  paused: boolean;
  latest_invoice_id: string;
  invoice_status: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  attempt_count: number;
  updated_at: string;
};

export type BusinessRevenuePoint = {
  bucket_start: string;
  currency: string;
  amount_paid: number;
  invoices: number;
};

export type BusinessFunnel = {
  window_days: number;
  signups: number;
  activated: number;
  paid: number;
  signup_to_paid_pct: number;
  activation_to_paid_pct: number;
};

export type BusinessCohort = {
  cohort_month: string;
  users: number;
  paid_month_0: number;
  paid_month_1: number;
  paid_month_2: number;
  retention_month_1_pct: number;
  retention_month_2_pct: number;
  churn_bucket_early: number;
  churn_bucket_middle: number;
  churn_bucket_late: number;
};

export type BusinessAlert = {
  key: string;
  severity: string;
  title: string;
  description: string;
  value: string;
  threshold: string;
};

// VAL-1b — Calibration dashboard types

export type CalibrationVerdictCounts = {
  buy?: number;
  negotiate?: number;
  ask_seller?: number;
  skip?: number;
};

export type CalibrationConfidenceHistogram = {
  buy?: Record<string, number>;
  negotiate?: Record<string, number>;
  ask_seller?: Record<string, number>;
  skip?: Record<string, number>;
};

export type CalibrationFairPriceDelta = {
  buy?: Record<string, number>;
  negotiate?: Record<string, number>;
  ask_seller?: Record<string, number>;
  skip?: Record<string, number>;
};

// Outcome attribution is a free-form bag of counts keyed by the raw outreach
// state that markt's `CalibrationSummary.OutcomeAttribution` emits (see
// markt/internal/store/calibration.go). The store joins scoring_events to
// outreach_threads and increments the bucket named by `COALESCE(state, 'unknown')`,
// so observed keys can include any of: `unknown`, `none`, `awaiting_reply`,
// `sent`, `replied`, `stale`, `won`, `lost`. The CalibrationTab consumer
// classifies these into the canonical `acted | skipped | unknown` UI buckets
// and surfaces anything unrecognised in an "other" bucket.
export type CalibrationOutcomeAttribution = Record<string, number>;

export type CalibrationSummary = {
  window_days: number;
  marketplace: string;
  total_events: number;
  verdict_counts: CalibrationVerdictCounts;
  confidence_histogram: CalibrationConfidenceHistogram;
  fair_price_delta: CalibrationFairPriceDelta;
  outcome_attribution: CalibrationOutcomeAttribution;
};

// W19-23 Phase 2 — AI budget snapshot/override types.
// Sourced from markt's GET /admin/ai-budget/snapshot and POST
// /admin/ai-budget/override (operator-or-owner auth). See markt Phase 1
// shipping notes; the contract here is canonical and should not drift.

export type AIBudgetOverride = {
  set_at: string;
  new_cap_usd: number;
  reason: string;
  set_by_user_id?: string;
};

export type AIBudgetOverridesListResponse = {
  overrides: (AIBudgetOverride & { id: number })[];
  next_cursor: number;
};

export type AIBudgetSnapshot = {
  rolling_24h_spend_usd: number;
  cap_usd: number;
  percentage: number;
  oldest_entry_at: string | null;
  warning_tiers_fired: {
    '70': string | null;
    '90': string | null;
    '100': string | null;
  };
  per_site_spend_usd?: Record<string, number>;
  recent_overrides: AIBudgetOverride[];
};

type AdminEnvelope<T> = {
  ok?: boolean;
  error?: string;
  data?: T;
} & Partial<T>;

type ErrorPayload = {
  error?: string;
  message?: string;
  detail?: string;
};

export function clearToken() {
  // Cookie-based auth: no local token state to clear.
}

async function normalizeApiError(res: Response): Promise<string> {
  const fallback = `Request failed (${res.status})`;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const payload = (await res.json()) as ErrorPayload;
      return payload.error || payload.message || payload.detail || fallback;
    } catch {
      return fallback;
    }
  }
  try {
    const text = (await res.text()).trim();
    if (!text) return fallback;
    return text;
  } catch {
    return fallback;
  }
}

async function rawFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers || {});
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res = await rawFetch(path, options);
  if (
    res.status === 401 &&
    path !== '/auth/refresh' &&
    path !== '/auth/login' &&
    path !== '/auth/register'
  ) {
    const refreshRes = await rawFetch('/auth/refresh', { method: 'POST' });
    if (refreshRes.ok) {
      res = await rawFetch(path, options);
    }
  }
  if (!res.ok) {
    throw new Error(await normalizeApiError(res));
  }
  return res.json();
}

function unwrapAdmin<T>(payload: AdminEnvelope<T>): T {
  if (payload && typeof payload === 'object' && payload.data) {
    return payload.data;
  }
  return payload as T;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiFetch<{ access_token: string; refresh_token?: string; user: User }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
      return response;
    },
    me: async () => apiFetch<User>('/users/me'),
    logout: async () => {
      const response = await apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
      clearToken();
      return response;
    },
  },
  admin: {
    stats: async (days = 30) =>
      unwrapAdmin(
        await apiFetch<
          AdminEnvelope<{ stats: AdminAIStats; search_stats: AdminSearchStats; days: number }>
        >(`/admin/stats?days=${days}`),
      ),
    users: async () =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ users: AdminUser[] }>>('/admin/users')),
    usage: async (days = 7) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ entries: AdminUsageEntry[]; days: number }>>(
          `/admin/usage?days=${days}`,
        ),
      ),
    searchRuns: async (params: {
      days?: number;
      limit?: number;
      status?: string;
      marketplace?: string;
      country?: string;
      user?: string;
    }) => {
      const query = new URLSearchParams();
      if (params.days) query.set('days', String(params.days));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.marketplace) query.set('marketplace', params.marketplace);
      if (params.country) query.set('country', params.country);
      if (params.user) query.set('user', params.user);
      return unwrapAdmin(
        await apiFetch<AdminEnvelope<{ entries: AdminSearchRun[]; days: number; limit: number }>>(
          `/admin/search-runs?${query.toString()}`,
        ),
      );
    },
    updateUserTier: async (id: string, tier: string) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ user_id: string; tier: string }>>(
          `/admin/users/${id}/tier`,
          {
            method: 'POST',
            body: JSON.stringify({ tier }),
          },
        ),
      ),
    updateUserAdmin: async (id: string, isAdmin: boolean) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ user_id: string; is_admin: boolean; role: string }>>(
          `/admin/users/${id}/admin`,
          {
            method: 'POST',
            body: JSON.stringify({ is_admin: isAdmin }),
          },
        ),
      ),
    updateUserRole: async (id: string, role: 'owner' | 'operator' | 'admin' | 'user') =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ user_id: string; role: string }>>(
          `/admin/users/${id}/role`,
          {
            method: 'POST',
            body: JSON.stringify({ role }),
          },
        ),
      ),
    updateMissionStatus: async (id: number, status: 'active' | 'paused' | 'completed') =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ mission: unknown }>>(`/admin/missions/${id}/status`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        }),
      ),
    updateSearchEnabled: async (id: number, enabled: boolean) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ search_id: number; enabled: boolean }>>(
          `/admin/searches/${id}/enabled`,
          {
            method: 'POST',
            body: JSON.stringify({ enabled }),
          },
        ),
      ),
    runSearchNow: async (id: number) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ search_id: number; message: string }>>(
          `/admin/searches/${id}/run`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        ),
      ),
    businessOverview: async (days = 30) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ overview: BusinessOverview; days: number }>>(
          `/admin/business/overview?days=${days}`,
        ),
      ),
    businessSubscriptions: async (params: {
      limit?: number;
      status?: string;
      plan?: string;
      user?: string;
      country?: string;
    }) => {
      const query = new URLSearchParams();
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.plan) query.set('plan', params.plan);
      if (params.user) query.set('user', params.user);
      if (params.country) query.set('country', params.country);
      return unwrapAdmin(
        await apiFetch<AdminEnvelope<{ subscriptions: BusinessSubscription[] }>>(
          `/admin/business/subscriptions?${query.toString()}`,
        ),
      );
    },
    businessRevenue: async (days = 30) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ points: BusinessRevenuePoint[]; days: number }>>(
          `/admin/business/revenue?days=${days}`,
        ),
      ),
    businessFunnel: async (days = 30) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ funnel: BusinessFunnel; days: number }>>(
          `/admin/business/funnel?days=${days}`,
        ),
      ),
    businessCohorts: async (months = 6) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ cohorts: BusinessCohort[]; months: number }>>(
          `/admin/business/cohorts?months=${months}`,
        ),
      ),
    businessAlerts: async (days = 7) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ alerts: BusinessAlert[]; days: number }>>(
          `/admin/business/alerts?days=${days}`,
        ),
      ),
    ownerUpdatePlan: async (subscriptionID: string, priceID: string) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ subscription: unknown; idempotency_key: string }>>(
          `/admin/business/subscriptions/${subscriptionID}/plan`,
          {
            method: 'POST',
            body: JSON.stringify({ price_id: priceID }),
          },
        ),
      ),
    ownerCancelAtPeriodEnd: async (subscriptionID: string) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ subscription: unknown; idempotency_key: string }>>(
          `/admin/business/subscriptions/${subscriptionID}/cancel`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        ),
      ),
    ownerResume: async (subscriptionID: string) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ subscription: unknown; idempotency_key: string }>>(
          `/admin/business/subscriptions/${subscriptionID}/resume`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        ),
      ),
    ownerPause: async (subscriptionID: string, behavior = 'mark_uncollectible') =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ subscription: unknown; idempotency_key: string }>>(
          `/admin/business/subscriptions/${subscriptionID}/pause`,
          {
            method: 'POST',
            body: JSON.stringify({ behavior }),
          },
        ),
      ),
    ownerSyncSubscription: async (subscriptionID: string) =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ subscription: unknown; idempotency_key: string }>>(
          `/admin/business/subscriptions/${subscriptionID}/sync`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        ),
      ),
    ownerReconcile: async () =>
      unwrapAdmin(
        await apiFetch<AdminEnvelope<{ run_id: number; summary: Record<string, unknown> }>>(
          `/admin/business/reconcile`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        ),
      ),
    calibrationSummary: async (params: {
      window?: string;
      marketplace?: string;
      includeHeuristicFallback?: boolean;
    }) => {
      const query = new URLSearchParams();
      if (params.window) query.set('window', params.window);
      if (params.marketplace && params.marketplace !== 'all')
        query.set('marketplace', params.marketplace);
      // W19-23 Phase 2 — Default markt server behaviour excludes
      // ai_path=heuristic_fallback rows. Only pass the param when the
      // operator explicitly opts in. Sending `false` would be redundant
      // (matches default) but harmless; we omit it to keep the URL clean.
      if (params.includeHeuristicFallback) {
        query.set('include_heuristic_fallback', 'true');
      }
      const qs = query.toString();
      return apiFetch<{ ok: boolean; summary: CalibrationSummary }>(
        `/internal/calibration/summary${qs ? `?${qs}` : ''}`,
      );
    },
    aiBudgetSnapshot: async () => apiFetch<AIBudgetSnapshot>('/admin/ai-budget/snapshot'),
    aiBudgetOverride: async (body: { new_cap_usd: number; reason: string }) =>
      apiFetch<{ ok: boolean; cap_usd: number; set_at: string }>('/admin/ai-budget/override', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    aiBudgetOverridesList: async (params?: { limit?: number; cursor?: number }) => {
      const qs = new URLSearchParams();
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      if (params?.cursor !== undefined && params.cursor > 0)
        qs.set('cursor', String(params.cursor));
      const suffix = qs.toString();
      return apiFetch<AIBudgetOverridesListResponse>(
        `/admin/ai-budget/overrides${suffix ? `?${suffix}` : ''}`,
      );
    },
  },
};
