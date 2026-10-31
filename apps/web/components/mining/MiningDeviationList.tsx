import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import type { AlignmentConformance } from '@flowculus/process-mining';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import type { Locale } from '@/lib/i18n';

export function MiningDeviationList({
  alignment,
  locale,
}: Readonly<{ alignment: AlignmentConformance; locale: Locale }>) {
  const copy = getMiningReportCopy(locale);
  const evidence = getMiningEvidenceCopy(locale);
  const differences = Math.max(0, alignment.examinedCases - alignment.compatibleCases);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  return (
    <div className="space-y-3">
      <p
        className="mining-report-status"
        data-tone={
          differences > 0 || alignment.status !== 'ready' ? 'attention' : 'positive'
        }
        role="status"
      >
        {differences > 0 || alignment.status !== 'ready' ? (
          <WarningCircle size={18} aria-hidden="true" />
        ) : (
          <CheckCircle size={18} aria-hidden="true" />
        )}
        <span>
          {alignment.examinedCases === 0
            ? copy.noChecked
            : differences > 0
              ? copy.differences(number(differences))
              : copy.allMatch(number(alignment.examinedCases))}
        </span>
      </p>
      {differences > 0 ? (
        <p className="mining-report-muted">{copy.deviationHint}</p>
      ) : null}
      {alignment.examples.map((example) => {
        const missing = example.moves
          .filter((move) => move.kind === 'model')
          .slice(0, 100);
        const extra = example.moves.filter((move) => move.kind === 'log').slice(0, 100);
        const actual = example.moves.filter(
          (move) => move.kind === 'sync' || move.kind === 'log',
        );
        return (
          <article key={example.caseId} className="mining-report-deviation">
            <h4>{example.caseId}</h4>
            {missing.length ? (
              <div className="mt-2">
                <strong>{copy.missingSteps}</strong>
                <ul>
                  {missing.map((move, index) => (
                    <li key={index}>{move.activity}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {extra.length ? (
              <div className="mt-2">
                <strong>{copy.extraSteps}</strong>
                <ul>
                  {extra.map((move, index) => (
                    <li key={index}>{move.activity}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <details className="mt-3">
              <summary>{copy.actual}</summary>
              <p>
                {actual
                  .slice(0, 100)
                  .map((move) => move.activity)
                  .join(' → ')}
              </p>
            </details>
            <details className="mt-3">
              <summary>{copy.alignmentPath}</summary>
              <ol className="list-decimal space-y-1 pl-5">
                {example.moves.slice(0, 100).map((move, index) => (
                  <li
                    key={index}
                    className={
                      move.kind === 'sync'
                        ? 'text-[var(--muted-strong)]'
                        : 'text-[var(--danger)]'
                    }
                  >
                    {move.kind === 'model'
                      ? evidence.modelMove
                      : move.kind === 'log'
                        ? evidence.logMove
                        : evidence.syncMove}
                    : {move.activity}
                  </li>
                ))}
              </ol>
              <p className="mining-report-muted">
                {evidence.cost}: {example.cost}
              </p>
            </details>
            {example.moves.length > 100 ? (
              <p className="mining-report-muted">{copy.stepLimit}</p>
            ) : null}
          </article>
        );
      })}
      {differences > alignment.examples.length ? (
        <p className="mining-report-muted">
          {copy.exampleLimit(number(alignment.examples.length), number(differences))}
        </p>
      ) : null}
    </div>
  );
}
