'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CaretDown,
  FlowArrow,
  GithubLogo,
  Graph,
  Users,
} from '@phosphor-icons/react';
import Link from 'next/link';

import { FlowculusLogo } from '@/components/branding/FlowculusLogo';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { PROJECT_REPOSITORY } from '@/lib/knowledge/project';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** A navigation disclosure on the existing brand footprint keeps mobile chrome compact. */
export function WorkspaceProjectMenu({ compact }: Readonly<{ compact: boolean }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target))
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', key);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', key);
      document.removeEventListener('focusin', focus);
    };
  }, [open]);
  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        className="focus-ring workspace-brand-trigger"
        data-open={open}
        aria-label={`Flowculus · ${copy.navigation}`}
        aria-expanded={open}
        aria-controls={compact ? 'project-nav-mobile' : 'project-nav-desktop'}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => {
            const links = rootRef.current?.querySelectorAll<HTMLAnchorElement>('nav a');
            const index = event.key === 'ArrowUp' ? (links?.length ?? 1) - 1 : 0;
            links?.[index]?.focus();
          });
        }}
      >
        <FlowculusLogo compact={compact} />
        <CaretDown
          size={12}
          weight="bold"
          aria-hidden="true"
          className="workspace-brand-caret"
        />
      </button>
      {open ? (
        <nav
          id={compact ? 'project-nav-mobile' : 'project-nav-desktop'}
          className="workspace-project-links"
          aria-label={copy.navigation}
          onKeyDown={(event) => {
            const links = Array.from(event.currentTarget.querySelectorAll('a'));
            const index = links.indexOf(document.activeElement as HTMLAnchorElement);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? links.length - 1
                  : event.key === 'ArrowDown'
                    ? (index + 1) % links.length
                    : event.key === 'ArrowUp'
                      ? (index - 1 + links.length) % links.length
                      : null;
            if (next === null) return;
            event.preventDefault();
            links[next]?.focus();
          }}
        >
          {[
            { href: '/', label: copy.model, icon: FlowArrow },
            { href: '/mining', label: copy.mining, icon: Graph },
            { href: '/knowledge', label: copy.knowledge, icon: BookOpen },
            { href: '/about', label: copy.about, icon: Users },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              target={href === '/knowledge' || href === '/about' ? '_blank' : undefined}
              rel={
                href === '/knowledge' || href === '/about'
                  ? 'noopener noreferrer'
                  : undefined
              }
              aria-label={
                href === '/knowledge' || href === '/about'
                  ? `${label} · ${copy.newTab}`
                  : undefined
              }
              className="focus-ring"
              onClick={() => setOpen(false)}
              onNavigate={(event) => {
                event.preventDefault();
                if (href === '/' || href === '/mining') {
                  useWorkspaceStore
                    .getState()
                    .setMode(href === '/mining' ? 'mining' : 'model');
                }
              }}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
              {href === '/knowledge' || href === '/about' ? (
                <ArrowUpRight size={12} aria-hidden="true" />
              ) : null}
            </Link>
          ))}
          <a
            href={PROJECT_REPOSITORY}
            className="focus-ring"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <GithubLogo size={17} aria-hidden="true" />
            {copy.github}
          </a>
        </nav>
      ) : null}
    </div>
  );
}
