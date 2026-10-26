'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getNodeBounds } from '@flowculus/process-model';

import { importDocumentBatch } from '@/lib/documents/import-document-batch';
import {
  documentContentKey,
  getWorkspaceDocuments,
} from '@/lib/documents/document-types';
import { MAX_IMAGE_PIXELS } from '@/lib/image-trace/file-validation';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { useMiningStore } from '@/lib/mining-store';
import { MAX_OPEN_DOCUMENTS } from '@/lib/documents/document-types';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Header and drop imports share one latest-request lifecycle. */
export function useWorkspaceImport(fallbackName: string) {
  const current = useRef<AbortController | null>(null);
  useEffect(() => {
    const unsubscribe = useWorkspaceStore.subscribe((state, previous) => {
      if (
        state.activeDocumentId !== previous.activeDocumentId ||
        state.modelRevision !== previous.modelRevision
      )
        current.current?.abort();
    });
    return () => {
      current.current?.abort();
      unsubscribe();
    };
  }, []);

  return useCallback(
    async (files: File[], externalSignal?: AbortSignal): Promise<boolean> => {
      if (files.length === 0) return false;
      current.current?.abort();
      const controller = new AbortController();
      current.current = controller;
      const { signal } = controller;
      const abort = () => controller.abort();
      externalSignal?.addEventListener('abort', abort, { once: true });
      if (externalSignal?.aborted) controller.abort();
      let imageRequestId: number | undefined;
      try {
        if (useWorkspaceStore.getState().draftStatus === 'loading') {
          await new Promise<void>((resolve, reject) => {
            const stop = useWorkspaceStore.subscribe((state) => {
              if (state.draftStatus !== 'loading') {
                stop();
                signal.removeEventListener('abort', cancel);
                resolve();
              }
            });
            const cancel = () => {
              stop();
              reject(new DOMException('Cancelled', 'AbortError'));
            };
            signal.addEventListener('abort', cancel, { once: true });
            if (signal.aborted) cancel();
          });
        }
        const batch = await importDocumentBatch(files, fallbackName, signal);
        const imported = batch[0]!;
        signal.throwIfAborted();
        if (imported.kind === 'image') {
          const requestId = useImageReferenceStore.getState().beginUpload();
          imageRequestId = requestId;
          let bitmap: ImageBitmap;
          try {
            bitmap = await createImageBitmap(imported.file);
          } catch {
            throw new Error('decode-failed');
          }
          const { width, height } = bitmap;
          bitmap.close();
          signal.throwIfAborted();
          if (requestId !== useImageReferenceStore.getState().requestId) return false;
          if (width < 32 || height < 32 || width * height > MAX_IMAGE_PIXELS)
            throw new Error('invalid-dimensions');
          const reference = useImageReferenceStore.getState();
          reference.setImage(imported.file, width, height);
          const state = useWorkspaceStore.getState();
          const bottom = Object.values(state.processModel.nodes).reduce((max, node) => {
            const bounds = getNodeBounds(node);
            return Math.max(max, bounds.y + bounds.height);
          }, 0);
          reference.setPosition(0, bottom > 0 ? bottom + 80 : 0);
          reference.setOpen(true);
          state.setMode('model');
          return true;
        }
        const state = useWorkspaceStore.getState();
        if (imported.kind === 'event-log') {
          useMiningStore.getState().queueUpload({
            fileName: imported.fileName,
            source: imported.source,
          });
          state.setMode('mining');
          return true;
        }
        if (state.documents.length + batch.length > MAX_OPEN_DOCUMENTS)
          throw new Error('document-limit');
        // Everything is parsed before mutation. A multi-file selection is all-or-nothing.
        for (const result of batch) {
          if (result.kind !== 'model') continue;
          const id = state.openDocument(
            { ...result.model, name: result.modelName },
            {
              drawioSource: result.drawioSource,
              analysisOptions: result.analysisOptions,
            },
          );
          if (id) {
            const document = getWorkspaceDocuments(useWorkspaceStore.getState()).find(
              (item) => item.id === id,
            )!;
            state.updateDocumentFile(id, {
              savedContent: documentContentKey(document),
              deviceStatus: 'opened',
            });
          }
        }
        state.setMode('model');
        return true;
      } catch (error) {
        if (
          signal.aborted ||
          (imageRequestId !== undefined &&
            imageRequestId !== useImageReferenceStore.getState().requestId)
        )
          return false;
        throw error;
      } finally {
        externalSignal?.removeEventListener('abort', abort);
        if (current.current === controller) current.current = null;
      }
    },
    [fallbackName],
  );
}
