import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function PanelHeader({
  title,
  description,
  action,
  className,
}: Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
