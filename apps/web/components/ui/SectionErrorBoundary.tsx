'use client';

import { ArrowClockwise, WarningOctagon } from '@phosphor-icons/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

type SectionKey = 'canvas' | 'mining' | 'analysis' | 'inspector';

function SectionErrorFallback({
  section,
  error,
  onRetry,
}: Readonly<{ section: SectionKey; error: Error; onRetry: () => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale).resilience;
  return (
    <div
      role="alert"
      className="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 bg-[var(--surface-raised)] p-6 text-center"
    >
      <WarningOctagon size={28} className="text-[var(--danger)]" aria-hidden="true" />
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-[var(--text)]">
          {copy.sectionErrorTitle(copy.sections[section])}
        </p>
        <p className="text-xs leading-5 text-[var(--muted)]">{copy.sectionErrorBody}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-ink)] hover:brightness-105"
      >
        <ArrowClockwise size={14} aria-hidden="true" />
        {copy.retry}
      </button>
      <details className="max-w-md text-left text-[11px] text-[var(--muted)]">
        <summary className="focus-ring cursor-pointer rounded">
          {copy.errorDetails}
        </summary>
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono">
          {error.message}
        </pre>
      </details>
    </div>
  );
}

interface SectionErrorBoundaryProps {
  section: SectionKey;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  error: Error | null;
  attempt: number;
}

/**
 * Isolates a workspace section: a rendering error in the canvas, mining view,
 * analysis panel or Inspector shows a local fallback with retry instead of
 * blanking the whole app. The model itself lives in the store and the local
 * draft, so a retry remounts the section with the same data.
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Flowculus ${this.props.section} failed`, error, info.componentStack);
  }

  private readonly retry = () =>
    this.setState((state) => ({ error: null, attempt: state.attempt + 1 }));

  render(): ReactNode {
    if (this.state.error) {
      return (
        <SectionErrorFallback
          section={this.props.section}
          error={this.state.error}
          onRetry={this.retry}
        />
      );
    }
    return <SectionKeyed key={this.state.attempt}>{this.props.children}</SectionKeyed>;
  }
}

function SectionKeyed({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
