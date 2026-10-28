import { createPetriQuality, type PetriQuality } from './petri/quality';
import { bpmnToPetri } from './petri/from-bpmn';
import { alignTrace, type AlignmentMove } from './petri/alignment';
import { buildTraces } from './discover';
import type { EventLog } from './types';
import type { ProcessModel } from '@flowculus/process-model';
export interface ConformanceOptions {
  poolId?: string;
  activityMapping?: Record<string, string>;
}
export interface AlignmentConformance {
  status: 'ready' | 'limit' | 'unsupported';
  method: 'alignment-unit-cost-v1';
  examinedCases: number;
  omittedCases: number;
  fitness: number | null;
  compatibleCases: number;
  quality?: PetriQuality;
  examples: Array<{ caseId: string; cost: number; moves: AlignmentMove[] }>;
}
export function alignmentConformance(
  log: EventLog,
  model: ProcessModel,
  options: ConformanceOptions = {},
): AlignmentConformance {
  const traces = buildTraces(log);
  const result: AlignmentConformance = {
    status: 'unsupported',
    method: 'alignment-unit-cost-v1',
    examinedCases: 0,
    omittedCases: traces.length,
    fitness: null,
    compatibleCases: 0,
    examples: [],
  };
  const converted = bpmnToPetri(model, options.poolId);
  if (converted.status !== 'ready') return result;
  const net = {
    ...converted.net,
    transitions: converted.net.transitions.map((transition) => ({
      ...transition,
      label:
        transition.label == null
          ? null
          : `task:${transition.sourceId ?? transition.label}`,
    })),
  };
  const fallback = new Map<string, string[]>();
  for (const transition of converted.net.transitions)
    if (transition.label && transition.sourceId) {
      const ids = fallback.get(transition.label) ?? [];
      ids.push(transition.sourceId);
      fallback.set(transition.label, ids);
    }
  const labels = new Set(log.events.map((event) => event.activity));
  // Imported labels are arbitrary strings, including object prototype keys.
  // Separate namespaces also prevent an unmapped log label matching a task ID.
  const mapping = new Map<string, string>();
  for (const activity of labels) {
    const explicit = Object.prototype.hasOwnProperty.call(
      options.activityMapping ?? {},
      activity,
    );
    const id = explicit ? options.activityMapping?.[activity] : undefined;
    if (explicit && !id) {
      mapping.set(activity, `log:${activity}`);
      continue;
    }
    if (id) {
      if (!net.transitions.some((transition) => transition.label === `task:${id}`))
        return result;
      mapping.set(activity, `task:${id}`);
    } else {
      const matches = fallback.get(activity) ?? [];
      if (matches.length > 1) return result;
      mapping.set(activity, matches[0] ? `task:${matches[0]}` : `log:${activity}`);
    }
  }
  const quality = createPetriQuality(net);
  const baseline = alignTrace(net, []);
  if (baseline.status !== 'ready') return { ...result, status: 'limit' };
  let cost = 0;
  let denominator = 0;
  let events = 0;
  result.status = 'ready';
  const variants = new Map<string, ReturnType<typeof alignTrace>>();
  for (const trace of traces) {
    if (result.examinedCases >= 200 || events + trace.events.length > 10000) {
      result.status = 'limit';
      break;
    }
    events += trace.events.length;
    const sequence = trace.events.map((event) => mapping.get(event.activity)!);
    const key = JSON.stringify(sequence);
    let alignment = variants.get(key);
    if (!alignment) {
      alignment = alignTrace(net, sequence);
      variants.set(key, alignment);
    }
    if (alignment.status !== 'ready') {
      result.status = 'limit';
      break;
    }
    quality.add(sequence, alignment);
    result.examinedCases++;
    cost += alignment.cost;
    denominator += sequence.length + baseline.cost;
    if (!alignment.cost) result.compatibleCases++;
    if (alignment.cost && result.examples.length < 8)
      result.examples.push({
        caseId: trace.caseId,
        cost: alignment.cost,
        moves: alignment.moves
          .filter((move) => move.kind !== 'silent')
          .map((move) => ({
            ...move,
            activity: move.transitionId
              ? (model.nodes[
                  net.transitions.find(
                    (transition) => transition.id === move.transitionId,
                  )?.sourceId ?? ''
                ]?.label ?? move.activity)
              : (trace.events.find(
                  (event) => mapping.get(event.activity) === move.activity,
                )?.activity ?? move.activity),
          })),
      });
  }
  result.omittedCases = traces.length - result.examinedCases;
  result.fitness =
    result.status === 'ready' && denominator > 0
      ? Math.max(0, 1 - cost / denominator)
      : null;
  result.quality = quality.finish(result.status === 'ready');
  return result;
}
