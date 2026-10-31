import type { ResourceCentrality, SocialNetwork } from '@flowculus/process-mining';
import { getMiningReportCopy } from './i18n/mining-report-copy';
import type { Locale } from './i18n';

export interface MiningFinding {
  id: string;
  title: string;
  observation: string;
  meaning: string;
  action?: string;
  tone: 'neutral' | 'attention' | 'positive';
}
export type ResourceRank =
  | 'connections'
  | 'incomingHandoffs'
  | 'betweenness'
  | 'closeness'
  | 'eigenvector'
  | 'pageRank';
export const resourceRankValue = (resource: ResourceCentrality, key: ResourceRank) =>
  key === 'connections' ? resource.inDegree + resource.outDegree : resource[key];

/** Presentation ranking only. All centrality scores come from the mining worker. */
export function miningResourceLeaders(network: SocialNetwork, key: ResourceRank) {
  if (!network.handoffs.length) return null;
  const ranked = [...network.resources].sort(
    (a, b) =>
      resourceRankValue(b, key) - resourceRankValue(a, key) || a.id.localeCompare(b.id),
  );
  const value = ranked[0] ? resourceRankValue(ranked[0], key) : 0;
  if (value <= 0) return null;
  const tied = ranked.filter(
    (resource) => Math.abs(resourceRankValue(resource, key) - value) < 1e-9,
  );
  return {
    value,
    ids: tied.map((resource) => resource.id),
    names:
      tied
        .slice(0, 3)
        .map((resource) => resource.id)
        .join(', ') + (tied.length > 3 ? ` (+${tied.length - 3})` : ''),
  };
}

export function miningResourceFindings(
  network: SocialNetwork,
  locale: Locale,
): MiningFinding[] {
  const copy = getMiningReportCopy(locale);
  const score = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const topics = [
    ['connections', copy.degree, copy.degreeBody, copy.degreeMeaning, copy.degreeAction],
    [
      'betweenness',
      copy.between,
      copy.betweenBody,
      copy.betweenMeaning,
      copy.betweenAction,
    ],
    [
      'closeness',
      copy.closeness,
      copy.closenessBody,
      copy.closenessMeaning,
      copy.closenessAction,
    ],
    [
      'eigenvector',
      copy.eigenvector,
      copy.eigenBody,
      copy.eigenMeaning,
      copy.eigenAction,
    ],
    ['pageRank', copy.pageRank, copy.rankBody, copy.rankMeaning, copy.rankAction],
  ] as const;
  return topics.flatMap(([key, title, body, meaning, action]) => {
    const leaders = miningResourceLeaders(network, key);
    return leaders
      ? [
          {
            id: key,
            title,
            observation: body(leaders.names, score.format(leaders.value)),
            meaning,
            action,
            tone: key === 'betweenness' ? ('attention' as const) : ('neutral' as const),
          },
        ]
      : [];
  });
}
