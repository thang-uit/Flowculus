'use client';
import { useCallback, useRef } from 'react';
import { reportWorkspaceImport } from './import-feedback';
import type { WorkspaceImportSelection } from '@/lib/use-workspace-import';
import { openDeviceFiles, supportsDeviceOpen } from './device-file-access';

export function useDeviceOpen(
  importFiles: (selection: WorkspaceImportSelection) => Promise<boolean>,
  fallback: () => void,
) {
  const pending = useRef(false);
  return useCallback(() => {
    if (pending.current) return;
    if (!supportsDeviceOpen()) {
      fallback();
      return;
    }
    pending.current = true;
    // Selection starts the same cancellable lifecycle as drag/drop and input imports.
    void reportWorkspaceImport(importFiles(openDeviceFiles)).finally(() => {
      pending.current = false;
    });
  }, [importFiles, fallback]);
}
