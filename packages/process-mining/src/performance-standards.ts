import { createDurationClock, type TimePolicy } from './business-calendar';
import { parseCsvTable } from '@flowculus/file-formats';
import type { EventLog } from './types';
export interface TaskStandard {
  activity: string;
  maxServiceMinutes: number;
}
export interface StandardPerformance {
  activity: string;
  resource: string;
  count: number;
  meanMinutes: number;
  maxMinutes: number;
  limitMinutes: number;
  exceeded: number;
}
export function parseTaskStandards(source: string): TaskStandard[] {
  const table = parseCsvTable(source);
  const [headers, ...rows] = table.rows;
  if (
    !headers ||
    headers[0] !== 'activity' ||
    headers[1] !== 'max_service_minutes' ||
    rows.length > 1000
  )
    throw new Error('invalid-standards');
  const seen = new Set<string>();
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const activity = row[0]?.trim();
      const maxServiceMinutes = Number(row[1]);
      if (
        !activity ||
        !row[1]?.trim() ||
        !Number.isFinite(maxServiceMinutes) ||
        maxServiceMinutes < 0 ||
        seen.has(activity)
      )
        throw new Error('invalid-standards');
      seen.add(activity);
      return { activity, maxServiceMinutes };
    });
}
export function compareTaskStandards(
  log: EventLog,
  standards: TaskStandard[],
  timePolicy?: TimePolicy,
): StandardPerformance[] {
  const duration = createDurationClock(timePolicy);
  if (
    standards.length > 1000 ||
    standards.some(
      (item) =>
        !item.activity ||
        !Number.isFinite(item.maxServiceMinutes) ||
        item.maxServiceMinutes < 0,
    ) ||
    new Set(standards.map((item) => item.activity)).size !== standards.length
  )
    throw new Error('invalid-standards');
  const limits = new Map(
    standards.map((item) => [item.activity, item.maxServiceMinutes]),
  );
  const groups = new Map<string, StandardPerformance>();
  for (const event of log.events) {
    const limit = limits.get(event.activity);
    if (limit == null || event.startTime == null || event.completeTime < event.startTime)
      continue;
    const resource = event.resource ?? '';
    const key = JSON.stringify([event.activity, resource]);
    const minutes = duration(event.startTime, event.completeTime) / 60000;
    const group = groups.get(key) ?? {
      activity: event.activity,
      resource,
      count: 0,
      meanMinutes: 0,
      maxMinutes: 0,
      limitMinutes: limit,
      exceeded: 0,
    };
    group.count++;
    group.meanMinutes += (minutes - group.meanMinutes) / group.count;
    group.maxMinutes = Math.max(group.maxMinutes, minutes);
    if (minutes > limit) group.exceeded++;
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.exceeded - a.exceeded ||
      b.meanMinutes - a.meanMinutes ||
      a.activity.localeCompare(b.activity),
  );
}
