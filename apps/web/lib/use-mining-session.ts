'use client';

import { useCallback, useEffect, useRef, type ChangeEvent } from 'react';

import type {
  ColumnMapping,
  EventImportSettings,
  MiningPresetId,
} from '@flowculus/process-mining';

import { downloadTextFile } from '@/lib/browser-file-actions';
import { exportFileName } from '@/lib/file-name';
import { createMiningCanvasDocument, type MiningCanvasOutcome } from './mining-canvas';
import { getWorkspaceCopy } from '@/lib/i18n';
import { runMiningConformance } from '@/lib/mining-conformance';
import { useMiningUpload } from '@/lib/use-mining-upload';
import { useMiningRediscovery } from '@/lib/use-mining-rediscovery';
import type { MiningRediscoveryRequest } from '@/lib/mining-rediscovery';
import type { MiningDiscoveryResponse, MiningResponse } from '@/lib/mining-engine';
import {
  useMiningStore,
  type MiningReplay,
  type PendingUpload,
} from '@/lib/mining-store';
import { MiningAbortError, useMiningClient } from '@/lib/use-mining-client';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { replayMiningLog } from './mining-replay';
import { assertMiningCapacity } from './mining-tabs';
import { getMiningTabsCopy } from './i18n/mining-tabs-copy';

const LOG_EXTENSION = /\.(csv|tsv|json|xes|xml|txt|xlsx)$/i;

const asDiscovery = (response: MiningResponse): MiningDiscoveryResponse => {
  if (response.type !== 'discovery') throw new Error('Unexpected mining response.');
  return response;
};

/**
 * All process-mining actions of the mining view: loading presets and files,
 * re-discovery on filter changes (debounced, latest wins), sending the model
 * to the canvas, exporting the log and cancelling a long request.
 */
export function useMiningSession() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const { request, cancel: cancelWorker } = useMiningClient();
  const pendingUpload = useMiningStore((state) => state.pendingUpload);
  const storageHydrated = useMiningStore((state) => state.storageHydrated);
  const sequenceRef = useRef(0);
  const bootedRef = useRef(false);
  const convertingRef = useRef(false);
  const conformanceTicket = useRef(0);
  const { readFile, cancelFileRead } = useMiningUpload();
  const ownerRevision = useRef(useMiningStore.getState().workerRevision).current;
  const isOwner = useCallback(
    () => useMiningStore.getState().workerRevision === ownerRevision,
    [ownerRevision],
  );
  useEffect(
    () => () => {
      sequenceRef.current += 1;
      bootedRef.current = false;
    },
    [],
  );
  const cancel = useCallback(() => {
    sequenceRef.current += 1;
    cancelFileRead();
    cancelWorker();
    useMiningStore.getState().abortSession(copy.resilience.miningCancelled);
  }, [cancelFileRead, cancelWorker, copy.resilience.miningCancelled]);

  const clear = useCallback(() => {
    sequenceRef.current += 1;
    cancelFileRead();
    cancelWorker();
    const state = useMiningStore.getState();
    if (state.activeTabId) state.closeTab(state.activeTabId);
    else state.abortSession(null);
  }, [cancelFileRead, cancelWorker]);

  const fail = useCallback(
    (reason: unknown) => {
      if (reason instanceof MiningAbortError) {
        // The worker lost the loaded log, so results that depend on it go too.
        useMiningStore
          .getState()
          .abortSession(
            reason.reason === 'cancelled'
              ? copy.resilience.miningCancelled
              : reason.reason === 'timeout'
                ? copy.resilience.miningTimeout
                : copy.resilience.workerRestarting,
          );
        return;
      }
      const tabsCopy = getMiningTabsCopy(usePreferencesStore.getState().locale);
      const message =
        reason instanceof Error && reason.message === 'mining-tab-limit'
          ? tabsCopy.limit
          : reason instanceof Error && reason.message === 'mining-source-limit'
            ? tabsCopy.sourceLimit
            : reason instanceof Error && reason.message === 'document-limit'
              ? copy.documentLimit
              : reason instanceof Error && reason.message === 'file-too-large'
                ? copy.fileTooLarge
                : reason instanceof Error && reason.message === 'xlsx-timeout'
                  ? copy.resilience.miningTimeout
                  : reason instanceof Error && reason.message.startsWith('xlsx-')
                    ? copy.fileError
                    : reason instanceof Error
                      ? (copy.miningImport.errors[reason.message] ?? reason.message)
                      : copy.fileError;
      useMiningStore.getState().setStatus('error', message);
    },
    [copy],
  );

  const run = useCallback(
    async (task: () => Promise<MiningDiscoveryResponse>, nextReplay?: MiningReplay) => {
      const sequence = sequenceRef.current + 1;
      sequenceRef.current = sequence;
      useMiningStore.getState().setStatus('loading');
      try {
        const response = await task();
        if (sequence !== sequenceRef.current || !isOwner()) return;
        useMiningStore.getState().setResult(response, nextReplay);
      } catch (reason) {
        if (sequence === sequenceRef.current && isOwner()) {
          fail(reason);
        }
      }
    },
    [fail, isOwner],
  );

  const loadPreset = useCallback(
    (presetId: MiningPresetId) => {
      try {
        assertMiningCapacity(useMiningStore.getState());
      } catch (reason) {
        fail(reason);
        return Promise.resolve();
      }
      cancelFileRead();
      return run(
        async () =>
          asDiscovery(
            await request({
              type: 'load-preset',
              presetId,
              filter: useMiningStore.getState().filter,
              timePolicy: useMiningStore.getState().timePolicy,
            }),
          ),
        { kind: 'preset', presetId },
      );
    },
    [cancelFileRead, fail, request, run],
  );

  const inspectUpload = useCallback(
    async (upload: PendingUpload) => {
      cancelFileRead();
      const sequence = sequenceRef.current + 1;
      sequenceRef.current = sequence;
      useMiningStore.getState().setStatus('loading');
      try {
        assertMiningCapacity(useMiningStore.getState(), upload.source.length);
        const response = await request({ type: 'inspect-file', ...upload });
        if (sequence !== sequenceRef.current || !isOwner()) return;
        if (response.type !== 'table') throw new Error('Unexpected mining response.');
        useMiningStore.getState().setMappingTable({
          ...response,
          source: upload.source,
          importId: crypto.randomUUID(),
        });
        useMiningStore
          .getState()
          .setStatus(useMiningStore.getState().result ? 'ready' : 'idle');
      } catch (reason) {
        if (sequence === sequenceRef.current && isOwner()) fail(reason);
      }
    },
    [cancelFileRead, fail, request, isOwner],
  );

  const applyMapping = useCallback(
    (mapping: ColumnMapping, settings: EventImportSettings) => {
      const table = useMiningStore.getState().mappingTable;
      if (!table) return;
      useMiningStore.getState().setMappingTable(null);
      void run(
        async () =>
          asDiscovery(
            await request({
              type: 'apply-mapping',
              mapping,
              settings,
              name: table.fileName.replace(LOG_EXTENSION, ''),
              filter: useMiningStore.getState().filter,
              timePolicy: useMiningStore.getState().timePolicy,
            }),
          ),
        {
          kind: 'file',
          fileName: table.fileName,
          source: table.source,
          mapping,
          settings,
        },
      );
    },
    [request, run],
  );

  // Boot: a queued upload wins, otherwise rebuild the previous session or
  // remain empty until a person chooses a source.
  useEffect(() => {
    if (bootedRef.current || !storageHydrated) return;
    bootedRef.current = true;
    const state = useMiningStore.getState();
    const upload = state.takePendingUpload();
    if (upload) {
      void inspectUpload(upload);
      return;
    }
    const previous = state.replay;
    if (previous) {
      void run(async () => {
        const response = await replayMiningLog(
          request,
          previous,
          state.filter,
          state.timePolicy,
          isOwner,
        );
        if (!response) throw new MiningAbortError('cancelled');
        return response;
      });
    }
  }, [inspectUpload, request, run, isOwner, storageHydrated]);

  // Files dropped or opened while the view is visible.
  useEffect(() => {
    if (!pendingUpload || !bootedRef.current) return;
    const upload = useMiningStore.getState().takePendingUpload();
    if (upload) void inspectUpload(upload);
  }, [inspectUpload, pendingUpload]);

  const rediscover = useCallback(
    (options: MiningRediscoveryRequest) => {
      void run(async () => asDiscovery(await request(options)));
    },
    [request, run],
  );
  useMiningRediscovery(rediscover);

  const handleFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const sequence = ++sequenceRef.current;
      useMiningStore.getState().setStatus('loading');
      void readFile(file)
        .then(
          (source) => {
            if (source !== null && sequence === sequenceRef.current && isOwner())
              return inspectUpload({ fileName: file.name, source });
          },
          (error: unknown) => {
            if (sequence === sequenceRef.current && isOwner()) fail(error);
          },
        )
        .catch((error: unknown) => {
          if (sequence === sequenceRef.current && isOwner()) fail(error);
        });
    },
    [fail, inspectUpload, readFile, isOwner],
  );

  const sendToCanvas = useCallback(
    async (name: string): Promise<MiningCanvasOutcome> => {
      if (convertingRef.current) return 'unavailable';
      convertingRef.current = true;
      const sequence = sequenceRef.current;
      try {
        return await createMiningCanvasDocument(
          name,
          request,
          () => sequence === sequenceRef.current && isOwner(),
        );
      } catch (reason) {
        if (sequence === sequenceRef.current && isOwner()) fail(reason);
        return 'failed';
      } finally {
        convertingRef.current = false;
      }
    },
    [fail, request, isOwner],
  );

  const downloadLog = useCallback(async () => {
    const sequence = sequenceRef.current;
    try {
      const response = await request({ type: 'export-log' });
      if (!isOwner() || sequence !== sequenceRef.current) return;
      if (response.type !== 'csv') throw new Error('Unexpected mining response.');
      downloadTextFile(
        exportFileName(response.logName, 'event-log', 'csv'),
        response.csv,
        'text/csv',
      );
    } catch (reason) {
      if (isOwner() && sequence === sequenceRef.current) fail(reason);
    }
  }, [fail, request, isOwner]);

  const checkConformance = useCallback(
    async (
      model = useWorkspaceStore.getState().processModel,
      options: import('@flowculus/process-mining').ConformanceOptions = {},
    ) => {
      const sequence = sequenceRef.current;
      const ticket = ++conformanceTicket.current;
      await runMiningConformance(
        model,
        options,
        request,
        () =>
          isOwner() &&
          sequence === sequenceRef.current &&
          ticket === conformanceTicket.current,
      );
    },
    [request, isOwner],
  );

  return {
    loadPreset,
    applyMapping,
    handleFile,
    sendToCanvas,
    downloadLog,
    request,
    checkConformance,
    cancel,
    clear,
  };
}
