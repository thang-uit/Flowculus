import type { ResourceCentrality } from '@flowculus/process-mining';
import type { MiningConformanceResponse, MiningDiscoveryResponse } from './mining-engine';
import { getMiningConclusionsCopy } from './i18n/mining-conclusions-copy';
import type { Locale } from './i18n';

export interface ConclusionSection {
  title: string;
  paragraphs: string[];
}

/** Renders existing measured evidence, without inferring causality or recomputing CT. */
export function miningConclusions(
  result: MiningDiscoveryResponse,
  locale: Locale,
  duration: (value: number) => string,
  reference?: { name: string; evidence: MiningConformanceResponse },
): ConclusionSection[] {
  const copy = getMiningConclusionsCopy(locale);
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(
      value,
    );
  const { stats, variants, observations, timePolicy } = result.discovery;
  const summary = [
    copy.overview(
      ...([
        stats.caseCount,
        stats.eventCount,
        stats.activityCount,
        stats.resourceCount,
      ].map(number) as [string, string, string, string]),
    ),
    copy.lead(
      ...([
        stats.meanLeadTimeMs,
        stats.medianLeadTimeMs,
        stats.minLeadTimeMs,
        stats.maxLeadTimeMs,
      ].map(duration) as [string, string, string, string]),
    ),
    timePolicy.basis === 'working' ? copy.working : copy.elapsed,
  ];
  const main = variants[0];
  if (main)
    summary.push(
      copy.variant(
        number(stats.variantCount),
        number(main.caseCount),
        percent(main.share),
        main.activities.join(' → '),
      ),
    );
  summary.push(
    observations.repeatedCases
      ? copy.repeats(number(observations.repeatedCases))
      : copy.noRepeats,
  );
  if (result.missingStartTimes)
    summary.push(copy.missing(number(result.missingStartTimes)));
  if (result.skippedRows || result.invalidTimestamps || result.invalidStartTimes)
    summary.push(
      copy.skipped(
        number(result.skippedRows),
        number(result.invalidTimestamps),
        number(result.invalidStartTimes),
      ),
    );
  const times = observations.handovers.map((edge) =>
    result.missingStartTimes === 0
      ? copy.wait(
          edge.source,
          edge.target,
          duration(edge.meanDurationMs),
          duration(edge.medianDurationMs),
          duration(edge.maxDurationMs),
          number(edge.frequency),
        )
      : copy.gap(
          edge.source,
          edge.target,
          duration(edge.meanDurationMs),
          number(edge.frequency),
        ),
  );
  times.push(
    ...observations.services.map((activity) =>
      copy.service(
        activity.id,
        duration(activity.meanServiceMs!),
        number(activity.serviceSampleCount),
        activity.mainResource
          ? copy.owner(activity.mainResource, percent(activity.mainResourceShare))
          : '',
      ),
    ),
  );
  const { resources, handoffs, omittedResources } = result.socialNetwork;
  const leaders = (key: 'incomingHandoffs' | 'betweenness' | 'pageRank') => {
    const ranked = [...resources].sort(
      (a, b) => b[key] - a[key] || a.id.localeCompare(b.id),
    );
    const first = ranked[0];
    if (!first || first[key] <= 0) return null;
    const tied = ranked.filter((person) => Math.abs(person[key] - first[key]) < 1e-9);
    return {
      first,
      names:
        tied
          .slice(0, 3)
          .map((person: ResourceCentrality) => person.id)
          .join(', ') + (tied.length > 3 ? '…' : ''),
    };
  };
  const people: string[] = [];
  const incoming = leaders('incomingHandoffs'),
    broker = leaders('betweenness'),
    rank = leaders('pageRank');
  if (incoming)
    people.push(
      copy.incoming(
        incoming.names,
        number(incoming.first.incomingHandoffs),
        number(incoming.first.inDegree),
      ),
    );
  if (broker) people.push(copy.broker(broker.names, number(broker.first.betweenness)));
  if (rank && handoffs.length)
    people.push(copy.rank(rank.names, number(rank.first.pageRank)));
  if (handoffs[0])
    people.push(
      copy.handoff(handoffs[0].source, handoffs[0].target, number(handoffs[0].count)),
    );
  if (!resources.length) people.push(copy.noResources);
  else
    people.push(
      omittedResources > 0
        ? copy.networkLimit(number(omittedResources))
        : copy.networkComplete,
    );
  const compliance = [
    copy.alpha,
    result.verification?.status === 'complete'
      ? copy.petri(number(result.verification.states))
      : copy.petriLimit,
  ];
  if (reference) {
    const alignment = reference.evidence.alignment;
    compliance.push(
      copy.compared(
        reference.name,
        number(alignment.compatibleCases),
        number(alignment.examinedCases),
        number(alignment.omittedCases),
      ),
    );
    if (alignment.fitness != null)
      compliance.push(copy.fitness(percent(alignment.fitness)));
    if (alignment.status !== 'ready') compliance.push(copy.unsupported);
    compliance.push(
      ...alignment.examples.map((example) =>
        copy.deviation(
          example.caseId,
          example.moves
            .filter((move) => move.kind === 'model')
            .map((move) => move.activity)
            .filter(Boolean)
            .join('”, “'),
          example.moves
            .filter((move) => move.kind === 'log')
            .map((move) => move.activity)
            .filter(Boolean)
            .join('”, “'),
        ),
      ),
    );
    compliance.push(copy.current);
  } else compliance.push(copy.reference);
  return [
    { title: copy.summary, paragraphs: summary },
    { title: copy.times, paragraphs: times },
    { title: copy.people, paragraphs: people },
    { title: copy.compliance, paragraphs: compliance },
    { title: copy.next, paragraphs: [copy.action] },
  ].filter((section) => section.paragraphs.length > 0);
}
