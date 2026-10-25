'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/** Keep editor portal/worker lifetimes outside Next's retained reading trees. */
export function WorkspaceLink({
  href,
  children,
  className,
  label,
}: Readonly<{
  href: '/' | '/mining';
  children: ReactNode;
  className?: string;
  label?: string;
}>) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      aria-label={label}
      onNavigate={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </Link>
  );
}
