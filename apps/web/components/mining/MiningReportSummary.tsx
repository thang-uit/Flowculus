import type { MiningDiscoveryResponse } from '@/lib/mining-engine';
import { miningResourceLeaders } from '@/lib/mining-report-findings';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import type { Locale } from '@/lib/i18n';
import { MiningReportMetrics } from './MiningReportMetrics';

export function MiningReportSummary({
  result,
  locale,
  duration,
}: Readonly<{
  result: MiningDiscoveryResponse;
  locale: Locale;
  duration: (value: number) => string;
}>) {
  const copy = getMiningReportCopy(locale);
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const { stats, observations } = result.discovery;
  const activity = observations.services[0];
  const handover = observations.handovers[0];
  const bridge = miningResourceLeaders(result.socialNetwork, 'betweenness');
  return (
    <MiningReportMetrics
      label={copy.summary}
      items={[
        {
          label: copy.mean,
          value: duration(stats.meanLeadTimeMs),
          detail: copy.caseEvents(number(stats.caseCount), number(stats.eventCount)),
        },
        {
          label: copy.longest,
          value: activity?.id ?? copy.unavailable,
          detail:
            activity?.meanServiceMs != null
              ? copy.measured(
                  duration(activity.meanServiceMs),
                  number(activity.serviceSampleCount),
                )
              : undefined,
          tone: activity ? 'attention' : 'neutral',
        },
        {
          label: result.missingStartTimes === 0 ? copy.wait : copy.gap,
          value: handover ? `${handover.source} → ${handover.target}` : copy.unavailable,
          detail: handover
            ? copy.average(duration(handover.meanDurationMs), number(handover.frequency))
            : undefined,
          tone: handover ? 'attention' : 'neutral',
        },
        {
          label: copy.broker,
          value: bridge?.names ?? copy.noBridge,
          detail: bridge ? copy.score(number(bridge.value)) : undefined,
          tone: bridge ? 'attention' : 'neutral',
        },
      ]}
    />
  );
}
