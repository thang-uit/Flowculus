import type { EdgeAttachmentSide, ProcessNodeKind } from '@flowculus/process-model';

export type TraceShape = 'rectangle' | 'diamond' | 'ellipse';
export interface TraceCandidate {
  id: string;
  shape: TraceShape;
  kind: ProcessNodeKind;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
}
export interface TraceConnector {
  source: string;
  target: string;
  confidence: number;
  kind?: 'sequence' | 'message' | 'association';
  sourceSide?: EdgeAttachmentSide;
  targetSide?: EdgeAttachmentSide;
}
export interface TraceResult {
  width: number;
  height: number;
  candidates: TraceCandidate[];
  connectors: TraceConnector[];
}
