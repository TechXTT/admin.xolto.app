import type { ReactNode } from 'react';

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="table-wrap">{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return <table>{children}</table>;
}
