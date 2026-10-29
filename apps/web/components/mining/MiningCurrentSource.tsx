'use client';

import { useState } from 'react';
import { Table } from '@phosphor-icons/react';
import { AppButton } from '@/components/ui/AppButton';
import { AppDialog } from '@/components/ui/AppDialog';
import { getMiningDataCopy } from '@/lib/i18n/mining-data-copy';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Distinguishes the loaded log from the separately saved BPMN documents. */
export function MiningCurrentSource({
  onView,
  onClear,
}: Readonly<{
  onView: () => void;
  onClear: () => void;
}>) {
  const locale = usePreferencesStore((s) => s.locale);
  const copy = getMiningDataCopy(locale);
  const workspaceCopy = getWorkspaceCopy(locale);
  const result = useMiningStore((s) => s.result);
  const replay = useMiningStore((s) => s.replay);
  const available = useMiningStore(
    (s) => s.status === 'ready' && !s.mappingTable && !s.pendingUpload,
  );
  const [confirming, setConfirming] = useState(false);
  if (!result || !replay) return null;
  const file = replay.kind === 'file';
  const name = file ? replay.fileName : workspaceCopy.miningPresets[replay.presetId].name;
  const format = file ? name.split('.').at(-1)?.toUpperCase() : null;
  const number = new Intl.NumberFormat(locale);
  return (
    <div className="space-y-3 border-y border-[var(--border)] py-3">
      <h3 className="text-xs font-semibold text-[var(--text)]">{copy.current}</h3>
      <p className="break-words text-sm font-semibold text-[var(--accent-strong)] [overflow-wrap:anywhere]">
        {name}
      </p>
      <p className="text-xs text-[var(--muted)]">
        {file ? copy.file : copy.sample}
        {format ? ` · ${format}` : ''}
        {file ? ` · ${copy.mapped}` : ''}
      </p>
      <p className="text-xs text-[var(--muted)]">
        {copy.eventCount(
          result.discovery.stats.eventCount,
          number.format(result.discovery.stats.eventCount),
        )}{' '}
        ·{' '}
        {copy.caseCount(
          result.discovery.stats.caseCount,
          number.format(result.discovery.stats.caseCount),
        )}{' '}
        ·{' '}
        {copy.activityCount(
          result.discovery.stats.activityCount,
          number.format(result.discovery.stats.activityCount),
        )}
      </p>
      <p className="text-[11px] leading-4 text-[var(--muted)]">{copy.tabsHint}</p>
      <div className="flex flex-wrap gap-2">
        <AppButton size="sm" variant="primary" disabled={!available} onClick={onView}>
          <Table size={14} aria-hidden="true" />
          {copy.view}
        </AppButton>
        <AppButton size="sm" disabled={!available} onClick={() => setConfirming(true)}>
          {copy.remove}
        </AppButton>
      </div>
      {confirming ? (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(false);
          }}
          title={copy.clearTitle}
          description={copy.clearHint}
          closeLabel={copy.close}
        >
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AppButton onClick={() => setConfirming(false)}>{copy.cancel}</AppButton>
            <AppButton
              variant="danger"
              onClick={() => {
                setConfirming(false);
                onClear();
              }}
            >
              {copy.remove}
            </AppButton>
          </div>
        </AppDialog>
      ) : null}
    </div>
  );
}
