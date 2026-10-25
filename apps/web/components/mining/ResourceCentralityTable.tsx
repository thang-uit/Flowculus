import type { SocialNetwork } from '@flowculus/process-mining';

import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const score = (value: number) => value.toFixed(3);

/** Directed handoff metrics, computed only for the bounded resource network. */
export function ResourceCentralityTable({
  network,
}: Readonly<{ network: SocialNetwork }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  if (!network.resources.length) return <p>{copy.miningNoResources}</p>;

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-4 text-[var(--muted)]">
        {copy.miningNetworkHint}
      </p>
      {network.omittedResources > 0 ? (
        <p className="text-[11px] text-[var(--muted)]">
          {copy.miningShownResources(
            network.resources.length,
            network.resources.length + network.omittedResources,
          )}
        </p>
      ) : null}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[560px] text-left text-[11px] tabular-nums">
          <thead className="border-b border-[var(--border)] text-[var(--muted-strong)]">
            <tr>
              <th scope="col" className="px-2 py-2">
                {copy.miningResource}
              </th>
              <th scope="col" className="px-2 py-2">
                {copy.miningHandoffs}
              </th>
              <th scope="col" className="px-2 py-2">
                {copy.miningDegree}
              </th>
              <th scope="col" className="px-2 py-2">
                {copy.miningBetweenness}
              </th>
              <th scope="col" className="px-2 py-2">
                {copy.miningCloseness}
              </th>
              <th scope="col" className="px-2 py-2">
                {copy.miningEigenvector}
              </th>
              <th scope="col" className="px-2 py-2">
                {copy.miningPageRank}
              </th>
            </tr>
          </thead>
          <tbody>
            {network.resources.map((resource) => (
              <tr
                key={resource.id}
                className="border-b border-[var(--border)] text-[var(--text)]"
              >
                <th
                  scope="row"
                  className="max-w-[150px] truncate px-2 py-2 font-semibold"
                  title={resource.id}
                >
                  {resource.id}
                </th>
                <td className="px-2 py-2">{resource.handoffs}</td>
                <td className="px-2 py-2">{resource.inDegree + resource.outDegree}</td>
                <td className="px-2 py-2">{score(resource.betweenness)}</td>
                <td className="px-2 py-2">{score(resource.closeness)}</td>
                <td className="px-2 py-2">{score(resource.eigenvector)}</td>
                <td className="px-2 py-2">{score(resource.pageRank)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
