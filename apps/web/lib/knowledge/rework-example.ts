import { analyzeProcess } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

export type ReworkPolicy = 'once' | 'unlimited';

/** Isolated educational fixture. Calculation remains owned by analysis-engine. */
export function analyzeReworkExample(
  duration: number,
  probability: number,
  policy: ReworkPolicy,
) {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability >= 1
  )
    throw new RangeError('Invalid rework example inputs.');
  const model: ProcessModel = {
    schemaVersion: 1,
    id: 'knowledge-rework',
    name: 'Rework teaching example',
    nodes: {
      s: { id: 's', kind: 'start', label: 'Start' },
      a: {
        id: 'a',
        kind: 'task',
        label: 'A',
        durationMinutes: duration,
        processingMinutes: duration,
        ...(policy === 'unlimited' ? { reworkProbability: probability } : {}),
      },
      e: { id: 'e', kind: 'end', label: 'End' },
    },
    edges: { sa: { id: 'sa', source: 's', target: 'a' } },
  };
  if (policy === 'once') {
    model.nodes.x = { id: 'x', kind: 'gateway', gatewayKind: 'xor', label: 'Redo?' };
    model.nodes.redo = {
      id: 'redo',
      kind: 'task',
      label: 'Redo A',
      durationMinutes: duration,
      processingMinutes: duration,
    };
    model.nodes.join = {
      id: 'join',
      kind: 'gateway',
      gatewayKind: 'xor',
      label: 'Merge',
    };
    for (const edge of [
      { id: 'ax', source: 'a', target: 'x' },
      { id: 'xr', source: 'x', target: 'redo', probability },
      { id: 'xj', source: 'x', target: 'join', probability: 1 - probability },
      { id: 'rj', source: 'redo', target: 'join' },
      { id: 'je', source: 'join', target: 'e' },
    ])
      model.edges[edge.id] = edge;
  } else model.edges.ae = { id: 'ae', source: 'a', target: 'e' };
  return analyzeProcess(model);
}
