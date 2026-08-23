import Link from 'next/link';

import { FlowculusMark } from '@/components/branding/FlowculusMark';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas)] p-6">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-soft)]">
        <FlowculusMark className="mx-auto" />
        <h1 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          This Flowculus route does not exist.
          <br />
          Đường dẫn Flowculus này không tồn tại.
        </p>
        <Link
          href="/"
          title="Return to workspace / Về không gian làm việc"
          className="focus-ring mt-5 inline-flex h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-soft)]"
        >
          Return to workspace / Về không gian làm việc
        </Link>
      </section>
    </main>
  );
}
