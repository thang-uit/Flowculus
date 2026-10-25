'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';

import { useWorkspaceStore, type WorkspaceMode } from '@/lib/workspace-store';

const modeFromLocation = (): WorkspaceMode =>
  window.location.pathname === '/mining' ||
  new URLSearchParams(window.location.search).get('view') === 'mining'
    ? 'mining'
    : 'model';

/** Keeps the selected workspace in the URL so Mining opens from a shared link. */
export function useWorkspaceRoute() {
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  useLayoutEffect(() => {
    let readingHistory = false;
    const applyLocation = () => {
      readingHistory = true;
      useWorkspaceStore.getState().setMode(modeFromLocation());
      readingHistory = false;
    };
    applyLocation();

    const unsubscribe = useWorkspaceStore.subscribe((state, previous) => {
      if (readingHistory || state.mode === previous.mode) return;
      const url = new URL(window.location.href);
      url.pathname = state.mode === 'mining' ? '/mining' : '/';
      url.searchParams.delete('view');
      if (url.href !== window.location.href) window.history.pushState(null, '', url);
    });
    window.addEventListener('popstate', applyLocation);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', applyLocation);
    };
  }, []);
  return ready;
}
