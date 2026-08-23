import { FlowculusMark } from '@/components/branding/FlowculusMark';

export default function Loading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas)] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <FlowculusMark compact className="animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-soft)]" />
            <div className="h-2.5 w-36 animate-pulse rounded bg-[var(--surface-soft)]" />
          </div>
        </div>
        <div className="mt-6 h-2.5 w-full animate-pulse rounded bg-[var(--surface-soft)]" />
        <div className="mt-2 h-2.5 w-4/5 animate-pulse rounded bg-[var(--surface-soft)]" />
      </div>
    </main>
  );
}
