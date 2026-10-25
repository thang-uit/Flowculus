'use client';

import { useCallback, useEffect, useRef, type ChangeEvent } from 'react';

import type { ColumnMapping, MiningPresetId } from '@flowculus/process-mining';
import { checkSemanticGate } from '@flowculus/validation';

import { downloadTextFile } from '@/lib/browser-file-actions';
import { exportFileName } from '@/lib/file-name';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningUpload } from '@/lib/use-mining-upload';
import type { MiningDiscoveryResponse, MiningResponse } from '@/lib/mining-engine';
import {
  useMiningStore,
  type MiningReplay,
  type PendingUpload,
} from '@/lib/mining-store';
import { MiningAbortError, useMiningClient } from '@/lib/use-mining-client';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const FILTER_DEBOUNCE_MS = 140;
const DEFAULT_PRESET: MiningPresetId = 'order-to-cash';
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
  const filter = useMiningStore((state) => state.filter);
  const pendingUpload = useMiningStore((state) => state.pendingUpload);
  const sequenceRef = useRef(0);
  const bootedRef = useRef(false);
  const { readFile, cancelFileRead } = useMiningUpload();
  useEffect(
    () => () => {
      sequenceRef.current += 1;
    },
    [],
  );
  const cancel = useCallback(() => {
    sequenceRef.current += 1;
    cancelFileRead();
    cancelWorker();
    useMiningStore.getState().abortSession(copy.resilience.miningCancelled);
  }, [cancelFileRead, cancelWorker, copy.resilience.miningCancelled]);

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
      const message =
        reason instanceof Error && reason.message === 'file-too-large'
          ? copy.fileTooLarge
          : reason instanceof Error && reason.message === 'xlsx-timeout'
            ? copy.resilience.miningTimeout
            : reason instanceof Error && reason.message.startsWith('xlsx-')
              ? copy.fileError
              : reason instanceof Error
                ? reason.message
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
        if (sequence !== sequenceRef.current) return;
        useMiningStore.getState().setResult(response, nextReplay);
      } catch (reason) {
        if (sequence === sequenceRef.current) {
          fail(reason);
        }
      }
    },
    [fail],
  );

  const loadPreset = useCallback(
    (presetId: MiningPresetId) => {
      cancelFileRead();
      return run(
        async () =>
          asDiscovery(
            await request({
              type: 'load-preset',
              presetId,
              filter: useMiningStore.getState().filter,
            }),
          ),
        { kind: 'preset', presetId },
      );
    },
    [cancelFileRead, request, run],
  );

  const inspectUpload = useCallback(
    async (upload: PendingUpload) => {
      cancelFileRead();
      const sequence = sequenceRef.current + 1;
      sequenceRef.current = sequence;
      useMiningStore.getState().setStatus('loading');
      try {
        const response = await request({ type: 'inspect-file', ...upload });
        if (sequence !== sequenceRef.current) return;
        if (response.type !== 'table') throw new Error('Unexpected mining response.');
        useMiningStore.getState().setMappingTable({ ...response, source: upload.source });
        useMiningStore
          .getState()
          .setStatus(useMiningStore.getState().result ? 'ready' : 'idle');
      } catch (reason) {
        if (sequence === sequenceRef.current) fail(reason);
      }
    },
    [cancelFileRead, fail, request],
  );

  const applyMapping = useCallback(
    (mapping: ColumnMapping) => {
      const table = useMiningStore.getState().mappingTable;
      if (!table) return;
      useMiningStore.getState().setMappingTable(null);
      void run(
        async () =>
          asDiscovery(
            await request({
              type: 'apply-mapping',
              mapping,
              name: table.fileName.replace(LOG_EXTENSION, ''),
              filter: useMiningStore.getState().filter,
            }),
          ),
        { kind: 'file', fileName: table.fileName, source: table.source, mapping },
      );
    },
    [request, run],
  );

  // Boot: a queued upload wins, otherwise rebuild the previous session or
  // open the default preset.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const state = useMiningStore.getState();
    const upload = state.takePendingUpload();
    if (upload) {
      void inspectUpload(upload);
      return;
    }
    const previous = state.replay;
    if (previous?.kind === 'preset') void loadPreset(previous.presetId);
    else if (previous?.kind === 'file') {
      void run(async () => {
        await request({
          type: 'inspect-file',
          fileName: previous.fileName,
          source: previous.source,
        });
        return asDiscovery(
          await request({
            type: 'apply-mapping',
            mapping: previous.mapping,
            name: previous.fileName.replace(LOG_EXTENSION, ''),
            filter: state.filter,
          }),
        );
      });
    } else if (!upload) void loadPreset(DEFAULT_PRESET);
  }, [inspectUpload, loadPreset, request, run]);

  // Files dropped or opened while the view is visible.
  useEffect(() => {
    if (!pendingUpload || !bootedRef.current) return;
    const upload = useMiningStore.getState().takePendingUpload();
    if (upload) void inspectUpload(upload);
  }, [inspectUpload, pendingUpload]);

  // Slider changes re-run discovery off the main thread, debounced.
  const filterKey = `${filter.minActivityShare}|${filter.minEdgeShare}|${filter.minTransitionHours}`;
  const lastFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKeyRef.current === filterKey) return;
    lastFilterKeyRef.current = filterKey;
    if (!useMiningStore.getState().replay) return;
    const timer = window.setTimeout(() => {
      void run(async () =>
        asDiscovery(
          await request({ type: 'discover', filter: useMiningStore.getState().filter }),
        ),
      );
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filterKey, request, run]);

  const handleFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const sequence = ++sequenceRef.current;
      useMiningStore.getState().setStatus('loading');
      void readFile(file).then(
        (source) => {
          if (source !== null && sequence === sequenceRef.current)
            return inspectUpload({ fileName: file.name, source });
        },
        (error: unknown) => {
          if (sequence === sequenceRef.current) fail(error);
        },
      );
    },
    [fail, inspectUpload, readFile],
  );

  const sendToCanvas = useCallback(async () => {
    const result = useMiningStore.getState().result;
    if (!result) return;
    try {
      const response = await request({
        type: 'to-model',
        filter: useMiningStore.getState().filter,
        name: result.logName,
      });
      if (response.type !== 'model') throw new Error('Unexpected mining response.');
      useMiningStore.getState().setConversionWarnings(response.warnings);
      const workspace = useWorkspaceStore.getState();
      workspace.loadModel(response.model, {
        drawioSource: null,
        modelName: response.model.name,
      });
      workspace.setMode('model');
    } catch (reason) {
      fail(reason);
    }
  }, [fail, request]);

  const downloadLog = useCallback(async () => {
    try {
      const response = await request({ type: 'export-log' });
      if (response.type !== 'csv') throw new Error('Unexpected mining response.');
      downloadTextFile(
        exportFileName(response.logName, 'event-log', 'csv'),
        response.csv,
        'text/csv',
      );
    } catch (reason) {
      fail(reason);
    }
  }, [fail, request]);

  const checkConformance = useCallback(async () => {
    const model = useWorkspaceStore.getState().processModel;
    const gate = checkSemanticGate(model);
    if (!gate.ok) {
      useMiningStore
        .getState()
        .setConformanceError(copy.semantics.blockedStatus(gate.items.length));
      return;
    }
    const sequence = sequenceRef.current;
    useMiningStore.getState().startConformance();
    try {
      const response = await request({ type: 'check-conformance', model: gate.model });
      if (
        sequence !== sequenceRef.current ||
        model !== useWorkspaceStore.getState().processModel
      )
        return;
      if (response.type !== 'conformance') throw new Error('Unexpected mining response.');
      useMiningStore.getState().setConformance(response.result, model);
    } catch (reason) {
      if (sequence === sequenceRef.current)
        useMiningStore
          .getState()
          .setConformanceError(reason instanceof Error ? reason.message : copy.fileError);
    }
  }, [copy.fileError, copy.semantics, request]);

  return {
    loadPreset,
    applyMapping,
    handleFile,
    sendToCanvas,
    downloadLog,
    checkConformance,
    cancel,
  };
}
