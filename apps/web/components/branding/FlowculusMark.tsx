'use client';

import { cn } from '@/lib/cn';

/**
 * Flowculus brand mark — amber square with stylised "F→" SVG path.
 * Uses CSS design tokens so the mark adapts correctly to light and dark themes
 * without any JS theme check.
 */
export function FlowculusMark({
  compact = false,
  className,
}: Readonly<{ compact?: boolean; className?: string }>) {
  const size = compact ? 36 : 40;

  return (
    <span
      className={cn(
        'flowculus-mark relative isolate inline-flex shrink-0 items-center justify-center',
        'transition-[transform,filter] duration-200 motion-reduce:transition-none',
        'group-hover:-translate-y-px group-hover:brightness-[1.06]',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background — uses CSS accent token, adapts to light/dark automatically */}
        <rect width="40" height="40" rx="12" className="fill-[var(--accent)]" />
        {/* Subtle inner border — slightly darker shade for depth */}
        <rect
          x="0.75"
          y="0.75"
          width="38.5"
          height="38.5"
          rx="11.25"
          fill="none"
          className="stroke-[var(--accent-strong)]"
          strokeWidth="1.5"
          strokeOpacity="0.45"
        />

        {/* "F" — vertical stem */}
        <rect
          x="11"
          y="10"
          width="4"
          height="20"
          rx="1.5"
          className="fill-[var(--accent-ink)]"
        />
        {/* "F" — top horizontal bar */}
        <rect
          x="11"
          y="10"
          width="14"
          height="4"
          rx="1.5"
          className="fill-[var(--accent-ink)]"
        />
        {/* "F" — middle horizontal bar */}
        <rect
          x="11"
          y="18"
          width="10"
          height="3.5"
          rx="1.5"
          className="fill-[var(--accent-ink)]"
        />

        {/* Flow arrow — shaft */}
        <line
          x1="22"
          y1="21.5"
          x2="30"
          y2="21.5"
          className="stroke-[var(--accent-ink)]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.72"
        />
        {/* Flow arrow — head chevron */}
        <path
          d="M27 17.5 L31.5 21.5 L27 25.5"
          fill="none"
          className="stroke-[var(--accent-ink)]"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />

        {/* Top-right accent dot */}
        <circle
          cx="31"
          cy="12"
          r="2.5"
          className="fill-[var(--accent-ink)]"
          fillOpacity="0.45"
        />
      </svg>
    </span>
  );
}
