'use client';

import { Cursor, Hand } from '@phosphor-icons/react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function CanvasToolSwitch() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const activeTool = useWorkspaceStore((state) => state.activeTool);
  const setActiveTool = useWorkspaceStore((state) => state.setActiveTool);
  return (
    <div role="group" aria-label={copy.tools} className="flex items-center gap-0.5">
      {(
        [
          { id: 'select', label: copy.select, hint: copy.selectHint, icon: Cursor },
          { id: 'hand', label: copy.panCanvas, hint: copy.panHint, icon: Hand },
        ] as const
      ).map(({ id, label, hint, icon: Icon }) => (
        <Tooltip key={id} content={hint}>
          <button
            type="button"
            aria-label={label}
            aria-pressed={activeTool === id}
            title={hint}
            onClick={() => setActiveTool(id)}
            className={cn(
              'focus-ring tb-btn',
              activeTool === id ? 'tb-btn--active' : 'tb-btn--idle',
            )}
          >
            <Icon
              size={16}
              weight={activeTool === id ? 'bold' : 'regular'}
              aria-hidden="true"
            />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
