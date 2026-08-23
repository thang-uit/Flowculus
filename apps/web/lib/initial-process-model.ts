import type { ProcessModel } from '@flowculus/process-model';

/**
 * The small teaching example shipped with the workspace. It mirrors the
 * starter draw.io XML and gives the analysis panel a useful first result even
 * while the remote draw.io iframe is still loading.
 */
export const INITIAL_PROCESS_MODEL: ProcessModel = {
  schemaVersion: 1,
  id: 'request-flow',
  name: 'Request handling flow',
  nodes: {
    start: { id: 'start', label: 'Request received', kind: 'start' },
    triage: {
      id: 'triage',
      label: 'Triage request',
      kind: 'task',
      durationMinutes: 18,
      processingMinutes: 6,
      waitingMinutes: 12,
      cost: { resourceRatePerHour: 60, resourcePoolId: 'support', currency: 'USD' },
    },
    review: {
      id: 'review',
      label: 'Review required?',
      kind: 'gateway',
      gatewayKind: 'xor',
    },
    approve: {
      id: 'approve',
      label: 'Approve request',
      kind: 'task',
      durationMinutes: 24,
      processingMinutes: 8,
      waitingMinutes: 16,
      cost: { resourceRatePerHour: 72, resourcePoolId: 'approval', currency: 'USD' },
    },
    auto: {
      id: 'auto',
      label: 'Auto-process',
      kind: 'task',
      durationMinutes: 7,
      processingMinutes: 5,
      waitingMinutes: 2,
      cost: { resourceRatePerHour: 48, resourcePoolId: 'automation', currency: 'USD' },
    },
    finish: { id: 'finish', label: 'Request completed', kind: 'end' },
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
