'use client';

import { useCallback, useEffect, useRef } from 'react';
import { readEventLogFile } from './read-event-log-file';

/** A cancelled or superseded file read cannot reopen a mining upload dialog. */
export function useMiningUpload() {
  const current = useRef<AbortController | null>(null);
  const cancelFileRead = useCallback(() => {
    current.current?.abort();
    current.current = null;
  }, []);
  useEffect(() => cancelFileRead, [cancelFileRead]);

  const readFile = useCallback(
    async (file: File): Promise<string | null> => {
      cancelFileRead();
      const controller = new AbortController();
      current.current = controller;
      try {
        const source = await readEventLogFile(file, controller.signal);
        return controller.signal.aborted || current.current !== controller
          ? null
          : source;
      } catch (error) {
        if (controller.signal.aborted) return null;
        throw error;
      } finally {
        if (current.current === controller) current.current = null;
      }
    },
    [cancelFileRead],
  );
  return { readFile, cancelFileRead };
}
