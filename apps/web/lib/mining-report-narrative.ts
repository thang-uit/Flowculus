import type { MiningDiscoveryResponse } from './mining-engine';
import type { Locale } from './i18n';
import { getMiningDocumentCopy } from './i18n/mining-report-document-copy';
import type { MiningFinding } from './mining-report-findings';

/** Describe existing worker evidence. No duration or discovery metric is recomputed. */
export function miningReportNarrative(
  result: MiningDiscoveryResponse,
  locale: Locale,
  duration: (value: number) => string,
) {
  const copy = getMiningDocumentCopy(locale);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
      value,
    );
  const { stats, variants } = result.discovery;
  const date = (value: number | null) =>
    value == null
      ? copy.unknown
      : new Date(value).toISOString().replace('T', ' ').replace('.000Z', '');
  const overview = [
    copy.scope(
      result.logName,
      number(stats.caseCount),
      number(stats.eventCount),
      number(stats.activityCount),
    ),
    copy.periodText(date(stats.firstEventTime), date(stats.lastEventTime)),
    copy.timing(
      duration(stats.meanLeadTimeMs),
      duration(stats.medianLeadTimeMs),
      duration(stats.minLeadTimeMs),
      duration(stats.maxLeadTimeMs),
    ),
  ];
  const findings: MiningFinding[] = [];
  const add = (
    id: string,
    title: string,
    observation: string,
    meaning: string,
    action: string,
    attention = false,
  ) =>
    findings.push({
      id,
      title,
      observation,
      meaning,
      action,
      tone: attention ? 'attention' : 'neutral',
    });
  if (variants[0])
    add(
      'routes',
      copy.routes,
      copy.routeBody(
        number(stats.variantCount),
        number(variants[0].caseCount),
        percent(variants[0].share),
      ),
      copy.routeMeaning,
      copy.routeAction,
    );
  if (stats.caseCount > 1)
    add(
      'distribution',
      copy.distribution,
      copy.distributionBody(
        duration(stats.meanLeadTimeMs),
        duration(stats.medianLeadTimeMs),
        duration(stats.minLeadTimeMs),
        duration(stats.maxLeadTimeMs),
      ),
      copy.distributionMeaning,
      copy.distributionAction,
    );
  else if (stats.caseCount === 1)
    add(
      'single-case',
      copy.single,
      copy.singleBody,
      copy.singleMeaning,
      copy.singleAction,
    );
  const review = result.importReview;
  if (review?.statusEvents)
    add(
      'status-history',
      copy.status,
      copy.statusBody,
      copy.statusMeaning,
      copy.statusAction,
      true,
    );
  else if (result.missingStartTimes > 0)
    add(
      'missing-starts',
      copy.starts,
      copy.startsBody(number(result.missingStartTimes), number(stats.eventCount)),
      copy.startsMeaning,
      copy.startsAction,
      true,
    );
  const rejected = review?.rejectedRows ?? result.skippedRows + result.invalidTimestamps;
  if (rejected || result.invalidStartTimes)
    add(
      'rejected-records',
      copy.rejected,
      copy.rejectedBody(
        number(rejected),
        number(result.invalidTimestamps),
        number(result.invalidStartTimes),
      ),
      copy.rejectedMeaning,
      copy.rejectedAction,
      true,
    );
  if (review?.duplicateRows)
    add(
      'duplicate-rows',
      copy.duplicates,
      copy.duplicatesBody(number(review.duplicateRows)),
      copy.duplicatesMeaning,
      copy.duplicatesAction,
      true,
    );
  if (review?.unpairedStarts)
    add(
      'unpaired-starts',
      copy.unfinished,
      copy.unfinishedBody(number(review.unpairedStarts)),
      copy.unfinishedMeaning,
      copy.unfinishedAction,
      true,
    );
  if (review && !review.statusEvents && review.resourceEvents < stats.eventCount)
    add(
      'performer-coverage',
      copy.personnel,
      copy.personnelBody(number(review.resourceEvents), number(stats.eventCount)),
      copy.personnelMeaning,
      copy.personnelAction,
      true,
    );
  return { overview, findings, limitations: [copy.windowLimit, copy.limits] };
}
