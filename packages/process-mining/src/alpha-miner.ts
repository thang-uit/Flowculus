import { buildTraces } from './discover';
import type { EventLog } from './types';

const MAX_ACTIVITIES = 16;
const MAX_CANDIDATES = 2_000;
const MAX_REPLAY_EVENTS = 100_000;

export interface AlphaPlace {
  inputs: string[];
  outputs: string[];
}

export interface AlphaReplay {
  examinedCases: number;
  compatibleCases: number;
  omittedCases: number;
  examples: string[];
}

export interface AlphaMiningResult {
  status: 'ready' | 'too-complex';
  activityCount: number;
  causalCount: number;
  parallelCount: number;
  places: AlphaPlace[];
  startActivities: string[];
  endActivities: string[];
  selfLoops: string[];
  shortLoops: string[];
  replay: AlphaReplay | null;
}

const pairKey = (left: string, right: string): string => `${left}\u0000${right}`;
const isSubset = (left: string[], right: string[]): boolean =>
  left.every((value) => right.includes(value));

/** Classic Alpha Miner on the observed log, with explicit short-loop limitations. */
export function mineAlpha(log: EventLog): AlphaMiningResult {
  const traces = buildTraces(log);
  const activities = [...new Set(log.events.map((event) => event.activity))].sort();
  const follows = new Set<string>();
  const shortLoopKeys = new Set<string>();
  const starts = new Set<string>();
  const ends = new Set<string>();
  traces.forEach((trace) => {
    const names = trace.events.map((event) => event.activity);
    if (names[0]) starts.add(names[0]);
    if (names.at(-1)) ends.add(names.at(-1) as string);
    names.forEach((name, index) => {
      const next = names[index + 1];
      if (next) follows.add(pairKey(name, next));
      const after = names[index + 2];
      if (next && after === name && next !== name) {
        shortLoopKeys.add([name, next].sort().join('\u0000'));
      }
    });
  });
  const base = {
    activityCount: activities.length,
    causalCount: 0,
    parallelCount: 0,
    places: [] as AlphaPlace[],
    startActivities: [...starts].sort(),
    endActivities: [...ends].sort(),
    selfLoops: activities.filter((name) => follows.has(pairKey(name, name))),
    shortLoops: [...shortLoopKeys].map((key) => key.replace('\u0000', ' ↔ ')),
    replay: null as AlphaReplay | null,
  };
  if (activities.length > MAX_ACTIVITIES) return { status: 'too-complex', ...base };

  const causal = (left: string, right: string): boolean =>
    left !== right &&
    follows.has(pairKey(left, right)) &&
    !follows.has(pairKey(right, left));
  const unrelated = (left: string, right: string): boolean =>
    left !== right &&
    !follows.has(pairKey(left, right)) &&
    !follows.has(pairKey(right, left));
  const places: AlphaPlace[] = [];
  activities.forEach((left) =>
    activities.forEach((right) => {
      if (causal(left, right)) places.push({ inputs: [left], outputs: [right] });
      if (
        left < right &&
        follows.has(pairKey(left, right)) &&
        follows.has(pairKey(right, left)) &&
        !shortLoopKeys.has(pairKey(left, right))
      ) {
        base.parallelCount += 1;
      }
    }),
  );
  base.causalCount = places.length;
  const candidateKey = (place: AlphaPlace) =>
    `${place.inputs.join('\u0001')}\u0000${place.outputs.join('\u0001')}`;
  const candidates = new Map(places.map((place) => [candidateKey(place), place]));
  const valid = ({ inputs, outputs }: AlphaPlace) =>
    inputs.every((left) => outputs.every((right) => causal(left, right))) &&
    inputs.every((left, index) =>
      inputs.slice(index + 1).every((right) => unrelated(left, right)),
    ) &&
    outputs.every((left, index) =>
      outputs.slice(index + 1).every((right) => unrelated(left, right)),
    );
  let changed = true;
  while (changed && candidates.size <= MAX_CANDIDATES) {
    changed = false;
    const snapshot = [...candidates.values()];
    for (let left = 0; left < snapshot.length; left += 1) {
      for (let right = left + 1; right < snapshot.length; right += 1) {
        const merged: AlphaPlace = {
          inputs: [
            ...new Set([...snapshot[left].inputs, ...snapshot[right].inputs]),
          ].sort(),
          outputs: [
            ...new Set([...snapshot[left].outputs, ...snapshot[right].outputs]),
          ].sort(),
        };
        const key = candidateKey(merged);
        if (!candidates.has(key) && valid(merged)) {
          candidates.set(key, merged);
          changed = true;
        }
        if (candidates.size > MAX_CANDIDATES) break;
      }
      if (candidates.size > MAX_CANDIDATES) break;
    }
  }
  if (candidates.size > MAX_CANDIDATES) return { status: 'too-complex', ...base };
  const maximal = [...candidates.values()].filter(
    (place, index, all) =>
      !all.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          isSubset(place.inputs, other.inputs) &&
          isSubset(place.outputs, other.outputs) &&
          (place.inputs.length < other.inputs.length ||
            place.outputs.length < other.outputs.length),
      ),
  );
  maximal.sort((left, right) => candidateKey(left).localeCompare(candidateKey(right)));

  let examinedCases = 0;
  let compatibleCases = 0;
  let examinedEvents = 0;
  const examples: string[] = [];
  if (!base.selfLoops.length && !base.shortLoops.length) {
    for (const trace of traces) {
      if (examinedEvents + trace.events.length > MAX_REPLAY_EVENTS) break;
      examinedEvents += trace.events.length;
      examinedCases += 1;
      const marking = new Array(maximal.length).fill(0) as number[];
      let startToken = 1;
      let endToken = 0;
      let compatible = true;
      for (const event of trace.events) {
        const name = event.activity;
        const inputs = maximal.flatMap((place, index) =>
          place.outputs.includes(name) ? [index] : [],
        );
        if (
          (starts.has(name) && !startToken) ||
          inputs.some((index) => !marking[index])
        ) {
          compatible = false;
          break;
        }
        if (starts.has(name)) startToken -= 1;
        inputs.forEach((index) => (marking[index] -= 1));
        maximal.forEach((place, index) => {
          if (place.inputs.includes(name)) marking[index] += 1;
        });
        if (ends.has(name)) endToken += 1;
      }
      if (compatible && endToken === 1 && marking.every((tokens) => tokens === 0)) {
        compatibleCases += 1;
      } else if (examples.length < 8) {
        examples.push(trace.caseId);
      }
    }
  }
  return {
    status: 'ready',
    ...base,
    places: maximal,
    replay:
      base.selfLoops.length || base.shortLoops.length
        ? null
        : {
            examinedCases,
            compatibleCases,
            omittedCases: traces.length - examinedCases,
            examples,
          },
  };
}
