import type { MiningDiscoveryResponse } from './mining-engine';
import { getMiningReportCopy } from './i18n/mining-report-copy';
import type { Locale } from './i18n';
import type { MiningFinding } from './mining-report-findings';

/** Turn measured full-log evidence into concise findings. Never infer a delay's cause. */
export function miningConclusions(
  result: MiningDiscoveryResponse,
  locale: Locale,
  duration: (value: number) => string,
): MiningFinding[] {
  const copy = getMiningReportCopy(locale);
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
      value,
    );
  const { observations } = result.discovery;
  const findings: MiningFinding[] = observations.handovers.slice(0, 3).map((edge) => ({
    id: edge.id,
    title: `${edge.source} → ${edge.target}`,
    tone: 'attention',
    observation:
      result.missingStartTimes === 0
        ? copy.waitBody(
            edge.source,
            edge.target,
            duration(edge.meanDurationMs),
            duration(edge.maxDurationMs),
            number(edge.frequency),
          )
        : copy.gapBody(
            edge.source,
            edge.target,
            duration(edge.meanDurationMs),
            number(edge.frequency),
          ),
    meaning: copy.waitMeaning,
    action: copy.waitAction(edge.source, edge.target),
  }));
  for (const activity of observations.services.slice(0, 3)) {
    if (activity.meanServiceMs != null)
      findings.push({
        id: `service:${activity.id}`,
        title: activity.id,
        tone: 'neutral',
        observation:
          copy.serviceBody(
            activity.id,
            duration(activity.meanServiceMs),
            number(activity.serviceSampleCount),
          ) +
          (activity.mainResource
            ? ` ${copy.owner(activity.mainResource, percent(activity.mainResourceShare))}`
            : ''),
        meaning: copy.serviceMeaning,
        action: copy.serviceAction,
      });
  }
  if (observations.repeatedCases > 0)
    findings.push({
      id: 'repeats',
      title: copy.repeats,
      tone: 'attention',
      observation: copy.repeatsBody(number(observations.repeatedCases)),
      meaning: copy.repeatsMeaning,
      action: copy.repeatsAction,
    });
  return findings;
}
