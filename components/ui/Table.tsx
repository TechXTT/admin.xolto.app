import type { ReactNode } from 'react';

export function TableWrap({ children }: { children: ReactNode }) {
  // XOL-168: data-allow-overflow — legitimate horizontal scroll for wide data table (min-width: 680px) on mobile
  return (
    <div className="table-wrap" data-allow-overflow="true">
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <table>{children}</table>;
}
