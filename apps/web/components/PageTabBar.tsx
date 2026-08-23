'use client';

import { Plus } from '@phosphor-icons/react';
import type { RefObject } from 'react';

import type { DrawioCanvasHandle } from '@/components/DrawioCanvas';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface PageTabBarProps {
  canvasRef: RefObject<DrawioCanvasHandle | null>;
}

/**
 * Draw.io page (tab) bar — mirrors the native draw.io page tab experience.
 *
 * Only rendered when the file has more than one page. When a tab is clicked,
 * we postMessage `selectPage` into the iframe which causes draw.io to switch
 * to that page and emit a new `autosave` event. The autosave XML is parsed and
 * the active-page JSON export triggers a fresh analysis in the workspace store.
 */
export function PageTabBar({ canvasRef }: Readonly<PageTabBarProps>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const pages = useWorkspaceStore((state) => state.pages);
  const currentPageIndex = useWorkspaceStore((state) => state.currentPageIndex);

  // Only show when there are multiple pages
  if (pages.length <= 1) return null;

  const handleTabClick = (index: number) => {
    if (index === currentPageIndex) return;
    canvasRef.current?.selectPage(index);
  };

  const handleNewPage = () => {
    canvasRef.current?.invokeAction('addPage');
  };

  return (
    <nav
      aria-label={copy.pages ?? 'Pages'}
      className="page-tab-bar flex shrink-0 items-end gap-0 overflow-x-auto border-t border-[var(--border)] bg-[var(--surface)] scrollbar-none"
      style={{ scrollbarWidth: 'none' }}
    >
      {pages.map((page, index) => {
        const isActive = index === currentPageIndex;
        return (
          <button
            key={page.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={page.name}
            title={page.name}
            onClick={() => handleTabClick(index)}
            className={cn(
              'relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-[var(--border)] px-3.5 py-2 text-[11px] font-medium transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset',
              isActive
                ? 'bg-[var(--canvas)] text-[var(--text)]'
                : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]',
            )}
          >
            {/* Active indicator — amber top border */}
            {isActive ? (
              <span
                className="absolute inset-x-0 top-0 h-[2px] rounded-b-full bg-[var(--accent)]"
                aria-hidden="true"
              />
            ) : null}
            <span className="max-w-[120px] truncate">{page.name}</span>
          </button>
        );
      })}

      {/* Add page button */}
      <button
        type="button"
        aria-label={copy.addPage ?? 'Add page'}
        title={copy.addPage ?? 'Add page'}
        onClick={handleNewPage}
        className="focus-ring flex size-8 shrink-0 cursor-pointer items-center justify-center text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </nav>
  );
}
