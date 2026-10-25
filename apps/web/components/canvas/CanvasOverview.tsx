'use client';

import { MapTrifold } from '@phosphor-icons/react';
import { MiniMap, Panel } from '@xyflow/react';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function CanvasOverview() {
  const locale = usePreferencesStore((state) => state.locale);
  const hasNodes = useWorkspaceStore(
    (state) => Object.keys(state.processModel.nodes).length > 0,
  );
  const visible = usePreferencesStore((state) => state.minimapVisible);
  const setVisible = usePreferencesStore((state) => state.setMinimapVisible);
  const copy = getWorkspaceCopy(locale);
  const label = visible ? copy.hideMinimap : copy.showMinimap;
  if (!hasNodes) return null;
  return (
    <>
      <Panel position="top-right">
        <button
          type="button"
          className="focus-ring canvas-overview-toggle"
          onClick={() => setVisible(!visible)}
          aria-label={label}
          title={label}
          aria-pressed={visible}
        >
          <MapTrifold size={17} aria-hidden="true" />
        </button>
      </Panel>
      {visible ? (
        <MiniMap
          pannable
          zoomable
          ariaLabel={copy.minimap}
          nodeBorderRadius={5}
          position="bottom-right"
          style={{ width: 144, height: 88 }}
        />
      ) : null}
    </>
  );
}
