/* eslint-disable @next/next/no-img-element -- object URLs are local preview assets. */
'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ImageSquare, Trash, UploadSimple, Warning, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/components/ui/IconButton';
import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);

export function ImageReferencePanel() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError(copy.imageInvalid);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(copy.imageTooLarge);
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImage({ name: file.name, url });
    setError(null);
  };

  const removeImage = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setImage(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tooltip content={copy.openImage}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label={copy.openImage}
            title={copy.openImage}
            className="focus-ring tb-btn tb-btn--idle"
          >
            <ImageSquare size={15} aria-hidden="true" />
          </button>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-[rgb(10_14_18_/_0.38)] backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-40 max-h-[min(720px,calc(100dvh-2rem))] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] focus:outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
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

          <div className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] p-3">
            {image ? (
              <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--canvas)]">
                <img
                  src={image.url}
                  alt={image.name}
                  className="max-h-[46dvh] w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
                <ImageSquare
                  size={30}
                  className="text-[var(--muted)]"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-[var(--muted-strong)]">
                  {copy.openImage}
                </p>
                <p className="text-xs text-[var(--muted)]">{copy.imageFileHint}</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tooltip content={copy.openImage}>
              <label
                title={copy.openImage}
                className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)] shadow-[0_3px_0_color-mix(in_srgb,var(--accent-strong)_65%,transparent)] transition-transform hover:brightness-[1.03] active:translate-y-px"
              >
                <UploadSimple size={15} aria-hidden="true" />
                {copy.openImage}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => {
                    handleFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
            </Tooltip>
            {image ? (
              <Tooltip content={copy.removeImage}>
                <button
                  type="button"
                  onClick={removeImage}
                  title={copy.removeImage}
                  className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]"
                >
                  <Trash size={15} aria-hidden="true" />
                  {copy.removeImage}
                </button>
              </Tooltip>
            ) : null}
          </div>
          {error ? (
            <p
              className="mt-3 flex items-start gap-2 text-xs text-[var(--danger)]"
              role="alert"
            >
              <Warning size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
          <p className="mt-4 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2.5 text-[11px] leading-5 text-[var(--muted-strong)]">
            {copy.imageRecognitionUnavailable}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
