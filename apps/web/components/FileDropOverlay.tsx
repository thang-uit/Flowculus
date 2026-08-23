'use client';

import { UploadSimple } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { WorkspaceCopy } from '@/lib/i18n';

interface FileDropOverlayProps {
  copy: Pick<WorkspaceCopy, 'dropFiles' | 'dropFilesHint' | 'fileError' | 'fileTooLarge'>;
  onImportFiles: (files: File[]) => Promise<void>;
}

const carriesFiles = (event: DragEvent): boolean =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files') ||
  Boolean(event.dataTransfer?.files.length);

/** A document-level drop target that never intercepts draw.io shape drags. */
export function FileDropOverlay({ copy, onImportFiles }: FileDropOverlayProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<number | null>(null);

  const importDroppedFiles = useCallback(
    (files: File[]) => {
      void onImportFiles(files).catch((reason: unknown) => {
        setError(
          reason instanceof Error && reason.message === 'file-too-large'
            ? copy.fileTooLarge
            : copy.fileError,
        );
        if (errorTimerRef.current != null) window.clearTimeout(errorTimerRef.current);
        errorTimerRef.current = window.setTimeout(() => {
          errorTimerRef.current = null;
          setError(null);
        }, 3200);
      });
    },
    [copy.fileError, copy.fileTooLarge, onImportFiles],
  );

  useEffect(() => {
    const handleDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setActive(true);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      setActive(true);
    };
    const handleDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      if (event.relatedTarget == null) setActive(false);
    };
    const handleDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setActive(false);
      importDroppedFiles(Array.from(event.dataTransfer?.files ?? []));
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [importDroppedFiles]);

  useEffect(
    () => () => {
      if (errorTimerRef.current != null) window.clearTimeout(errorTimerRef.current);
    },
    [],
  );

  if (!active && !error) return null;

  if (!active) {
    return (
      <div
        className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[var(--danger)]/45 bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--danger)] shadow-[var(--shadow-panel)]"
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex cursor-copy items-center justify-center bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] p-6 backdrop-blur-[2px]"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setActive(false);
        importDroppedFiles(Array.from(event.dataTransfer.files));
      }}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none w-full max-w-md rounded-2xl border-2 border-dashed border-[var(--accent-strong)] bg-[var(--surface)] px-6 py-8 text-center shadow-[var(--shadow-panel)]">
        <UploadSimple
          size={30}
          weight="duotone"
          className="mx-auto text-[var(--accent-strong)]"
          aria-hidden="true"
        />
        <p className="mt-3 text-base font-semibold text-[var(--text)]">
          {copy.dropFiles}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">{copy.dropFilesHint}</p>
      </div>
    </div>
  );
}
