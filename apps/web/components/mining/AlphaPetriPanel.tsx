import type { AlphaMiningResult } from '@flowculus/process-mining';

import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Makes the Alpha relation and Petri place evidence visible without calling it compliance. */
export function AlphaPetriPanel({ result }: Readonly<{ result: AlphaMiningResult }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);

  if (result.status === 'too-complex') {
    return (
      <p className="text-xs leading-5 text-[var(--muted-strong)]">
        {copy.miningAlphaLimit}
      </p>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <p className="leading-5 text-[var(--muted)]">{copy.miningAlphaHint}</p>
      <dl className="grid grid-cols-3 gap-2">
        {[
          [copy.miningAlphaCausal, result.causalCount],
          [copy.miningAlphaParallel, result.parallelCount],
          [copy.miningPetriPlaces, result.places.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-[var(--surface-soft)] px-2 py-2">
            <dt className="text-[10px] text-[var(--muted)]">{label}</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-[var(--text)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {result.selfLoops.length || result.shortLoops.length ? (
        <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 leading-5 text-[var(--accent-strong)]">
          {copy.miningAlphaLoops}
        </p>
      ) : null}
      <section>
        <h3 className="mb-2 font-semibold text-[var(--text)]">
          {copy.miningPetriPlaces}
        </h3>
        <ol className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
          {result.places.map((place, index) => (
            <li
              key={`${place.inputs.join(',')}:${place.outputs.join(',')}`}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-2 text-[var(--text)]"
            >
              <span className="min-w-0 flex-1 break-words text-right">
                {place.inputs.join(', ')}
              </span>
              <span
                className="shrink-0 text-[var(--accent-strong)]"
                aria-label={`P${index + 1}`}
              >
                → ○ →
              </span>
              <span className="min-w-0 flex-1 break-words">
                {place.outputs.join(', ')}
              </span>
            </li>
          ))}
        </ol>
      </section>
      {result.replay ? (
        <section className="space-y-1">
          <h3 className="font-semibold text-[var(--text)]">{copy.miningAlphaReplay}</h3>
          <p className="font-semibold tabular-nums text-[var(--accent-strong)]">
            {result.replay.compatibleCases} / {result.replay.examinedCases}
          </p>
          <p className="leading-5 text-[var(--muted)]">{copy.miningAlphaReplayHint}</p>
          {result.replay.examples.length ? (
            <p className="break-words text-[var(--muted-strong)]">
              {copy.miningAlphaExamples}: {result.replay.examples.join(', ')}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
