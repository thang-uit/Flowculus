'use client';
import { ArrowsOut, ChartBar } from '@phosphor-icons/react';
import { useState } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { AppDialog } from '@/components/ui/AppDialog';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import type { MiningDiscoveryResponse } from '@/lib/mining-engine';
import { MiningReportContent } from './MiningReportContent';

export function MiningConclusions({
  result,
}: Readonly<{ result: MiningDiscoveryResponse }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningReportCopy(locale);
  const [expanded, setExpanded] = useState(false);
  const goToReference = () => {
    setExpanded(false);
    useMiningStore.getState().setInsight('conformance');
  };
  return (
    <>
      <section className="mining-report space-y-5" aria-label={copy.title}>
        <div className="mining-report-head">
          <div className="min-w-0">
            <h2 className="flex items-start gap-2">
              <ChartBar size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              {copy.title}
            </h2>
            <p className="mt-1 mining-report-muted">{copy.source(result.logName)}</p>
          </div>
          <AppButton
            size="sm"
            onClick={() => setExpanded(true)}
            title={copy.expand}
            aria-label={copy.expand}
          >
            <ArrowsOut size={16} aria-hidden="true" />
          </AppButton>
        </div>
        <MiningReportContent result={result} onReference={goToReference} />
      </section>
      {expanded ? (
        <AppDialog
          open
          onOpenChange={setExpanded}
          title={copy.title}
          description={copy.source(result.logName)}
          closeLabel={copy.close}
          size="large"
        >
          <div className="mining-report mt-5">
            <MiningReportContent result={result} onReference={goToReference} />
          </div>
        </AppDialog>
      ) : null}
    </>
  );
}
