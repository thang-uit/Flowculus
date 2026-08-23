'use client';

import { cn } from '@/lib/cn';

/**
 * Flowculus brand mark — mascot gateway icon with 3 input paths, diamond gateway,
 * winking face, and output arrow.
 * Uses CSS design tokens so it adapts seamlessly in both light and dark themes.
 */
export function FlowculusMark({
  compact = false,
  className,
}: Readonly<{ compact?: boolean; className?: string }>) {
  const size = compact ? 34 : 38;

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
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background squircle */}
        <rect
          x="8"
          y="8"
          width="112"
          height="112"
          rx="34"
          className="fill-[var(--accent)]"
        />
        {/* Border */}
        <rect
          x="9.5"
          y="9.5"
          width="109"
          height="109"
          rx="32.5"
          fill="none"
          className="stroke-[var(--accent-strong)]"
          strokeOpacity="0.5"
          strokeWidth="3"
        />

        {/* 3 Input branches & Output arrow & Diamond gateway */}
        <g
          fill="none"
          className="stroke-[var(--accent-ink)]"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Top input branch */}
          <path d="M25 35h12c5 0 8 2 10.8 6.7l5.4 9" strokeWidth="5.7" />
          {/* Middle input branch */}
          <path d="M25 64h26" strokeWidth="5.7" />
          {/* Bottom input branch */}
          <path d="M25 93h12c5 0 8-2 10.8-6.7l5.4-9" strokeWidth="5.7" />

          {/* Output arrow shaft & head */}
          <path d="M80 64h22" strokeWidth="5.7" />
          <path d="m93 52.6 12 11.4-12 11.4" strokeWidth="5.7" />

          {/* Center Diamond */}
          <path
            d="M64 37.2 90.8 64 64 90.8 37.2 64 64 37.2Z"
            className="fill-[var(--accent)]"
            strokeWidth="5.7"
          />

          {/* Right wink eye */}
          <path d="M68.8 61h5.1" strokeWidth="3.5" />
          {/* Smile mouth */}
          <path d="M57.1 72.3c4.4 4.3 10.5 4.3 14.9 0" strokeWidth="3.1" />
          {/* Accent cheek tick */}
          <path d="m48.1 48.3 3.1 3" strokeWidth="2.6" />
        </g>

        {/* Dots (3 input ports + left eye) */}
        <g className="fill-[var(--accent-ink)]">
          <circle cx="25" cy="35" r="4.7" />
          <circle cx="25" cy="64" r="4.7" />
          <circle cx="25" cy="93" r="4.7" />
          <circle cx="58" cy="60.8" r="2.45" />
        </g>
      </svg>
    </span>
  );
}
