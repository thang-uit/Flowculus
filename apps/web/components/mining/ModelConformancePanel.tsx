import type { ModelConformance } from '@flowculus/process-mining';

import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function ModelConformancePanel({
  result,
  error,
  checking,
  onCheck,
}: Readonly<{
  result: ModelConformance | null;
  error: string | null;
  checking: boolean;
  onCheck: () => void;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const message =
    result?.status === 'unmatched'
      ? copy.miningConformanceUnmatched
      : result?.status === 'unsupported'
        ? copy.miningConformanceUnsupported
        : null;

  return (
    <section className="space-y-3 text-xs">
      <button
        type="button"
        onClick={onCheck}
        disabled={checking}
        className="focus-ring rounded-lg bg-[var(--accent)] px-3 py-2 font-semibold text-[var(--accent-ink)] disabled:opacity-50"
      >
        {copy.miningConformanceCheck}
      </button>
      {checking ? <p role="status">{copy.miningConformanceLoading}</p> : null}
      {error ? (
        <p role="alert" className="text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {result ? (
        <p className="font-semibold text-[var(--text)]">{result.referenceName}</p>
      ) : null}
      <p className="leading-5 text-[var(--muted)]">{copy.miningConformanceHint}</p>
      {result && message ? (
        <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 leading-5 text-[var(--accent-strong)]">
          {message}
        </p>
      ) : result ? (
        <>
          <div className="rounded-lg bg-[var(--accent-soft)] px-3 py-3">
            <p className="text-[11px] text-[var(--accent-strong)]">
              {copy.miningConformanceCases}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">
              {result.compatibleCases} / {result.examinedCases}
            </p>
          </div>
          {result.omittedCases > 0 ? (
            <p className="text-[var(--muted)]">
              {copy.miningConformanceOmitted(result.omittedCases)}
            </p>
          ) : null}
          {result.examples.length ? (
            <ol className="space-y-2">
              {result.examples.map((example) => (
                <li
                  key={example.caseId}
                  className="rounded-lg border border-[var(--border)] p-2.5"
                >
                  <p className="font-semibold text-[var(--text)]">{example.caseId}</p>
                  <p className="mt-1 text-[var(--danger)]">
                    {copy.miningConformanceIssue[example.kind]}
                    {example.activity ? `: ${example.activity}` : ''}
                  </p>
                  {example.expected.length ? (
                    <p className="mt-1 break-words text-[var(--muted)]">
                      {copy.miningConformanceExpected}: {example.expected.join(', ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
