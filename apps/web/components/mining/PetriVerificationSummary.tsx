import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import type { PetriVerification } from '@flowculus/process-mining';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import type { Locale } from '@/lib/i18n';

export function PetriVerificationSummary({
  verification,
  locale,
}: Readonly<{ verification: PetriVerification; locale: Locale }>) {
  const copy = getMiningReportCopy(locale),
    evidence = getMiningEvidenceCopy(locale);
  const verdict = (value: boolean | null) =>
    value == null ? evidence.unknown : value ? evidence.pass : evidence.fail;
  return (
    <section className="mining-report-card space-y-3">
      <h3>{copy.verified}</h3>
      <p className="mining-report-muted">
        {copy.verifiedStates(new Intl.NumberFormat(locale).format(verification.states))}
      </p>
      <p
        className="mining-report-status"
        data-tone={verification.status === 'complete' ? 'positive' : 'attention'}
      >
        {verification.status === 'complete' ? (
          <CheckCircle size={18} aria-hidden="true" />
        ) : (
          <WarningCircle size={18} aria-hidden="true" />
        )}
        <span>
          {verification.status === 'complete' ? evidence.complete : evidence.limit}
        </span>
      </p>
      <dl className="space-y-3">
        {[
          { label: evidence.safe, value: verification.safe, meaning: copy.safeMeaning },
          {
            label: evidence.sound,
            value: verification.sound,
            meaning: copy.soundMeaning,
          },
        ].map((item) => (
          <div key={item.label}>
            <dt className="font-semibold">{item.label}</dt>
            <dd
              className={
                item.value === true
                  ? 'text-[var(--success)]'
                  : item.value === false
                    ? 'text-[var(--danger)]'
                    : 'text-[var(--muted-strong)]'
              }
            >
              {verdict(item.value)}
            </dd>
            <dd className="mining-report-muted">{item.meaning}</dd>
          </div>
        ))}
      </dl>
      {verification.deadlocks.length ? (
        <p className="text-[var(--danger)]">
          {evidence.deadlock}: {verification.deadlocks.length}
        </p>
      ) : null}
      {verification.counterexample ? (
        <details>
          <summary>{evidence.path}</summary>
          <p>{verification.counterexample.join(' → ')}</p>
        </details>
      ) : null}
      <p className="mining-report-muted">{copy.petriCaution}</p>
    </section>
  );
}
