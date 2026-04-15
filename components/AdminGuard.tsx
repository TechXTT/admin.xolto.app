'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, clearToken, User } from '../lib/api';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const me = await api.auth.me();
        if (cancelled) return;
        const role = (me.role || '').toLowerCase();
        const hasAccess = Boolean(
          me.is_admin || role === 'owner' || role === 'operator' || role === 'admin',
        );
        if (!hasAccess) {
          setUser(me);
          setError('Operator or owner access required for this application.');
          return;
        }
        setUser(me);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message.toLowerCase() : '';
        if (message.includes('unauthorized') || message.includes('401')) {
          clearToken();
          window.location.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to verify session.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    try {
      await api.auth.logout();
    } catch {
      clearToken();
    }
    window.location.replace('/login');
  }

  if (loading) {
    return (
      <main className="screen-shell">
        <div className="panel">Checking admin access…</div>
      </main>
    );
  }

  const role = (user?.role || '').toLowerCase();
  const hasAccess = Boolean(
    user?.is_admin || role === 'owner' || role === 'operator' || role === 'admin',
  );
  if (error || !hasAccess) {
    return (
      <main className="screen-shell">
        <section className="panel blocked">
          <h1>Access blocked</h1>
          <p>{error || 'This account does not have admin privileges.'}</p>
          <button className="btn" type="button" onClick={signOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
