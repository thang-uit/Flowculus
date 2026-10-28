import { buildTraces } from '../discover';
import type { EventLog } from '../types';
export interface Footprint {
  activities: string[];
  relations: Array<Array<'→' | '←' | '∥' | '#' | '↻'>>;
}
export function buildFootprint(log: EventLog): Footprint | null {
  const activities = [...new Set(log.events.map((event) => event.activity))].sort();
  if (activities.length > 16) return null;
  const follows = new Set<string>();
  const short = new Set<string>();
  const key = (a: string, b: string) => JSON.stringify([a, b]);
  for (const trace of buildTraces(log))
    for (let index = 0; index < trace.events.length - 1; index++) {
      const a = trace.events[index].activity;
      const b = trace.events[index + 1].activity;
      follows.add(key(a, b));
      if (trace.events[index + 2]?.activity === a && a !== b) {
        short.add(key(a, b));
        short.add(key(b, a));
      }
    }
  return {
    activities,
    relations: activities.map((a) =>
      activities.map((b) =>
        (a === b && follows.has(key(a, b))) || short.has(key(a, b))
          ? '↻'
          : follows.has(key(a, b))
            ? follows.has(key(b, a))
              ? '∥'
              : '→'
            : follows.has(key(b, a))
              ? '←'
              : '#',
      ),
    ),
  };
}
