export type FixtureNodeKind = 'start' | 'task' | 'gateway' | 'end';

export interface FixtureNode {
  id: string;
  label: string;
  detail?: string;
  kind: FixtureNodeKind;
  gatewayKind?: 'xor' | 'and';
  x: number;
  y: number;
  width: number;
  height: number;
  duration?: string;
  state?: 'selected' | 'normal' | 'muted';
}

export const CANVAS_FIXTURE_NODES: FixtureNode[] = [
  {
    id: 'start',
    label: 'Request received',
    kind: 'start',
    x: 62,
    y: 246,
    width: 112,
    height: 64,
    state: 'normal',
  },
  {
    id: 'triage',
    label: 'Triage request',
    detail: 'Classify and route',
    kind: 'task',
    x: 228,
    y: 224,
    width: 166,
    height: 92,
    duration: '18 min',
    state: 'normal',
  },
  {
    id: 'review',
    label: 'Review required?',
    kind: 'gateway',
    gatewayKind: 'xor',
    x: 452,
    y: 230,
    width: 92,
    height: 92,
    state: 'selected',
  },
  {
    id: 'approve',
    label: 'Approve request',
    detail: 'Decision branch',
    kind: 'task',
    x: 620,
    y: 132,
    width: 166,
    height: 92,
    duration: '24 min',
    state: 'normal',
  },
  {
    id: 'auto',
    label: 'Auto-process',
    detail: 'Straight-through path',
    kind: 'task',
    x: 620,
    y: 340,
    width: 166,
    height: 92,
    duration: '7 min',
    state: 'muted',
  },
  {
    id: 'finish',
    label: 'Request completed',
    kind: 'end',
    x: 864,
    y: 246,
    width: 134,
    height: 64,
    state: 'normal',
  },
];
