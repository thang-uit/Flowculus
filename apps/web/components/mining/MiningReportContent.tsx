'use client';
import { ArrowRight } from '@phosphor-icons/react';
import type { MiningDiscoveryResponse } from '@/lib/mining-engine';
import { miningConclusions } from '@/lib/mining-conclusions';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getMiningConclusionsCopy } from '@/lib/i18n/mining-conclusions-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useMiningDuration } from '@/lib/use-mining-duration';
import { useCurrentMiningReference } from '@/lib/use-current-mining-reference';
import { AppButton } from '@/components/ui/AppButton';
import { MiningReportSummary } from './MiningReportSummary';
import { MiningFindingCard } from './MiningFindingCard';
import { ResourceCentralityTable } from './ResourceCentralityTable';
import { MiningResourceFindings } from './MiningResourceFindings';
import { MiningConformanceResults } from './MiningConformanceResults';
import { MiningReportOverview } from './MiningReportOverview';

export function MiningReportContent({
  result,
  onReference,
}: Readonly<{ result: MiningDiscoveryResponse; onReference: () => void }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningReportCopy(locale),
    workspaceCopy = getWorkspaceCopy(locale);
  const duration = useMiningDuration();
  const reference = useCurrentMiningReference();
  const { stats, variants } = result.discovery;
  const route = variants[0];
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  return (
    <div className="space-y-5">
      <MiningReportSummary result={result} locale={locale} duration={duration} />
      <MiningReportOverview result={result} locale={locale} duration={duration} />
      {result.importReview?.statusEvents ? (
        <p className="mining-report-status" data-tone="attention">
          {workspaceCopy.miningImport.modeHints['jira-status']}
        </p>
      ) : null}
      {route ? (
        <section className="mining-report-card">
          <h3>{copy.route}</h3>
          <p className="mining-report-muted">
            {copy.routeCount(
              number(route.caseCount),
              new Intl.NumberFormat(locale, {
                style: 'percent',
                maximumFractionDigits: 1,
              }).format(route.share),
            )}
          </p>
          <ol className="mining-report-route" aria-label={copy.route}>
            {route.activities.slice(0, 8).map((activity, index) => (
              <li key={index}>
                {index > 0 ? <ArrowRight size={13} aria-hidden="true" /> : null}
                <span>{activity}</span>
              </li>
            ))}
          </ol>
          {route.activities.length > 8 ? (
            <details className="mt-2">
              <summary>{copy.routeMore}</summary>
              <p>{route.activities.slice(0, 100).join(' → ')}</p>
              {route.activities.length > 100 ? (
                <p className="mining-report-muted">{copy.stepLimit}</p>
              ) : null}
            </details>
          ) : null}
          <p className="mt-3 mining-report-muted">{copy.routeMeaning}</p>
        </section>
      ) : null}
      <section className="space-y-3">
        <h3>{copy.times}</h3>
        {miningConclusions(result, locale, duration).map((finding) => (
          <MiningFindingCard key={finding.id} finding={finding} copy={copy} />
        ))}
      </section>
      <ResourceCentralityTable network={result.socialNetwork} />
      <MiningResourceFindings network={result.socialNetwork} locale={locale} />
      <section
        className="mining-report-card"
        data-tone={reference ? 'neutral' : 'attention'}
      >
        {reference ? (
          <>
            <p className="mining-report-muted mb-3">{reference.model.name}</p>
            <MiningConformanceResults
              alignment={reference.evidence.alignment}
              locale={locale}
            />
          </>
        ) : (
          <>
            <h3>{copy.comparison}</h3>
            <p>{copy.comparisonHint}</p>
            <AppButton className="mt-3" onClick={onReference}>
              {copy.chooseReference}
            </AppButton>
          </>
        )}
      </section>
      <details className="mining-report-card">
        <summary>{copy.data}</summary>
        <p>
          {result.discovery.timePolicy.basis === 'working' ? copy.working : copy.elapsed}
        </p>
        <p>{copy.observed}</p>
        {result.missingStartTimes > 0 ? (
          <p>{copy.missing(number(result.missingStartTimes))}</p>
        ) : null}
        {result.skippedRows || result.invalidTimestamps || result.invalidStartTimes ? (
          <p>
            {getMiningConclusionsCopy(locale).skipped(
              number(result.skippedRows),
              number(result.invalidTimestamps),
              number(result.invalidStartTimes),
            )}
          </p>
        ) : null}
        <p className="mining-report-muted">{copy.scope}</p>
        <p className="mining-report-muted">
          {workspaceCopy.miningActivities}: {number(stats.activityCount)}
        </p>
      </details>
    </div>
  );
}
