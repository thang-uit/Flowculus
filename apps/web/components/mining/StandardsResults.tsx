'use client';
import { useState } from 'react';
import type { StandardPerformance } from '@flowculus/process-mining';
import { AppButton } from '@/components/ui/AppButton';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const PAGE_SIZE = 50;

/** Keep large comparisons reachable without mounting every activity/resource row. */
export function StandardsResults({ rows }: Readonly<{ rows: StandardPerformance[] }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const [requestedPage, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const page = Math.min(requestedPage, lastPage);
  const start = page * PAGE_SIZE;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const threshold = new Intl.NumberFormat(locale, { maximumSignificantDigits: 21 });
  return (
    <div className="space-y-3">
      <div
        className="max-h-72 overflow-auto scrollbar-thin focus-ring"
        role="region"
        aria-label={copy.standards}
        tabIndex={0}
      >
        <table className="w-full text-xs">
          <thead>
            <tr>
              {[
                copy.activity,
                copy.resource,
                copy.samples,
                copy.mean,
                copy.limitMinutes,
                copy.exceeded,
              ].map((label) => (
                <th key={label} scope="col" className="p-2 text-left">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(start, start + PAGE_SIZE).map((row) => (
              <tr key={JSON.stringify([row.activity, row.resource])}>
                <th scope="row" className="max-w-52 break-words p-2 text-left">
                  {row.activity}
                </th>
                <td className="max-w-40 break-words p-2">{row.resource}</td>
                <td className="p-2 tabular-nums">{number.format(row.count)}</td>
                <td className="p-2 tabular-nums">{number.format(row.meanMinutes)}</td>
                <td className="p-2 tabular-nums">{threshold.format(row.limitMinutes)}</td>
                <td className="p-2 tabular-nums">{number.format(row.exceeded)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p role="status" className="text-xs text-[var(--muted)]">
        {copy.resultRows(
          rows.length ? start + 1 : 0,
          Math.min(start + PAGE_SIZE, rows.length),
          rows.length,
        )}
      </p>
      {rows.length > PAGE_SIZE ? (
        <div className="flex flex-wrap justify-between gap-2">
          <AppButton size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            {copy.previous}
          </AppButton>
          <AppButton
            size="sm"
            disabled={page === lastPage}
            onClick={() => setPage(page + 1)}
          >
            {copy.next}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
