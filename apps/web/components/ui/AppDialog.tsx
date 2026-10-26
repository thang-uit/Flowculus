'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

/** Accessible modal shell shared by forms, semantic review and the inspector sheet. */
export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  busy = false,
  size = 'default',
  presentation = 'modal',
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  closeLabel: string;
  children: ReactNode;
  busy?: boolean;
  size?: 'default' | 'wide' | 'large';
  presentation?: 'modal' | 'sheet';
}>) {
  const [opener, setOpener] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="app-dialog-overlay" />
        <Dialog.Content
          className={cn(
            'app-dialog',
            size !== 'default' && `app-dialog--${size}`,
            presentation === 'sheet' && 'app-dialog--sheet',
          )}
          onOpenAutoFocus={() => {
            const active = document.activeElement;
            if (active instanceof HTMLElement && !active.closest('[role="dialog"]'))
              setOpener(active);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              if (document.querySelector('[role="dialog"]')) return;
              const target =
                opener?.isConnected && opener !== document.body
                  ? opener
                  : document.querySelector<HTMLElement>(
                      '[role="tab"][aria-selected="true"]',
                    );
              target?.focus();
            });
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <div
            className={
              presentation === 'sheet'
                ? 'sr-only'
                : 'flex items-start justify-between gap-3'
            }
          >
            <div className="min-w-0 flex-1">
              <Dialog.Title className="app-dialog__title">{title}</Dialog.Title>
              <Dialog.Description className="app-dialog__description">
                {description}
              </Dialog.Description>
            </div>
            {presentation === 'modal' ? (
              <IconButton
                icon={X}
                label={closeLabel}
                variant="subtle"
                size="sm"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              />
            ) : null}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
