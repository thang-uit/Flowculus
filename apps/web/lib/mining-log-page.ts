import type { EventLog, MiningEvent } from '@flowculus/process-mining';

export const MINING_LOG_PAGE_SIZE = 50;
export type MiningLogSort = 'source' | 'complete-asc' | 'complete-desc';
export interface MiningLogQuery {
  query?: string;
  caseId?: string;
  activity?: string;
  sort?: MiningLogSort;
  offset?: number;
}
export interface MiningLogPage {
  type: 'log-page';
  logVersion: number;
  total: number;
  matched: number;
  offset: number;
  rows: Array<{ index: number; event: MiningEvent }>;
}

/** Worker-owned index: retain only the latest filter/sort, never send the full log. */
export function createMiningLogReader(log: EventLog, logVersion: number) {
  let previousKey = '';
  let indices: number[] = [];
  return (request: MiningLogQuery): MiningLogPage => {
    const text = (value: string | undefined) =>
      (value ?? '').trim().slice(0, 160).toLowerCase();
    const query = text(request.query);
    const caseId = text(request.caseId);
    const activity = text(request.activity);
    const sort = request.sort ?? 'source';
    if (!['source', 'complete-asc', 'complete-desc'].includes(sort))
      throw new Error('invalid-log-sort');
    const key = JSON.stringify([query, caseId, activity, sort]);
    if (key !== previousKey) {
      indices = [];
      log.events.forEach((event, index) => {
        if (caseId && !event.caseId.toLowerCase().includes(caseId)) return;
        if (activity && !event.activity.toLowerCase().includes(activity)) return;
        if (
          query &&
          ![event.caseId, event.activity, event.resource ?? ''].some((value) =>
            value.toLowerCase().includes(query),
          )
        )
          return;
        indices.push(index);
      });
      if (sort !== 'source') {
        const direction = sort === 'complete-asc' ? 1 : -1;
        indices.sort(
          (a, b) =>
            direction * (log.events[a].completeTime - log.events[b].completeTime) ||
            a - b,
        );
      }
      previousKey = key;
    }
    const requestedOffset = request.offset ?? 0;
    if (!Number.isSafeInteger(requestedOffset) || requestedOffset < 0)
      throw new Error('invalid-log-offset');
    const lastOffset = Math.max(
      0,
      Math.floor((indices.length - 1) / MINING_LOG_PAGE_SIZE) * MINING_LOG_PAGE_SIZE,
    );
    const offset = Math.min(
      Math.floor(requestedOffset / MINING_LOG_PAGE_SIZE) * MINING_LOG_PAGE_SIZE,
      lastOffset,
    );
    return {
      type: 'log-page',
      logVersion,
      total: log.events.length,
      matched: indices.length,
      offset,
      rows: indices
        .slice(offset, offset + MINING_LOG_PAGE_SIZE)
        .map((index) => ({ index: index + 1, event: log.events[index] })),
    };
  };
}
