'use client';

import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNoticeStore, type Notice } from '@/lib/ui/notice-store';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

function Toast({ notice, closeLabel }: Readonly<{ notice: Notice; closeLabel: string }>) {
  const dismiss = useNoticeStore((state) => state.dismiss),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const start = () => {
    stop();
    if (notice.tone !== 'error')
      timer.current = setTimeout(() => dismiss(notice.id), 4000);
  };
  useEffect(() => {
    if (notice.tone !== 'error')
      timer.current = setTimeout(() => dismiss(notice.id), 4000);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [dismiss, notice.id, notice.tone]);
  const Icon =
    notice.tone === 'error'
      ? WarningCircle
      : notice.tone === 'success'
        ? CheckCircle
        : Info;
  return (
    <div
      className="app-toast"
      role={notice.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocusCapture={stop}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) start();
      }}
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={
          notice.tone === 'error'
            ? 'shrink-0 text-[var(--danger)]'
            : notice.tone === 'success'
              ? 'shrink-0 text-[var(--success)]'
              : 'shrink-0 text-[var(--accent-strong)]'
        }
      />
      <span className="app-toast__message">{notice.message}</span>
      <button
        className="focus-ring tb-btn tb-btn--idle"
        aria-label={closeLabel}
        onClick={() => dismiss(notice.id)}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
export function ToastViewport() {
  const notices = useNoticeStore((state) => state.notices),
    locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const previousLocale = useRef(locale);
  useEffect(() => {
    if (previousLocale.current !== locale) {
      previousLocale.current = locale;
      useNoticeStore.setState({ notices: [] });
    }
  }, [locale]);
  if (!notices.length) return null;
  return createPortal(
    <div className="app-toast-viewport">
      {notices.map((notice) => (
        <Toast key={notice.id} notice={notice} closeLabel={copy.close} />
      ))}
    </div>,
    document.body,
  );
}
