import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Label/control spacing stays explicit even when the control uses a portal. */
export function AppField({
  id,
  label,
  children,
  className,
}: Readonly<{
  id: string;
  label: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[var(--muted-strong)] [overflow-wrap:anywhere]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
