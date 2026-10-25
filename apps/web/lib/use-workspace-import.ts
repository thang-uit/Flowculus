'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getNodeBounds } from '@flowculus/process-model';

import { importWorkspaceFiles } from '@/lib/import-process-file';
import { MAX_IMAGE_PIXELS } from '@/lib/image-trace/file-validation';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { useMiningStore } from '@/lib/mining-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Header and drop imports share one latest-request lifecycle. */
export function useWorkspaceImport(fallbackName: string) {
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);

  return useCallback(
    async (files: File[]): Promise<boolean> => {
      if (files.length === 0) return false;
      current.current?.abort();
      const controller = new AbortController();
      current.current = controller;
      const { signal } = controller;
      try {
        const imported = await importWorkspaceFiles(files, fallbackName, signal);
        signal.throwIfAborted();
        if (imported.kind === 'image') {
          let bitmap: ImageBitmap;
          try {
            bitmap = await createImageBitmap(imported.file);
          } catch {
            throw new Error('decode-failed');
          }
          const { width, height } = bitmap;
          bitmap.close();
          signal.throwIfAborted();
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
        useImageReferenceStore.getState().clear();
        state.loadModel(imported.model, {
          drawioSource: imported.drawioSource,
          analysisOptions: imported.analysisOptions,
          modelName: imported.modelName,
        });
        state.setMode('model');
        return true;
      } catch (error) {
        if (signal.aborted) return false;
        throw error;
      } finally {
        if (current.current === controller) current.current = null;
      }
    },
    [fallbackName],
  );
}
