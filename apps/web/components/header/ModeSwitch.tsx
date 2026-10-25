'use client';

import { usePreferencesStore } from '@/lib/use-preferences-store';

import { FlowArrow, Graph } from '@phosphor-icons/react';

import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore, type WorkspaceMode } from '@/lib/workspace-store';

/** Switches between the BPMN model canvas and the process-mining view. */
export function ModeSwitch({ compact = false }: Readonly<{ compact?: boolean }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const mode = useWorkspaceStore((state) => state.mode);
  const setMode = useWorkspaceStore((state) => state.setMode);
  const options: Array<{ id: WorkspaceMode; label: string; icon: typeof FlowArrow }> = [
    { id: 'model', label: copy.modeModel, icon: FlowArrow },
    { id: 'mining', label: copy.modeMining, icon: Graph },
  ];

  return (
    <div
      role="group"
      aria-label={copy.workspaceMode}
      className="flex h-8 shrink-0 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-0.5"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => setMode(id)}
            className={cn(
              'focus-ring flex h-full cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors',
              active
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]'
                : 'border-transparent text-[var(--muted-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]',
            )}
          >
            <Icon
              size={14}
              weight={active ? 'bold' : 'regular'}
              aria-hidden="true"
              className={active ? 'text-[var(--accent-strong)]' : undefined}
            />
            {!compact ? <span>{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
