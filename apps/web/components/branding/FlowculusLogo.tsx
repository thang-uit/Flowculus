import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';
import { FlowculusMark } from '@/components/branding/FlowculusMark';

interface FlowculusLogoProps extends HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

/** Flowculus wordmark — mark + name only. No badge, no subtitle. */
export function FlowculusLogo({
  compact = false,
  className,
  ...props
}: FlowculusLogoProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)} {...props}>
      <FlowculusMark compact={compact} />
      {!compact ? (
        <span className="text-[15px] font-bold tracking-[-0.04em] text-[var(--text)]">
          Flowculus
        </span>
      ) : null}
    </div>
  );
}
