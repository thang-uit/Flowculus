import type { Marking, PetriNet } from './types';
import { petriRuntime } from './runtime';
export interface AlignmentMove {
  kind: 'sync' | 'model' | 'log' | 'silent';
  activity: string | null;
  transitionId?: string;
}
export type TraceAlignment =
  | { status: 'ready'; cost: number; moves: AlignmentMove[]; examinedStates: number }
  | { status: 'limit'; examinedStates: number };
interface State {
  marking: Marking;
  index: number;
  cost: number;
  previous?: State;
  move?: AlignmentMove;
}
/** Dijkstra alignment: visible model/log moves cost 1, synchronous/silent moves 0. */
export function alignTrace(
  net: PetriNet,
  activities: string[],
  maxStates = 4000,
): TraceAlignment {
  const runtime = petriRuntime(net);
  if (!runtime.valid || activities.length > 500)
    return { status: 'limit', examinedStates: 0 };
  const queue: State[] = [];
  const push = (state: State) => {
    queue.push(state);
    let at = queue.length - 1;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (queue[parent].cost <= state.cost) break;
      queue[at] = queue[parent];
      at = parent;
    }
    queue[at] = state;
  };
  const pop = () => {
    const first = queue[0];
    const tail = queue.pop()!;
    if (queue.length) {
      let at = 0;
      while (at * 2 + 1 < queue.length) {
        let child = at * 2 + 1;
        if (child + 1 < queue.length && queue[child + 1].cost < queue[child].cost)
          child++;
        if (queue[child].cost >= tail.cost) break;
        queue[at] = queue[child];
        at = child;
      }
      queue[at] = tail;
    }
    return first;
  };
  const key = (state: State) => `${state.index}:${runtime.key(state.marking)}`;
  const distances = new Map<string, number>();
  const initial: State = { marking: net.initial, index: 0, cost: 0 };
  push(initial);
  distances.set(key(initial), 0);
  let examinedStates = 0;
  let tokenBound = false;
  const enqueue = (state: State) => {
    if (Object.values(state.marking).some((count) => count > 8)) {
      tokenBound = true;
      return;
    }
    const id = key(state);
    if ((distances.get(id) ?? Infinity) <= state.cost) return;
    distances.set(id, state.cost);
    push(state);
  };
  while (queue.length) {
    const state = pop();
    if (state.cost !== distances.get(key(state))) continue;
    if (++examinedStates > maxStates || distances.size > maxStates * 4)
      return { status: 'limit', examinedStates };
    if (state.index === activities.length && runtime.isFinal(state.marking)) {
      if (tokenBound) return { status: 'limit', examinedStates };
      const moves: AlignmentMove[] = [];
      let cursor: State | undefined = state;
      while (cursor?.move) {
        moves.push(cursor.move);
        cursor = cursor.previous;
      }
      return {
        status: 'ready',
        cost: state.cost,
        moves: moves.reverse(),
        examinedStates,
      };
    }
    if (state.index < activities.length)
      enqueue({
        ...state,
        index: state.index + 1,
        cost: state.cost + 1,
        previous: state,
        move: { kind: 'log', activity: activities[state.index] },
      });
    for (const transition of net.transitions) {
      const marking = runtime.fire(state.marking, transition.id);
      if (!marking) continue;
      if (transition.label != null && transition.label === activities[state.index])
        enqueue({
          marking,
          index: state.index + 1,
          cost: state.cost,
          previous: state,
          move: { kind: 'sync', activity: transition.label, transitionId: transition.id },
        });
      enqueue({
        marking,
        index: state.index,
        cost: state.cost + (transition.label == null ? 0 : 1),
        previous: state,
        move: {
          kind: transition.label == null ? 'silent' : 'model',
          activity: transition.label,
          transitionId: transition.id,
        },
      });
    }
  }
  return { status: 'limit', examinedStates };
}
