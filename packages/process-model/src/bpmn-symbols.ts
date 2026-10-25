import type { GatewayKind } from './gateway-kind';

export type BpmnMarkerElement =
  | { tag: 'path'; d: string; strokeWidth: number }
  | { tag: 'circle'; cx: number; cy: number; r: number; strokeWidth: number }
  | { tag: 'polygon'; points: string; strokeWidth: number };

/** Normalized 100×100 geometry: BPMN 2.0.2 §10.6, shared by UI and vector exports. */
export const BPMN_GATEWAY_MARKERS: Record<GatewayKind, readonly BpmnMarkerElement[]> = {
  xor: [{ tag: 'path', d: 'M 38 38 L 62 62 M 62 38 L 38 62', strokeWidth: 5 }],
  and: [{ tag: 'path', d: 'M 34 50 H 66 M 50 34 V 66', strokeWidth: 5 }],
  or: [{ tag: 'circle', cx: 50, cy: 50, r: 15, strokeWidth: 4.5 }],
  complex: [
    {
      tag: 'path',
      d: 'M 34 50 H 66 M 50 34 V 66 M 39 39 L 61 61 M 61 39 L 39 61',
      strokeWidth: 4.5,
    },
  ],
  eventBased: [
    { tag: 'circle', cx: 50, cy: 50, r: 19, strokeWidth: 2 },
    { tag: 'circle', cx: 50, cy: 50, r: 14.5, strokeWidth: 2 },
    {
      tag: 'polygon',
      points: '50,41 58.6,47.2 55.3,57.3 44.7,57.3 41.4,47.2',
      strokeWidth: 2,
    },
  ],
};
