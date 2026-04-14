export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ACCESS_TOKEN_KEY = "xolto_access_token";
const REFRESH_TOKEN_KEY = "xolto_refresh_token";

export type User = {
  id: string;
  email: string;
  name: string;
  tier: string;
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

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getToken(): string {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

export function setToken(token: string) {
  if (!canUseStorage()) return;
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function getRefreshToken(): string {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

function setRefreshToken(token: string) {
  if (!canUseStorage()) return;
  if (!token) {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearToken() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function normalizeApiError(res: Response): Promise<string> {
  const fallback = `Request failed (${res.status})`;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
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
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization")) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (path === "/auth/refresh" && !headers.has("X-Refresh-Token")) {
    const refreshToken = getRefreshToken();
    if (refreshToken) headers.set("X-Refresh-Token", refreshToken);
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res = await rawFetch(path, options);
  if (res.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
    const refreshRes = await rawFetch("/auth/refresh", { method: "POST" });
    if (refreshRes.ok) {
      try {
        const payload = (await refreshRes.clone().json()) as { access_token?: string; refresh_token?: string };
        if (payload.access_token) setToken(payload.access_token);
        if (payload.refresh_token) setRefreshToken(payload.refresh_token);
      } catch {
        // Ignore malformed refresh payload.
      }
      res = await rawFetch(path, options);
    }
  }
  if (!res.ok) {
    throw new Error(await normalizeApiError(res));
  }
  return res.json();
}

function unwrapAdmin<T>(payload: AdminEnvelope<T>): T {
  if (payload && typeof payload === "object" && payload.data) {
    return payload.data;
  }
  return payload as T;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiFetch<{ access_token: string; refresh_token?: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(response.access_token);
      if (response.refresh_token) setRefreshToken(response.refresh_token);
      return response;
    },
    me: async () => apiFetch<User>("/users/me"),
    logout: async () => {
      const response = await apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
      clearToken();
      return response;
    },
  },
  admin: {
    stats: async (days = 30) =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ stats: AdminAIStats; search_stats: AdminSearchStats; days: number }>>(`/admin/stats?days=${days}`)),
    users: async () =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ users: AdminUser[] }>>("/admin/users")),
    usage: async (days = 7) =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ entries: AdminUsageEntry[]; days: number }>>(`/admin/usage?days=${days}`)),
    searchRuns: async (params: {
      days?: number;
      limit?: number;
      status?: string;
      marketplace?: string;
      country?: string;
      user?: string;
    }) => {
      const query = new URLSearchParams();
      if (params.days) query.set("days", String(params.days));
      if (params.limit) query.set("limit", String(params.limit));
      if (params.status) query.set("status", params.status);
      if (params.marketplace) query.set("marketplace", params.marketplace);
      if (params.country) query.set("country", params.country);
      if (params.user) query.set("user", params.user);
      return unwrapAdmin(await apiFetch<AdminEnvelope<{ entries: AdminSearchRun[]; days: number; limit: number }>>(`/admin/search-runs?${query.toString()}`));
    },
    updateUserTier: async (id: string, tier: string) =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ user_id: string; tier: string }>>(`/admin/users/${id}/tier`, {
        method: "POST",
        body: JSON.stringify({ tier }),
      })),
    updateUserAdmin: async (id: string, isAdmin: boolean) =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ user_id: string; is_admin: boolean }>>(`/admin/users/${id}/admin`, {
        method: "POST",
        body: JSON.stringify({ is_admin: isAdmin }),
      })),
    updateMissionStatus: async (id: number, status: "active" | "paused" | "completed") =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ mission: unknown }>>(`/admin/missions/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      })),
    updateSearchEnabled: async (id: number, enabled: boolean) =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ search_id: number; enabled: boolean }>>(`/admin/searches/${id}/enabled`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      })),
    runSearchNow: async (id: number) =>
      unwrapAdmin(await apiFetch<AdminEnvelope<{ search_id: number; message: string }>>(`/admin/searches/${id}/run`, {
        method: "POST",
        body: JSON.stringify({}),
      })),
  },
};
