import { buildTraces } from './discover';
import type { EventLog } from './types';

const MAX_RESOURCES = 80;
const PAGERANK_DAMPING = 0.85;

export interface ResourceCentrality {
  id: string;
  eventCount: number;
  inDegree: number;
  outDegree: number;
  handoffs: number;
  incomingHandoffs: number;
  outgoingHandoffs: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  pageRank: number;
}

export interface ResourceHandoff {
  source: string;
  target: string;
  count: number;
}

export interface SocialNetwork {
  resources: ResourceCentrality[];
  handoffs: ResourceHandoff[];
  omittedResources: number;
}

/** Directed resource handoffs within cases; repeated and self handoffs count. */
export function buildSocialNetwork(log: EventLog): SocialNetwork {
  const eventCounts = new Map<string, number>();
  const handoffCounts = new Map<string, ResourceHandoff>();
  for (const trace of buildTraces(log)) {
    trace.events.forEach((event, index) => {
      const resource = event.resource?.trim();
      if (resource) eventCounts.set(resource, (eventCounts.get(resource) ?? 0) + 1);
      const next = trace.events[index + 1]?.resource?.trim();
      if (!resource || !next || resource === next) return;
      const key = `${resource}\u0000${next}`;
      const handoff = handoffCounts.get(key) ?? {
        source: resource,
        target: next,
        count: 0,
      };
      handoff.count += 1;
      handoffCounts.set(key, handoff);
    });
  }

  const ids = [...eventCounts.keys()]
    .sort(
      (left, right) =>
        (eventCounts.get(right) ?? 0) - (eventCounts.get(left) ?? 0) ||
        left.localeCompare(right),
    )
    .slice(0, MAX_RESOURCES);
  const selected = new Set(ids);
  const handoffs = [...handoffCounts.values()]
    .filter(({ source, target }) => selected.has(source) && selected.has(target))
    .sort(
      (left, right) =>
        right.count - left.count || left.source.localeCompare(right.source),
    );
  const outgoing = new Map(ids.map((id) => [id, new Map<string, number>()]));
  const incoming = new Map(ids.map((id) => [id, new Map<string, number>()]));
  const neighbors = new Map(ids.map((id) => [id, new Set<string>()]));
  handoffs.forEach(({ source, target, count }) => {
    outgoing.get(source)?.set(target, count);
    incoming.get(target)?.set(source, count);
    neighbors.get(source)?.add(target);
    neighbors.get(target)?.add(source);
  });

  // Brandes' algorithm on unweighted directed paths.
  const betweenness = new Map(ids.map((id) => [id, 0]));
  const closeness = new Map(ids.map((id) => [id, 0]));
  ids.forEach((source) => {
    const predecessors = new Map(ids.map((id) => [id, [] as string[]]));
    const distance = new Map(ids.map((id) => [id, -1]));
    const paths = new Map(ids.map((id) => [id, 0]));
    const queue = [source];
    const order: string[] = [];
    distance.set(source, 0);
    paths.set(source, 1);
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      order.push(current);
      outgoing.get(current)?.forEach((_, next) => {
        if (distance.get(next) === -1) {
          distance.set(next, (distance.get(current) ?? 0) + 1);
          queue.push(next);
        }
        if (distance.get(next) === (distance.get(current) ?? 0) + 1) {
          paths.set(next, (paths.get(next) ?? 0) + (paths.get(current) ?? 0));
          predecessors.get(next)?.push(current);
        }
      });
    }
    const reachable = queue.length - 1;
    const distanceSum = queue.reduce((sum, id) => sum + (distance.get(id) ?? 0), 0);
    closeness.set(
      source,
      reachable && distanceSum && ids.length > 1
        ? (reachable / distanceSum) * (reachable / (ids.length - 1))
        : 0,
    );
    const dependency = new Map(ids.map((id) => [id, 0]));
    while (order.length) {
      const target = order.pop() as string;
      predecessors.get(target)?.forEach((previous) => {
        dependency.set(
          previous,
          (dependency.get(previous) ?? 0) +
            ((paths.get(previous) ?? 0) / (paths.get(target) ?? 1)) *
              (1 + (dependency.get(target) ?? 0)),
        );
      });
      if (target !== source)
        betweenness.set(
          target,
          (betweenness.get(target) ?? 0) + (dependency.get(target) ?? 0),
        );
    }
  });

  const count = ids.length;
  let pageRank = new Map(ids.map((id) => [id, count ? 1 / count : 0]));
  let eigenvector = new Map(ids.map((id) => [id, count ? 1 / Math.sqrt(count) : 0]));
  for (let iteration = 0; iteration < 50 && count; iteration += 1) {
    const dangling = ids.reduce(
      (sum, id) => sum + (outgoing.get(id)?.size ? 0 : (pageRank.get(id) ?? 0)),
      0,
    );
    const nextRank = new Map<string, number>();
    const nextEigen = new Map<string, number>();
    ids.forEach((id) => {
      const rankFromIncoming = [...(incoming.get(id) ?? [])].reduce(
        (sum, [source, weight]) => {
          const totalWeight = [...(outgoing.get(source)?.values() ?? [])].reduce(
            (total, value) => total + value,
            0,
          );
          return sum + ((pageRank.get(source) ?? 0) * weight) / totalWeight;
        },
        0,
      );
      nextRank.set(
        id,
        (1 - PAGERANK_DAMPING) / count +
          PAGERANK_DAMPING * (rankFromIncoming + dangling / count),
      );
      nextEigen.set(
        id,
        [...(neighbors.get(id) ?? [])].reduce(
          (sum, neighbor) => sum + (eigenvector.get(neighbor) ?? 0),
          0,
        ),
      );
    });
    const norm = Math.hypot(...nextEigen.values());
    ids.forEach((id) => nextEigen.set(id, norm ? (nextEigen.get(id) ?? 0) / norm : 0));
    pageRank = nextRank;
    eigenvector = nextEigen;
  }

  const resources = ids.map((id) => ({
    id,
    eventCount: eventCounts.get(id) ?? 0,
    inDegree: incoming.get(id)?.size ?? 0,
    outDegree: outgoing.get(id)?.size ?? 0,
    incomingHandoffs: [...(incoming.get(id)?.values() ?? [])].reduce(
      (sum, value) => sum + value,
      0,
    ),
    outgoingHandoffs: [...(outgoing.get(id)?.values() ?? [])].reduce(
      (sum, value) => sum + value,
      0,
    ),
    handoffs: handoffs.reduce(
      (sum, edge) => sum + (edge.source === id || edge.target === id ? edge.count : 0),
      0,
    ),
    betweenness: count > 2 ? (betweenness.get(id) ?? 0) / ((count - 1) * (count - 2)) : 0,
    closeness: closeness.get(id) ?? 0,
    eigenvector: eigenvector.get(id) ?? 0,
    pageRank: pageRank.get(id) ?? 0,
  }));
  return {
    resources,
    handoffs,
    omittedResources: eventCounts.size - resources.length,
  };
}
