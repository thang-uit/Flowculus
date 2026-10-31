'use client';
import { useId, useState } from 'react';
import type { SocialNetwork } from '@flowculus/process-mining';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppField } from '@/components/ui/AppField';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import {
  miningResourceLeaders,
  resourceRankValue,
  type ResourceRank,
} from '@/lib/mining-report-findings';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function ResourceCentralityTable({
  network,
}: Readonly<{ network: SocialNetwork }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningReportCopy(locale),
    evidence = getMiningEvidenceCopy(locale);
  const id = useId();
  const [sort, setSort] = useState<ResourceRank>('incomingHandoffs');
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const bridge = miningResourceLeaders(network, 'betweenness');
  const ranked = [...network.resources].sort(
    (a, b) =>
      resourceRankValue(b, sort) - resourceRankValue(a, sort) || a.id.localeCompare(b.id),
  );
  if (!network.resources.length)
    return <p className="mining-report-status">{copy.noResources}</p>;
  const options = [
    ['incomingHandoffs', evidence.inWeight],
    ['connections', copy.degree],
    ['betweenness', copy.between],
    ['closeness', copy.closeness],
    ['eigenvector', copy.eigenvector],
    ['pageRank', copy.pageRank],
  ].map(([value, label]) => ({ value, label }));
  return (
    <section className="space-y-3">
      <h3>{copy.table}</h3>
      <p className="mining-report-muted">{copy.peopleScope}</p>
      {network.omittedResources > 0 ? (
        <p className="mining-report-status" data-tone="attention">
          {copy.peopleLimit(number.format(network.omittedResources))}
        </p>
      ) : null}
      {!network.handoffs.length ? (
        <p className="mining-report-status">{copy.noRelations}</p>
      ) : null}
      <AppField id={id} label={copy.ranking}>
        <AppSelect
          id={id}
          value={sort}
          options={options}
          onValueChange={(value) => setSort(value as ResourceRank)}
        />
      </AppField>
      <div
        className="mining-report-table-wrap focus-ring"
        role="region"
        aria-label={copy.table}
        tabIndex={0}
      >
        <table className="mining-report-table min-w-[540px]">
          <caption className="sr-only">{copy.table}</caption>
          <thead>
            <tr>
              {[
                evidence.resource,
                copy.senderReceiver,
                copy.transfers,
                copy.events,
                options.find((option) => option.value === sort)!.label,
              ].map((label, index) => (
                <th key={`${label}:${index}`} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((resource) => (
              <tr key={resource.id}>
                <th scope="row" className="min-w-40 max-w-64 break-words">
                  {resource.id}
                  {bridge?.ids.includes(resource.id) ? (
                    <span className="mining-report-badge">{copy.bridgeBadge}</span>
                  ) : null}
                </th>
                <td>
                  {resource.inDegree} / {resource.outDegree}
                </td>
                <td>
                  {resource.incomingHandoffs} / {resource.outgoingHandoffs}
                </td>
                <td>{resource.eventCount}</td>
                <td className="font-semibold text-[var(--report-heading)]">
                  {number.format(resourceRankValue(resource, sort))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary>{copy.advanced}</summary>
        <div
          className="mining-report-table-wrap focus-ring"
          role="region"
          aria-label={copy.advanced}
          tabIndex={0}
        >
          <table className="mining-report-table min-w-[680px]">
            <thead>
              <tr>
                {[
                  evidence.resource,
                  copy.degree,
                  copy.between,
                  copy.closeness,
                  copy.eigenvector,
                  copy.pageRank,
                ].map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((resource) => (
                <tr key={resource.id}>
                  <th scope="row">{resource.id}</th>
                  {(
                    [
                      'connections',
                      'betweenness',
                      'closeness',
                      'eigenvector',
                      'pageRank',
                    ] as const
                  ).map((key) => (
                    <td key={key}>{number.format(resourceRankValue(resource, key))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
