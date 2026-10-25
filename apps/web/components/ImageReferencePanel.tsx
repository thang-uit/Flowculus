/* eslint-disable @next/next/no-img-element -- local blob preview only */
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useReactFlow } from '@xyflow/react';
import { ImageSquare, Trash, UploadSimple, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { ImageReferenceControls } from '@/components/image-trace/ImageReferenceControls';
import { ImageTraceReview } from '@/components/image-trace/ImageTraceReview';
import { IconButton } from '@/components/ui/IconButton';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useImageTrace } from '@/lib/image-trace/use-image-trace';
import { EMPTY_TRACE_CROP, type TraceCrop } from '@/lib/image-trace/file-validation';
import { useImageReferenceStore } from '@/lib/use-image-reference-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

interface ImageReferencePanelProps {
  onImportFiles: (files: File[], signal?: AbortSignal) => Promise<boolean>;
}

export function ImageReferencePanel(props: Readonly<ImageReferencePanelProps>) {
  const url = useImageReferenceStore((state) => state.url);
  return <ImageReferenceDialog key={url ?? 'empty'} {...props} />;
}

function ImageReferenceDialog({ onImportFiles }: Readonly<ImageReferencePanelProps>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const url = useImageReferenceStore((state) => state.url);
  const name = useImageReferenceStore((state) => state.name);
  const blob = useImageReferenceStore((state) => state.blob);
  const storageError = useImageReferenceStore((state) => state.storageError);
  const rotation = useImageReferenceStore((state) => state.rotation);
  const clearImage = useImageReferenceStore((state) => state.clear);
  const [crop, setCrop] = useState<TraceCrop>(EMPTY_TRACE_CROP);
  const open = useImageReferenceStore((state) => state.open);
  const setOpen = useImageReferenceStore((state) => state.setOpen);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trace = useImageTrace();
  const uploadRef = useRef<AbortController | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => () => uploadRef.current?.abort(), []);
  const { setViewport } = useReactFlow();
  const busy = !['idle', 'done', 'error'].includes(trace.stage);
  const stageText =
    trace.stage in copy.imageTraceStage
      ? copy.imageTraceStage[trace.stage as keyof typeof copy.imageTraceStage]
      : null;
  const rawError = trace.error || error;
  const errorText =
    rawError && rawError in copy.imageTraceError
      ? copy.imageTraceError[rawError as keyof typeof copy.imageTraceError]
      : rawError
        ? copy.imageTraceError['trace-failed']
        : null;

  const acceptFile = async (selected: File | undefined) => {
    if (!selected) return;
    uploadRef.current?.abort();
    const controller = new AbortController();
    uploadRef.current = controller;
    trace.reset();
    setUploading(true);
    setError(null);
    try {
      await onImportFiles([selected], controller.signal);
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'decode-failed');
    } finally {
      if (uploadRef.current === controller) {
        uploadRef.current = null;
        setUploading(false);
      }
    }
  };
  const showReference = () => {
    const image = useImageReferenceStore.getState();
    const rect = document.querySelector('.flow-canvas')?.getBoundingClientRect();
    if (rect && image.width > 0 && image.height > 0) {
      const imageWidth = Math.min(image.width, 1200);
      const imageHeight = image.height * (imageWidth / image.width);
      const zoom = Math.max(
        0.15,
        Math.min(1, (rect.width - 80) / imageWidth, (rect.height - 80) / imageHeight),
      );
      void setViewport(
        {
          x: rect.width / 2 - (image.x + imageWidth / 2) * zoom,
          y: rect.height / 2 - (image.y + imageHeight / 2) * zoom,
          zoom,
        },
        { duration: 220 },
      );
    }
    uploadRef.current?.abort();
    if (busy) trace.cancel();
    setOpen(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          uploadRef.current?.abort();
          setUploading(false);
          if (busy) trace.cancel();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-[rgb(10_14_18_/_0.38)] backdrop-blur-[2px]" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocusRef.current;
            if (target?.isConnected) target.focus();
            else document.querySelector<HTMLElement>('.flow-canvas')?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-40 max-h-[calc(100dvh-2rem)] w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-panel)] focus:outline-none sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--text)]">
                {copy.imageReference}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {copy.imageReferenceDescription}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton icon={X} label={copy.close} variant="subtle" size="sm" />
            </Dialog.Close>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="flex min-h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] p-2">
              {url ? (
                <img
                  src={url}
                  alt={name}
                  className="max-h-[30dvh] w-full object-contain"
                />
              ) : (
                <div className="space-y-2 text-center text-[var(--muted)]">
                  <ImageSquare size={30} className="mx-auto" aria-hidden="true" />
                  <p className="text-xs">{copy.imageFileHint}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)]">
                <UploadSimple size={15} aria-hidden="true" />
                {url ? copy.replaceImage : copy.openImage}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label={url ? copy.replaceImage : copy.openImage}
                  onChange={(event) => {
                    void acceptFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              {url ? (
                <>
                  <p className="break-all text-[11px] text-[var(--muted-strong)]">
                    {name}
                  </p>
                  <ImageReferenceControls
                    crop={crop}
                    onCropChange={(next) => {
                      trace.reset();
                      setCrop(next);
                    }}
                    onGeometryChange={trace.reset}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      clearImage();
                      uploadRef.current?.abort();
                      trace.reset();
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                    className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--danger)]"
                  >
                    <Trash size={14} />
                    {copy.removeImage}
                  </button>
                  <p className="text-[11px] leading-5 text-[var(--muted-strong)]">
                    {copy.removeImageHint}
                  </p>
                </>
              ) : null}
            </div>
          </div>
          {url ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!blob || busy || uploading || rotation !== 0}
                onClick={() => {
                  const image = blob ? new File([blob], name, { type: blob.type }) : null;
                  if (image) void trace.scan(image, crop, blob ?? image);
                }}
                className="focus-ring rounded-lg border border-[var(--accent-strong)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
              >
                {trace.stage === 'error' ? copy.imageTraceRetry : copy.imageAssistedTrace}
              </button>
              {busy ? (
                <button
                  type="button"
                  onClick={trace.cancel}
                  className="focus-ring rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)]"
                >
                  {copy.imageTraceCancel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={showReference}
                className="focus-ring rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-soft)]"
              >
                {copy.imageVisualTrace}
              </button>
            </div>
          ) : null}
          {url && rotation !== 0 ? (
            <p className="mt-3 text-xs text-[var(--muted-strong)]">
              {copy.imageTraceRotationHint}
            </p>
          ) : null}
          {uploading ? (
            <p role="status" className="mt-3 text-xs text-[var(--muted-strong)]">
              {copy.imageUploading}
            </p>
          ) : null}
          {stageText ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-3 text-xs text-[var(--muted-strong)]"
            >
              {stageText}
            </p>
          ) : null}
          {errorText ? (
            <p role="alert" className="mt-3 text-xs text-[var(--danger)]">
              {errorText}
            </p>
          ) : null}
          {storageError ? (
            <p role="alert" className="mt-3 text-xs text-[var(--danger)]">
              {copy.imageStorageError}
            </p>
          ) : null}
          {trace.result && url && trace.source === blob && rotation === 0 ? (
            <ImageTraceReview
              result={trace.result}
              imageUrl={url}
              onDone={() => {
                trace.reset();
                setOpen(false);
              }}
            />
          ) : null}
          {!trace.result && !busy ? (
            <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[11px] leading-5 text-[var(--muted)]">
              {copy.imageTraceHint}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
