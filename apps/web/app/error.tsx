'use client';

import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';

import { FlowculusMark } from '@/components/branding/FlowculusMark';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas)] p-6">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex items-center gap-2">
          <FlowculusMark compact />
          <WarningCircle
            size={22}
            weight="duotone"
            className="text-[var(--accent-strong)]"
            aria-hidden="true"
          />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
          Workspace could not load
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--muted)]">
          Your local file is safe. Try loading the workspace again.
          <br />
          Tệp cục bộ của bạn vẫn an toàn. Hãy thử tải lại không gian làm việc.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          title="Try again / Thử lại"
          className="focus-ring mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] shadow-[0_3px_0_color-mix(in_srgb,var(--accent-strong)_65%,transparent)] transition-[filter,transform,box-shadow] hover:brightness-[1.03] active:translate-y-px active:shadow-none"
        >
          <ArrowClockwise size={17} aria-hidden="true" />
          Try again / Thử lại
        </button>
      </section>
    </main>
  );
}
