'use client';

import { CaretDown } from '@phosphor-icons/react';
import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface CollapsibleSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  contentId?: string;
}

/** Shared keyboard-first disclosure for the compact workspace panels. */
export function CollapsibleSection({
  open,
  onOpenChange,
  title,
  description,
  icon,
  badge,
  children,
  className,
  headerClassName,
  contentClassName,
  contentId,
}: Readonly<CollapsibleSectionProps>) {
  const generatedId = useId();
  const resolvedContentId =
    contentId ?? `flowculus-section-${generatedId.replace(/:/g, '')}`;

  return (
    <section className={cn('shrink-0', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={resolvedContentId}
        title={description ?? title}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'focus-ring flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left transition-colors hover:bg-[var(--surface-soft)] active:bg-[var(--surface-strong)]',
          headerClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className="shrink-0 text-[var(--accent-strong)]">{icon}</span>
          ) : null}
          <span className="min-w-0 truncate text-xs font-semibold text-[var(--text)]">
            {title}
          </span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </span>
        <CaretDown
          size={15}
          aria-hidden="true"
          className={cn(
            'shrink-0 text-[var(--muted)] transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-180 text-[var(--accent-strong)]',
          )}
        />
      </button>
      <div
        id={resolvedContentId}
        aria-hidden={!open}
        inert={!open}
        className="collapsible-content min-h-0"
        data-state={open ? 'open' : 'closed'}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </section>
  );
}
