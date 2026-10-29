'use client';
import { useEffect, useState } from 'react';
import type { MiningRequest, MiningResponse } from './mining-engine';
import type { MiningLogPage, MiningLogQuery } from './mining-log-page';
import { useMiningStore, type MiningReplay } from './mining-store';
import { MiningAbortError } from './use-mining-client';
import { getWorkspaceCopy } from './i18n';
import { usePreferencesStore } from './use-preferences-store';

/** Debounce worker queries and discard responses from replaced sources or views. */
export function useMiningLogPage(
  request: (request: MiningRequest) => Promise<MiningResponse>,
  query: MiningLogQuery,
) {
  const locale = usePreferencesStore((s) => s.locale);
  const resilience = getWorkspaceCopy(locale).resilience;
  const replay = useMiningStore((s) => s.replay);
  const status = useMiningStore((s) => s.status);
  const mapping = useMiningStore((s) => s.mappingTable);
  const pending = useMiningStore((s) => s.pendingUpload);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    source?: MiningReplay | null;
    page?: MiningLogPage;
    failed?: boolean;
  }>({ key: '' });
  const key = JSON.stringify(query);
  const available = status === 'ready' && !!replay && !mapping && !pending;
  useEffect(() => {
    if (!available) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void request({ type: 'read-log-page', ...(JSON.parse(key) as MiningLogQuery) })
        .then((response) => {
          if (!active || useMiningStore.getState().replay !== replay) return;
          if (response.type !== 'log-page')
            throw new Error('Unexpected mining response.');
          setState({ key, source: replay, page: response });
        })
        .catch((error: unknown) => {
          if (!active || useMiningStore.getState().replay !== replay) return;
          if (error instanceof MiningAbortError)
            useMiningStore
              .getState()
              .abortSession(
                error.reason === 'timeout'
                  ? resilience.miningTimeout
                  : resilience.workerRestarting,
              );
          setState({ key, source: replay, failed: true });
        });
    }, 160);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [available, replay, request, key, attempt, resilience]);
  return {
    page:
      available && state.source === replay && state.key === key ? state.page : undefined,
    failed: available && state.source === replay && state.key === key && state.failed,
    retry: () => {
      setState({ key: '' });
      setAttempt((n) => n + 1);
    },
  };
}
