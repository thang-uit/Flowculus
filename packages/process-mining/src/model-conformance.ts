import {
  isSequenceFlowEdge,
  type ProcessModel,
  type ProcessNode,
} from '@flowculus/process-model';

import { buildTraces } from './discover';
import type { EventLog } from './types';

const MAX_MODEL_NODES = 120;
const MAX_MODEL_EDGES = 220;
const MAX_MARKINGS = 500;
const MAX_CASES = 2_000;
const MAX_EVENTS = 20_000;

export type ConformanceStatus = 'ready' | 'unmatched' | 'unsupported';
export type ConformanceIssueKind = 'unknown-activity' | 'order' | 'incomplete';

export interface ConformanceExample {
  caseId: string;
  kind: ConformanceIssueKind;
  activity?: string;
  expected: string[];
}

export interface ModelConformance {
  status: ConformanceStatus;
  referenceName: string;
  examinedCases: number;
  compatibleCases: number;
  omittedCases: number;
  examples: ConformanceExample[];
}

interface Marking {
  tokens: Uint8Array;
  started: boolean;
  ended: boolean;
}

const normalize = (label: string) =>
  label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();

const isActivity = (node: ProcessNode) =>
  node.kind === 'task' || node.kind === 'subprocess';

/** Bounded token replay for a BPMN subset: tasks, XOR/AND gateways and silent events. */
export function checkModelConformance(
  log: EventLog,
  model: ProcessModel,
): ModelConformance {
  const base = {
    referenceName: model.name,
    examinedCases: 0,
    compatibleCases: 0,
    omittedCases: 0,
    examples: [] as ConformanceExample[],
  };
  const nodes = Object.values(model.nodes);
  const edges = Object.values(model.edges).filter(isSequenceFlowEdge);
  const unsupported = () => ({ status: 'unsupported' as const, ...base });
  if (
    nodes.length > MAX_MODEL_NODES ||
    edges.length > MAX_MODEL_EDGES ||
    nodes.filter((node) => node.kind === 'start').length !== 1 ||
    !nodes.some((node) => node.kind === 'end') ||
    nodes.some(
      (node) =>
        node.kind === 'unknown' ||
        node.metadata?.['flowculus-unsupported-shape'] != null ||
        (node.kind === 'gateway' &&
          node.gatewayKind !== 'xor' &&
          node.gatewayKind !== 'and'),
    )
  )
    return unsupported();

  const incoming = new Map(nodes.map((node) => [node.id, [] as number[]]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as number[]]));
  edges.forEach((edge, index) => {
    incoming.get(edge.target)?.push(index);
    outgoing.get(edge.source)?.push(index);
  });
  if (
    edges.some((edge) => !model.nodes[edge.source] || !model.nodes[edge.target]) ||
    nodes.some((node) => {
      const into = incoming.get(node.id)?.length ?? 0;
      const out = outgoing.get(node.id)?.length ?? 0;
      if (node.kind === 'start') return into !== 0 || out !== 1;
      if (node.kind === 'end') return out !== 0 || into === 0;
      if (isActivity(node) || node.kind === 'event') return into === 0 || out !== 1;
      if (node.kind === 'gateway')
        return into === 0 || out === 0 || (into > 1 && out > 1);
      return false;
    })
  )
    return unsupported();

  const modelActivities = nodes.filter(isActivity);
  const knownLabels = new Set(modelActivities.map((node) => normalize(node.label)));
  const logLabels = new Set(log.events.map((event) => normalize(event.activity)));
  if (![...logLabels].some((label) => knownLabels.has(label))) {
    return { status: 'unmatched', ...base };
  }

  const keyOf = (marking: Marking) =>
    `${Number(marking.started)}${Number(marking.ended)}:${marking.tokens.join(',')}`;
  const fire = (marking: Marking, node: ProcessNode): Marking[] => {
    const inputs = incoming.get(node.id) ?? [];
    const outputs = outgoing.get(node.id) ?? [];
    if (node.kind === 'start') {
      if (marking.started) return [];
      const tokens = marking.tokens.slice();
      tokens[outputs[0]] += 1;
      return [{ tokens, started: true, ended: false }];
    }
    const inputChoices =
      node.kind === 'gateway' && node.gatewayKind === 'and' && inputs.length > 1
        ? inputs.every((index) => marking.tokens[index] > 0)
          ? [inputs]
          : []
        : inputs.filter((index) => marking.tokens[index] > 0).map((index) => [index]);
    const outputChoices =
      node.kind === 'end'
        ? [[]]
        : node.kind === 'gateway' && node.gatewayKind === 'and' && outputs.length > 1
          ? [outputs]
          : outputs.map((index) => [index]);
    const result: Marking[] = [];
    inputChoices.forEach((consume) =>
      outputChoices.forEach((produce) => {
        const tokens = marking.tokens.slice();
        consume.forEach((index) => (tokens[index] -= 1));
        produce.forEach((index) => (tokens[index] += 1));
        if (tokens.some((count) => count > 2)) return;
        result.push({
          tokens,
          started: marking.started,
          ended: marking.ended || node.kind === 'end',
        });
      }),
    );
    return result;
  };
  const silent = nodes.filter(
    (node) => !isActivity(node) && node.kind !== 'data' && node.kind !== 'annotation',
  );
  const closure = (seeds: Marking[]): Marking[] | null => {
    const found = new Map(seeds.map((marking) => [keyOf(marking), marking]));
    const queue = [...found.values()];
    for (let head = 0; head < queue.length; head += 1) {
      const marking = queue[head];
      silent.forEach((node) =>
        fire(marking, node).forEach((next) => {
          const key = keyOf(next);
          if (found.has(key)) return;
          found.set(key, next);
          queue.push(next);
        }),
      );
      if (found.size > MAX_MARKINGS) return null;
    }
    return queue;
  };
  const initial = closure([
    { tokens: new Uint8Array(edges.length), started: false, ended: false },
  ]);
  if (!initial) return unsupported();
  const expectedAt = (states: Marking[]) =>
    [
      ...new Set(
        states.flatMap((state) =>
          modelActivities
            .filter((node) => fire(state, node).length > 0)
            .map((node) => node.label),
        ),
      ),
    ].sort();

  const traces = buildTraces(log);
  let examinedEvents = 0;
  for (const trace of traces) {
    if (
      base.examinedCases >= MAX_CASES ||
      examinedEvents + trace.events.length > MAX_EVENTS
    )
      break;
    base.examinedCases += 1;
    examinedEvents += trace.events.length;
    let states = initial;
    let issue: ConformanceExample | null = null;
    for (const event of trace.events) {
      const matchingNodes = modelActivities.filter(
        (node) => normalize(node.label) === normalize(event.activity),
      );
      const next = states.flatMap((state) =>
        matchingNodes.flatMap((node) => fire(state, node)),
      );
      if (!next.length) {
        issue = {
          caseId: trace.caseId,
          kind: matchingNodes.length ? 'order' : 'unknown-activity',
          activity: event.activity,
          expected: expectedAt(states).slice(0, 8),
        };
        break;
      }
      const expanded = closure(next);
      if (!expanded) return unsupported();
      states = expanded;
    }
    if (
      !issue &&
      !states.some((state) => state.ended && state.tokens.every((count) => count === 0))
    ) {
      issue = {
        caseId: trace.caseId,
        kind: 'incomplete',
        expected: expectedAt(states).slice(0, 8),
      };
    }
    if (!issue) base.compatibleCases += 1;
    else if (base.examples.length < 8) base.examples.push(issue);
  }
  base.omittedCases = traces.length - base.examinedCases;
  return { status: 'ready', ...base };
}
