'use client';

import { AppButton } from '@/components/ui/AppButton';
import { AppDialog } from '@/components/ui/AppDialog';
import { AppField } from '@/components/ui/AppField';
import { AppSelect } from '@/components/ui/AppSelect';
import { useMiningLogPage } from '@/lib/use-mining-log-page';
import type { MiningRequest, MiningResponse } from '@/lib/mining-engine';
import type { MiningLogSort } from '@/lib/mining-log-page';
import { MINING_LOG_PAGE_SIZE } from '@/lib/mining-log-page';
import { getMiningDataCopy } from '@/lib/i18n/mining-data-copy';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useState } from 'react';

const time = (value?: number) => (value == null ? '—' : new Date(value).toISOString());

export function MiningLogTableDialog({
  open,
  onClose,
  request,
  sourceName,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  request: (request: MiningRequest) => Promise<MiningResponse>;
  sourceName: string;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningDataCopy(locale);
  const fields = getWorkspaceCopy(locale);
  const number = new Intl.NumberFormat(locale);
  const [query, setQuery] = useState('');
  const [caseId, setCaseId] = useState('');
  const [activity, setActivity] = useState('');
  const [sort, setSort] = useState<MiningLogSort>('source');
  const [offset, setOffset] = useState(0);
  const pageState = useMiningLogPage(request, { query, caseId, activity, sort, offset });
  const page = pageState.page;
  const first = page && page.matched > 0 ? page.offset + 1 : 0;
  const last = page ? Math.min(page.offset + page.rows.length, page.matched) : 0;
  const hasPrevious = !!page && page.offset > 0;
  const hasNext = !!page && page.offset + page.rows.length < page.matched;
  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setOffset(0);
  };
  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={copy.data}
      description={`${sourceName} · ${copy.caption}`}
      closeLabel={copy.close}
      size="large"
    >
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <AppField id="mining-log-search" label={copy.search}>
          <input
            id="mining-log-search"
            type="search"
            value={query}
            onChange={(event) => updateFilter(setQuery, event.target.value)}
            className="focus-ring h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text)]"
            maxLength={160}
          />
        </AppField>
        <AppField id="mining-log-case" label={copy.caseFilter}>
          <input
            id="mining-log-case"
            type="search"
            value={caseId}
            onChange={(event) => updateFilter(setCaseId, event.target.value)}
            className="focus-ring h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text)]"
            maxLength={120}
          />
        </AppField>
        <AppField id="mining-log-activity" label={copy.activityFilter}>
          <input
            id="mining-log-activity"
            type="search"
            value={activity}
            onChange={(event) => updateFilter(setActivity, event.target.value)}
            className="focus-ring h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text)]"
            maxLength={160}
          />
        </AppField>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <AppField id="mining-log-sort" label={copy.sort} className="w-full sm:w-72">
          <AppSelect
            id="mining-log-sort"
            value={sort}
            options={[
              { value: 'source', label: copy.sourceOrder },
              { value: 'complete-asc', label: copy.earliest },
              { value: 'complete-desc', label: copy.latest },
            ]}
            onValueChange={(value) => {
              setSort(value as MiningLogSort);
              setOffset(0);
            }}
          />
        </AppField>
        <AppButton
          type="button"
          size="sm"
          onClick={() => {
            setQuery('');
            setCaseId('');
            setActivity('');
            setSort('source');
            setOffset(0);
          }}
        >
          {copy.reset}
        </AppButton>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{copy.hint}</p>
      <div
        className="focus-ring mt-3 max-h-[48dvh] overflow-auto rounded-xl border border-[var(--border)] scrollbar-thin"
        role="region"
        aria-label={copy.data}
        tabIndex={0}
      >
        <table className="w-full min-w-[760px] text-left text-xs tabular-nums">
          <caption className="sr-only">{copy.caption}</caption>
          <thead className="sticky top-0 bg-[var(--surface-raised)] text-[var(--muted-strong)]">
            <tr>
              {[
                copy.row,
                fields.mappingCaseId,
                fields.mappingActivity,
                fields.mappingStartTimestamp,
                fields.mappingTimestamp,
                fields.mappingResource,
                fields.mappingCost,
              ].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 font-semibold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page?.rows.map(({ index, event }) => (
              <tr
                key={`${index}-${event.caseId}-${event.activity}`}
                className="border-t border-[var(--border)] text-[var(--text)]"
              >
                <td className="px-3 py-2 text-[var(--muted)]">{number.format(index)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {event.caseId}
                </td>
                <td className="max-w-[280px] px-3 py-2">{event.activity}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--muted)]">
                  {time(event.startTime)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {time(event.completeTime)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{event.resource ?? '—'}</td>
                <td className="px-3 py-2">
                  {event.cost == null ? '—' : number.format(event.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pageState.page && !pageState.failed ? (
          <p role="status" className="p-8 text-center text-sm text-[var(--muted)]">
            {copy.loading}
          </p>
        ) : null}
        {page && page.rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--muted)]">{copy.noRows}</p>
        ) : null}
        {pageState.failed ? (
          <div className="flex items-center justify-center gap-3 p-8 text-sm text-[var(--danger)]">
            <span role="alert">{copy.error}</span>
            <AppButton size="sm" onClick={pageState.retry}>
              {copy.retry}
            </AppButton>
          </div>
        ) : null}
      </div>
      {page ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <span role="status">{copy.count(first, last, page.matched, page.total)}</span>
          <div className="flex gap-2">
            <AppButton
              size="sm"
              disabled={!hasPrevious}
              onClick={() => setOffset(Math.max(0, page.offset - MINING_LOG_PAGE_SIZE))}
            >
              {copy.previous}
            </AppButton>
            <AppButton
              size="sm"
              disabled={!hasNext}
              onClick={() => setOffset(page.offset + MINING_LOG_PAGE_SIZE)}
            >
              {copy.next}
            </AppButton>
          </div>
        </div>
      ) : null}
    </AppDialog>
  );
}
