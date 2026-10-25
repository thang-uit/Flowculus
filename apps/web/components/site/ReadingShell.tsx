'use client';

import { ArrowUpRight, GithubLogo } from '@phosphor-icons/react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { FlowculusLogo } from '@/components/branding/FlowculusLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { PROJECT_REPOSITORY } from '@/lib/knowledge/project';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { WorkspaceLink } from './WorkspaceLink';

export function ReadingShell({
  page,
  children,
}: Readonly<{ page: 'knowledge' | 'about'; children: ReactNode }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  return (
    <TooltipProvider>
      <div className="reading-shell" id="reading-top">
        <a href="#reading-main" className="reading-skip">
          {copy.skip}
        </a>
        <header className="reading-header">
          <div className="reading-brand-row">
            <WorkspaceLink
              href="/"
              className="focus-ring reading-brand"
              label="Flowculus"
            >
              <FlowculusLogo />
            </WorkspaceLink>
            <div className="reading-preferences">
              <LanguageToggle />
              <ThemeToggle />
              <a
                className="focus-ring reading-github-icon"
                href={PROJECT_REPOSITORY}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.github}
              >
                <GithubLogo size={21} aria-hidden="true" />
              </a>
            </div>
          </div>
          <nav className="reading-nav" aria-label={copy.navigation}>
            <WorkspaceLink href="/">
              {copy.model}
              <ArrowUpRight size={12} aria-hidden="true" />
            </WorkspaceLink>
            <WorkspaceLink href="/mining">{copy.mining}</WorkspaceLink>
            <Link
              href="/knowledge"
              aria-current={page === 'knowledge' ? 'page' : undefined}
            >
              {copy.knowledge}
            </Link>
            <Link href="/about" aria-current={page === 'about' ? 'page' : undefined}>
              {copy.about}
            </Link>
          </nav>
        </header>
        {children}
        <footer className="reading-footer">
          <FlowculusLogo />
          <span>Chu Nam Thắng · Trịnh Thuận Huê</span>
          <a
            className="focus-ring"
            href={PROJECT_REPOSITORY}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </TooltipProvider>
  );
}
