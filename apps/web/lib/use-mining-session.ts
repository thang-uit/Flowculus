'use client';

import { useCallback, useEffect, useRef, type ChangeEvent } from 'react';

import type { ColumnMapping, MiningPresetId } from '@flowculus/process-mining';

import { downloadTextFile } from '@/lib/browser-file-actions';
import { safeFileStem } from '@/lib/file-name';
import { getWorkspaceCopy } from '@/lib/i18n';
import type { MiningDiscoveryResponse, MiningResponse } from '@/lib/mining-engine';
import {
  useMiningStore,
  type MiningReplay,
  type PendingUpload,
} from '@/lib/mining-store';
import { MiningAbortError, useMiningClient } from '@/lib/use-mining-client';
import { useWorkspaceStore } from '@/lib/workspace-store';

const FILTER_DEBOUNCE_MS = 140;
const DEFAULT_PRESET: MiningPresetId = 'order-to-cash';
const LOG_EXTENSION = /\.(csv|tsv|json|xes|xml|txt)$/i;

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
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const { request, cancel } = useMiningClient();
  const filter = useMiningStore((state) => state.filter);
  const pendingUpload = useMiningStore((state) => state.pendingUpload);
  const sequenceRef = useRef(0);
  const bootedRef = useRef(false);

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
      useMiningStore
        .getState()
        .setStatus('error', reason instanceof Error ? reason.message : copy.fileError);
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
        if (sequence === sequenceRef.current || reason instanceof MiningAbortError) {
          fail(reason);
        }
      }
    },
    [fail],
  );

  const loadPreset = useCallback(
    (presetId: MiningPresetId) =>
      run(
        async () =>
          asDiscovery(
            await request({
              type: 'load-preset',
              presetId,
              filter: useMiningStore.getState().filter,
            }),
          ),
        { kind: 'preset', presetId },
      ),
    [request, run],
  );

  const inspectUpload = useCallback(
    async (upload: PendingUpload) => {
      useMiningStore.getState().setStatus('loading');
      try {
        const response = await request({ type: 'inspect-file', ...upload });
        if (response.type !== 'table') throw new Error('Unexpected mining response.');
        useMiningStore.getState().setMappingTable({ ...response, source: upload.source });
        useMiningStore
          .getState()
          .setStatus(useMiningStore.getState().result ? 'ready' : 'idle');
      } catch (reason) {
        fail(reason);
      }
    },
    [fail, request],
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
      if (!state.replay) return;
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
      void file
        .text()
        .then((source) => inspectUpload({ fileName: file.name, source }), fail);
    },
    [fail, inspectUpload],
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
        `${safeFileStem(response.logName, 'event-log')}.csv`,
        response.csv,
        'text/csv',
      );
    } catch (reason) {
      fail(reason);
    }
  }, [fail, request]);

  return {
    loadPreset,
    applyMapping,
    handleFile,
    sendToCanvas,
    downloadLog,
    cancel,
  };
}
