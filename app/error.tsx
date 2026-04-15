'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="screen-shell">
      <section className="panel blocked">
        <h2>Something went wrong.</h2>
        <p>We logged this incident to monitoring. Try the request again.</p>
        <button type="button" className="btn" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}
