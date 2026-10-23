import type { ProcessModel } from '@flowculus/process-model';

/**
 * The small teaching example shipped with the workspace, with canvas geometry
 * so the first paint shows a laid-out diagram and a meaningful analysis.
 */
export const INITIAL_PROCESS_MODEL: ProcessModel = {
  schemaVersion: 1,
  id: 'request-flow',
  name: 'Request handling flow',
  nodes: {
    start: {
      id: 'start',
      label: 'Request received',
      kind: 'start',
      bounds: { x: 60, y: 228, width: 44, height: 44 },
    },
    triage: {
      id: 'triage',
      label: 'Triage request',
      kind: 'task',
      durationMinutes: 18,
      processingMinutes: 6,
      waitingMinutes: 12,
      cost: { resourceRatePerHour: 60, resourcePoolId: 'support', currency: 'USD' },
      bounds: { x: 164, y: 208, width: 176, height: 84 },
    },
    review: {
      id: 'review',
      label: 'Review required?',
      kind: 'gateway',
      gatewayKind: 'xor',
      bounds: { x: 404, y: 222, width: 56, height: 56 },
    },
    approve: {
      id: 'approve',
      label: 'Approve request',
      kind: 'task',
      durationMinutes: 24,
      processingMinutes: 8,
      waitingMinutes: 16,
      cost: { resourceRatePerHour: 72, resourcePoolId: 'approval', currency: 'USD' },
      bounds: { x: 540, y: 112, width: 176, height: 84 },
    },
    auto: {
      id: 'auto',
      label: 'Auto-process',
      kind: 'task',
      durationMinutes: 7,
      processingMinutes: 5,
      waitingMinutes: 2,
      cost: { resourceRatePerHour: 48, resourcePoolId: 'automation', currency: 'USD' },
      bounds: { x: 540, y: 304, width: 176, height: 84 },
    },
    finish: {
      id: 'finish',
      label: 'Request completed',
      kind: 'end',
      bounds: { x: 800, y: 228, width: 44, height: 44 },
    },
  },
  edges: {
    'edge-start-triage': { id: 'edge-start-triage', source: 'start', target: 'triage' },
    'edge-triage-review': {
      id: 'edge-triage-review',
      source: 'triage',
      target: 'review',
    },
    'edge-review-approve': {
      id: 'edge-review-approve',
      source: 'review',
      target: 'approve',
      probability: 0.6,
      condition: 'yes',
    },
    'edge-review-auto': {
      id: 'edge-review-auto',
      source: 'review',
      target: 'auto',
      probability: 0.4,
      condition: 'no',
    },
    'edge-approve-finish': {
      id: 'edge-approve-finish',
      source: 'approve',
      target: 'finish',
    },
    'edge-auto-finish': { id: 'edge-auto-finish', source: 'auto', target: 'finish' },
  },
  metadata: { source: 'starter', language: 'en' },
};
