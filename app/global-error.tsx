'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

type GlobalErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="screen-shell">
        <section className="panel blocked">
          <h2>A critical error occurred.</h2>
          <p>We logged this issue to monitoring. Try recovering the admin app.</p>
          <button type="button" className="btn" onClick={() => reset()}>
            Try again
          </button>
        </section>
      </body>
    </html>
  );
}
