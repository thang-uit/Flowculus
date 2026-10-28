import type { PetriNet, Marking } from './types';
import { petriRuntime } from './runtime';
import type { TraceAlignment } from './alignment';
export interface PetriQuality {
  precision: number | null;
  generalization: number | null;
  simplicity: number;
  compatibleCases: number;
  prefixes: number;
  scope: 'compatible-cases-only';
  method: 'prefix-escaping-and-transition-frequency-v1';
}
export function createPetriQuality(net: PetriNet) {
  const runtime = petriRuntime(net);
  const prefixRows = new Map<
    string,
    { weight: number; enabled: Set<string>; observed: Set<string> }
  >();
  const counts = new Map<string, number>();
  let compatibleCases = 0;
  let limited = false;
  const closure = (seeds: Marking[]): Marking[] | null => {
    const queue = [...seeds];
    const seen = new Set(queue.map(runtime.key));
    for (let head = 0; head < queue.length; head++) {
      for (const transition of net.transitions.filter((item) => item.label == null)) {
        const next = runtime.fire(queue[head], transition.id);
        if (!next) continue;
        const key = runtime.key(next);
        if (seen.has(key)) continue;
        if (seen.size >= 500 || Object.values(next).some((count) => count > 8))
          return null;
        seen.add(key);
        queue.push(next);
      }
    }
    return queue;
  };
  const add = (sequence: string[], alignment: TraceAlignment) => {
    if (alignment.status !== 'ready' || alignment.cost) return;
    compatibleCases++;
    for (const move of alignment.moves)
      if (move.transitionId && (move.kind === 'sync' || move.kind === 'silent'))
        counts.set(move.transitionId, (counts.get(move.transitionId) ?? 0) + 1);
    let states = closure([net.initial]);
    for (let index = 0; index <= sequence.length; index++) {
      if (!states) {
        limited = true;
        return;
      }
      const key = JSON.stringify(sequence.slice(0, index));
      const row = prefixRows.get(key) ?? {
        weight: 0,
        enabled: new Set<string>(),
        observed: new Set<string>(),
      };
      row.weight++;
      for (const state of states) {
        for (const transition of net.transitions)
          if (transition.label != null && runtime.enabled(state, transition))
            row.enabled.add(transition.label);
        if (runtime.isFinal(state)) row.enabled.add('#complete');
      }
      row.observed.add(sequence[index] ?? '#complete');
      prefixRows.set(key, row);
      if (index < sequence.length)
        states = closure(
          states.flatMap((state) =>
            net.transitions
              .filter((transition) => transition.label === sequence[index])
              .flatMap((transition) => {
                const next = runtime.fire(state, transition.id);
                return next ? [next] : [];
              }),
          ),
        );
    }
  };
  const finish = (wholeLogComplete: boolean): PetriQuality => {
    let escaping = 0;
    let enabled = 0;
    for (const row of prefixRows.values()) {
      enabled += row.weight * row.enabled.size;
      escaping +=
        row.weight * [...row.enabled].filter((label) => !row.observed.has(label)).length;
    }
    const arcCount = net.transitions.reduce(
      (sum, transition) => sum + transition.inputs.length + transition.outputs.length,
      0,
    );
    const meanDegree = (2 * arcCount) / (net.places.length + net.transitions.length);
    const generalization = compatibleCases
      ? 1 -
        net.transitions.reduce(
          (sum, transition) =>
            sum +
            (counts.get(transition.id) ? 1 / Math.sqrt(counts.get(transition.id)!) : 1),
          0,
        ) /
          net.transitions.length
      : null;
    return {
      precision: wholeLogComplete && !limited && enabled ? 1 - escaping / enabled : null,
      generalization: wholeLogComplete ? generalization : null,
      simplicity: 1 / (1 + Math.max(meanDegree - 2, 0)),
      compatibleCases,
      prefixes: prefixRows.size,
      scope: 'compatible-cases-only',
      method: 'prefix-escaping-and-transition-frequency-v1',
    };
  };
  return { add, finish };
}
