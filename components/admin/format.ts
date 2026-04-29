import { AdminUser } from '../../lib/api';

export type Tab =
  | 'overview'
  | 'users'
  | 'operations'
  | 'usage'
  | 'executive'
  | 'subscriptions'
  | 'growth'
  | 'alerts'
  | 'calibration'
  | 'ai-budget';

export type AdminRole = 'owner' | 'operator' | 'admin' | 'user';

export function normalizeAdminRole(role: string | undefined, isAdmin: boolean): AdminRole {
  const value = (role || '').trim().toLowerCase();
  if (value === 'owner' || value === 'operator' || value === 'admin' || value === 'user') {
    return value;
  }
  if (isAdmin) {
    return 'admin';
  }
  return 'user';
}

export function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

// W19-23 Phase 2 — relative-time formatter for the AI Budget tile.
// Returns strings like "just now", "47 minutes ago", "2 hours ago",
// "3 days ago". Returns null when input is null/empty/invalid so callers
// can decide their fallback copy ("no spend in current window.").
export function formatRelativeTime(
  value: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!value) return null;
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return null;
  const diffMs = now.getTime() - then.getTime();
  // Future timestamps (clock skew) collapse to "just now" rather than
  // surfacing "-3 minutes ago" to operators.
  if (diffMs < 30_000) return 'just now';
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function formatUSD(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatEUR(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatMinor(amount: number, currency: string) {
  const major = (amount || 0) / 100;
  const code = (currency || 'EUR').toUpperCase();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(major);
}

export function activeUsersCount(users: AdminUser[]) {
  return users.filter((entry) => entry.mission_count > 0 || entry.search_count > 0).length;
}

export function usageUsersCount(users: AdminUser[]) {
  return users.filter((entry) => entry.ai_call_count > 0).length;
}
