export const SEMANTIC_SHAPE_TOOLS = [
  'task',
  'xor',
  'and',
  'or',
  'eventBased',
  'complex',
  'start',
  'end',
  'event',
  'subprocess',
  'data',
  'annotation',
  'rework',
] as const;

export type SemanticShapeTool = (typeof SEMANTIC_SHAPE_TOOLS)[number];
