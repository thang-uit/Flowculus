import type { GatewayKind, ProcessNodeKind } from '@flowculus/process-model';

export const SEMANTIC_SHAPE_TOOLS = [
  'start',
  'task',
  'xor',
  'and',
  'or',
  'eventBased',
  'complex',
  'end',
  'event',
  'subprocess',
  'data',
  'annotation',
  'rework',
] as const;

export type SemanticShapeTool = (typeof SEMANTIC_SHAPE_TOOLS)[number];
export type ContainerTool = 'pool' | 'lane';
export type PaletteTool = SemanticShapeTool | ContainerTool;

export interface ShapeToolDefinition {
  kind: ProcessNodeKind;
  gatewayKind?: GatewayKind;
  /** Pre-filled task rework probability for the "repeat a block" tool. */
  reworkProbability?: number;
}

export const SHAPE_TOOL_DEFINITIONS: Record<SemanticShapeTool, ShapeToolDefinition> = {
  start: { kind: 'start' },
  task: { kind: 'task' },
  xor: { kind: 'gateway', gatewayKind: 'xor' },
  and: { kind: 'gateway', gatewayKind: 'and' },
  or: { kind: 'gateway', gatewayKind: 'or' },
  eventBased: { kind: 'gateway', gatewayKind: 'eventBased' },
  complex: { kind: 'gateway', gatewayKind: 'complex' },
  end: { kind: 'end' },
  event: { kind: 'event' },
  subprocess: { kind: 'subprocess' },
  data: { kind: 'data' },
  annotation: { kind: 'annotation' },
  rework: { kind: 'task', reworkProbability: 0.1 },
};

/** MIME type used for palette → canvas HTML5 drag and drop. */
export const SHAPE_DRAG_MIME = 'application/x-flowculus-shape';

export const isSemanticShapeTool = (value: string): value is SemanticShapeTool =>
  (SEMANTIC_SHAPE_TOOLS as readonly string[]).includes(value);

export const isPaletteTool = (value: string): value is PaletteTool =>
  value === 'pool' || value === 'lane' || isSemanticShapeTool(value);
