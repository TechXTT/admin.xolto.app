'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.login(email, password);
      const me = await api.auth.me();
      const role = (me.role || '').toLowerCase();
      const hasAccess = Boolean(
        me.is_admin || role === 'owner' || role === 'operator' || role === 'admin',
      );
      if (!hasAccess) {
        setError('This account does not have operator/owner access.');
        setLoading(false);
        return;
      }
      window.location.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      setLoading(false);
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel auth">
        <h1>xolto-admin</h1>
        <p>Sign in with an admin account.</p>
        {error && <p className="error">{error}</p>}
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </label>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
