'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { changeDrawioPage } from './drawio-page-transition';
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
      await changeDrawioPage(pageIndex, () => ticket.current === request);
    } catch {
      const current = useWorkspaceStore.getState();
      if (
        ticket.current === request &&
        current.activeDocumentId === state.activeDocumentId &&
        current.modelRevision === state.modelRevision
      )
        setFailed(true);
    } finally {
      if (ticket.current === request) setBusy(false);
    }
  }, []);
  return { switchPage, busy, failed };
}
