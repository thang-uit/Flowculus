'use client';

import type { EventImportReview } from '@flowculus/process-mining';
import { AppCheckbox } from '@/components/ui/AppCheckbox';
import { useEffect, useRef } from 'react';
import type { MiningImportCopy } from '@/lib/i18n/types';

export function MiningImportReview({
  review,
  copy,
  acknowledged,
  onAcknowledge,
}: Readonly<{
  review: EventImportReview;
  copy: MiningImportCopy;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}>) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <section className="mt-5 space-y-3" aria-label={copy.reviewTitle}>
      <h3
        className="text-sm font-semibold text-[var(--text)]"
        tabIndex={-1}
        ref={headingRef}
      >
        {copy.reviewTitle}
      </h3>
      <p className="text-sm font-semibold text-[var(--text)]">
        {copy.accepted(review.acceptedEvents, review.caseCount)}
      </p>
      <ul className="list-disc space-y-2 pl-4 text-xs leading-5 text-[var(--muted-strong)]">
        {review.rejectedRows > 0 ? <li>{copy.rejected(review.rejectedRows)}</li> : null}
        {review.duplicateRows > 0 ? (
          <li>{copy.duplicates(review.duplicateRows)}</li>
        ) : null}
        {review.missingStartTimes > 0 ? (
          <li>{copy.starts(review.missingStartTimes)}</li>
        ) : null}
        {review.unpairedStarts > 0 ? (
          <li>{copy.unpaired(review.unpairedStarts)}</li>
        ) : null}
        <li>
          {copy.coverage(review.resourceEvents, review.costEvents, review.acceptedEvents)}
        </li>
        {review.statusEvents ? <li>{copy.modeHints['jira-status']}</li> : null}
      </ul>
      {review.issues.length > 0 ? (
        <details className="rounded-lg border border-[var(--border)] p-3 text-xs leading-5">
          <summary className="focus-ring cursor-pointer font-medium text-[var(--text)]">
            {copy.issueHeading}
          </summary>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[var(--muted-strong)]">
            {review.issues.map(({ row, code }) => (
              <li key={`${row}:${code}`}>{copy.issueRow(row, copy.issues[code])}</li>
            ))}
          </ul>
          <p className="mt-2 text-[var(--muted)]">{copy.issueLimit}</p>
        </details>
      ) : null}
      {review.ambiguousDates ? (
        <p role="alert" className="text-xs leading-5 text-[var(--danger)]">
          {copy.ambiguous}
        </p>
      ) : null}
      {review.acceptedEvents === 0 ? (
        <p role="alert" className="text-xs leading-5 text-[var(--danger)]">
          {copy.noEvents}
        </p>
      ) : null}
      {review.acceptedEvents > 0 && !review.ambiguousDates ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-[var(--surface-raised)] p-3 text-xs leading-5 text-[var(--text)]">
          <AppCheckbox
            checked={acknowledged}
            onChange={(event) => onAcknowledge(event.target.checked)}
          />
          <span>{copy.acknowledge}</span>
        </label>
      ) : null}
    </section>
  );
}
