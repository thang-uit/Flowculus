import type { Marking, PetriNet, PetriTransition } from './types';
export function petriRuntime(net: PetriNet) {
  const ids = net.places.map((place) => place.id);
  const transitions = new Map(
    net.transitions.map((transition) => [transition.id, transition]),
  );
  const valid =
    ids.length > 0 &&
    Object.values(net.initial).some((count) => count > 0) &&
    Object.values(net.final).some((count) => count > 0) &&
    ids.length <= 600 &&
    new Set(ids).size === ids.length &&
    transitions.size === net.transitions.length &&
    net.transitions.length <= 1200 &&
    net.transitions.every(
      (transition) =>
        !ids.includes(transition.id) &&
        transition.inputs.length > 0 &&
        transition.outputs.length > 0 &&
        [...transition.inputs, ...transition.outputs].every((id) => ids.includes(id)) &&
        new Set(transition.inputs).size === transition.inputs.length &&
        new Set(transition.outputs).size === transition.outputs.length,
    ) &&
    [net.initial, net.final].every((marking) =>
      Object.entries(marking).every(
        ([id, count]) => ids.includes(id) && Number.isSafeInteger(count) && count >= 0,
      ),
    );
  const key = (marking: Marking) => ids.map((id) => marking[id] ?? 0).join(',');
  const enabled = (marking: Marking, transition: PetriTransition) =>
    transition.inputs.every((id) => (marking[id] ?? 0) > 0);
  const fire = (marking: Marking, id: string): Marking | null => {
    const transition = transitions.get(id);
    if (!transition || !enabled(marking, transition)) return null;
    const next = { ...marking };
    transition.inputs.forEach((place) => (next[place] = (next[place] ?? 0) - 1));
    transition.outputs.forEach((place) => (next[place] = (next[place] ?? 0) + 1));
    return next;
  };
  return {
    valid,
    key,
    enabled,
    fire,
    isFinal: (marking: Marking) => key(marking) === key(net.final),
  };
}
