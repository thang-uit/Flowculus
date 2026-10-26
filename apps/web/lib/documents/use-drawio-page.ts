'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { exportDrawioXml, importDrawioXml } from '@flowculus/drawio-adapter';
import { withAutoLayout } from '@flowculus/file-formats';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** A page switch must never apply to a different tab or overwrite intervening edits. */
export function useDrawioPage() {
  const ticket = useRef(0);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      ++ticket.current;
    },
    [],
  );
  const switchPage = useCallback(async (pageIndex: number) => {
    const state = useWorkspaceStore.getState();
    const source = state.drawioSource;
    if (!source || source.pageIndex === pageIndex) return;
    const request = ++ticket.current;
    setFailed(false);
    setBusy(true);
    try {
      const xml = await exportDrawioXml(state.processModel, source.xml);
      const imported = await importDrawioXml(xml, {
        pageIndex,
        fallbackName: state.modelName,
      });
      const current = useWorkspaceStore.getState();
      if (
        ticket.current !== request ||
        current.activeDocumentId !== state.activeDocumentId ||
        current.processModel !== state.processModel ||
        current.drawioSource !== source
      )
        return;
      current.loadModel(withAutoLayout(imported.model), {
        drawioSource: { xml, pages: imported.pages, pageIndex: imported.pageIndex },
      });
    } catch {
      if (ticket.current === request) setFailed(true);
    } finally {
      if (ticket.current === request) setBusy(false);
    }
  }, []);
  return { switchPage, busy, failed };
}
