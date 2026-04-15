import { AdminUser } from '../../lib/api';

export type Tab =
  | 'overview'
  | 'users'
  | 'operations'
  | 'usage'
  | 'executive'
  | 'subscriptions'
  | 'growth'
  | 'alerts';

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
