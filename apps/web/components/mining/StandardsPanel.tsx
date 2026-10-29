'use client';
import { useRef, useState } from 'react';
import { StandardsResults } from './StandardsResults';
import { parseTaskStandards, type StandardPerformance } from '@flowculus/process-mining';
import { AppButton } from '@/components/ui/AppButton';
import { getCalendarCopy } from '@/lib/i18n/calendar-copy';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useMiningStore } from '@/lib/mining-store';
import type { MiningRequest, MiningResponse } from '@/lib/mining-engine';
export function StandardsPanel({
  request,
}: {
  request: (value: MiningRequest) => Promise<MiningResponse>;
}) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const timePolicy = useMiningStore((s) => s.result?.discovery.timePolicy);
  const policyKey = JSON.stringify(timePolicy);
  const log = useMiningStore((state) => state.replay);
  const sequence = useRef(0);
  const [result, setResult] = useState<{
    log: typeof log;
    policyKey: string;
    revision: number;
    rows: StandardPerformance[];
    measured: number;
    compared: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
      <h3 className="font-semibold">{copy.standards}</h3>
      <p className="text-xs leading-5 text-[var(--muted)]">
        {copy.standardsHint} {getCalendarCopy(locale).standards}
      </p>
      <AppButton size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {copy.uploadStandards}
      </AppButton>
      <input
        className="sr-only"
        type="file"
        ref={input}
        accept=".csv,text/csv"
        aria-label={copy.uploadStandards}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const token = ++sequence.current;
          const sourceLog = log;
          const sourcePolicyKey = policyKey;
          setBusy(true);
          setError(false);
          try {
            if (file.size > 1_000_000) throw Error();
            const standards = parseTaskStandards(await file.text());
            if (
              token !== sequence.current ||
              useMiningStore.getState().replay !== sourceLog
            )
              return;
            // Bind the comparison to the displayed discovery, even if a calendar
            // update is queued while the file is being read.
            const response = await request({
              type: 'compare-standards',
              standards,
              timePolicy,
            });
            if (
              response.type === 'standards' &&
              token === sequence.current &&
              useMiningStore.getState().replay === sourceLog
            )
              setResult({
                log: sourceLog,
                policyKey: sourcePolicyKey,
                revision: token,
                rows: response.rows,
                measured: response.measuredEvents,
                compared: response.comparedEvents,
                total: response.totalEvents,
              });
          } catch {
            if (useMiningStore.getState().replay === sourceLog) setError(true);
          } finally {
            if (token === sequence.current) setBusy(false);
          }
        }}
      />
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {copy.standardsInvalid}
        </p>
      ) : null}
      {result && result.log === log && result.policyKey === policyKey ? (
        <>
          <p className="text-xs">
            {copy.timedEvents}: {result.measured}/{result.total}
          </p>
          <p className="text-xs">
            {copy.comparedEvents}: {result.compared}/{result.total}
          </p>
          <StandardsResults key={result.revision} rows={result.rows} />
        </>
      ) : null}
    </section>
  );
}
