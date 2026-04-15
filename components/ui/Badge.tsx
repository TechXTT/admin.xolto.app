import type { HTMLAttributes } from 'react';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export default function Badge({ tone = 'default', className = '', ...props }: BadgeProps) {
  const toneClass =
    tone === 'success'
      ? 'badge badge-success'
      : tone === 'warning'
        ? 'badge badge-warning'
        : tone === 'danger'
          ? 'badge badge-danger'
          : 'badge';
  const mergedClass = className ? `${toneClass} ${className}` : toneClass;
  return <span {...props} className={mergedClass} />;
}
