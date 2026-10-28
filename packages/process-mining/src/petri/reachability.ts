import type { PetriNet, PetriVerification, Marking } from './types';
import { petriRuntime } from './runtime';

/** Exhaustive within explicit bounds. A cut-off never becomes a proof of soundness. */
export function verifyPetri(net: PetriNet, maxStates = 2000): PetriVerification {
  const runtime = petriRuntime(net);
  const report: PetriVerification = {
    status: 'invalid',
    states: 0,
    safe: null,
    bounded: null,
    sound: null,
    deadTransitions: [],
    deadlocks: [],
    improperCompletions: 0,
    counterexample: null,
  };
  if (
    !runtime.valid ||
    !Number.isInteger(maxStates) ||
    maxStates < 1 ||
    maxStates > 10000
  )
    return report;
  const states: Marking[] = [net.initial];
  const known = new Map([[runtime.key(net.initial), 0]]);
  const reverse: number[][] = [[]];
  const parents: Array<{ state: number; transition: string } | null> = [null];
  const fired = new Set<string>();
  let limited = false;
  let unsafe = false;
  const path = (index: number): string[] => {
    const result: string[] = [];
    let link = parents[index];
    while (link) {
      result.push(link.transition);
      link = parents[link.state];
    }
    return result.reverse();
  };
  for (let index = 0; index < states.length; index++) {
    const marking = states[index];
    if (Object.values(marking).some((value) => value > 1)) {
      unsafe = true;
      report.counterexample ??= path(index);
    }
    if (
      Object.entries(net.final).every(([id, count]) => (marking[id] ?? 0) >= count) &&
      !runtime.isFinal(marking)
    ) {
      report.improperCompletions++;
      report.counterexample ??= path(index);
    }
    const enabled = net.transitions.filter((transition) =>
      runtime.enabled(marking, transition),
    );
    if (!enabled.length && !runtime.isFinal(marking) && report.deadlocks.length < 8) {
      report.deadlocks.push({ marking, path: path(index) });
      report.counterexample ??= path(index);
    }
    for (const transition of enabled) {
      fired.add(transition.id);
      const next = runtime.fire(marking, transition.id)!;
      if (Object.values(next).some((count) => count > 32)) {
        limited = true;
        continue;
      }
      if (Object.values(next).some((count) => count > 1)) {
        unsafe = true;
        report.counterexample ??= [...path(index), transition.id];
      }
      const key = runtime.key(next);
      let target = known.get(key);
      if (target == null) {
        if (states.length >= maxStates) {
          limited = true;
          continue;
        }
        target = states.length;
        known.set(key, target);
        states.push(next);
        reverse.push([]);
        parents.push({ state: index, transition: transition.id });
      }
      reverse[target].push(index);
    }
  }
  report.states = states.length;
  report.status = limited ? 'limit' : 'complete';
  report.safe = unsafe ? false : limited ? null : true;
  report.bounded = limited ? null : true;
  if (!limited) {
    report.deadTransitions = net.transitions
      .filter((transition) => !fired.has(transition.id))
      .map((transition) => transition.id);
    const finishing = states.flatMap((marking, index) =>
      runtime.isFinal(marking) ? [index] : [],
    );
    const reachable = new Set(finishing);
    for (let index = 0; index < finishing.length; index++)
      for (const previous of reverse[finishing[index]])
        if (!reachable.has(previous)) {
          reachable.add(previous);
          finishing.push(previous);
        }
    report.sound =
      reachable.size === states.length &&
      !report.improperCompletions &&
      !report.deadTransitions.length;
    if (!report.sound) {
      const failed = states.findIndex((_, index) => !reachable.has(index));
      if (failed >= 0) report.counterexample ??= path(failed);
    }
  } else if (report.deadlocks.length || report.improperCompletions) report.sound = false;
  return report;
}
