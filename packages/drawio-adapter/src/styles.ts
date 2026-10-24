import type { ProcessEdge, ProcessNode } from '@flowculus/process-model';

const EVENT_BASE =
  'shape=mxgraph.bpmn.event;html=1;verticalLabelPosition=bottom;labelBackgroundColor=#ffffff;verticalAlign=top;align=center;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;';
const GATEWAY_BASE =
  'shape=mxgraph.bpmn.gateway2;html=1;verticalLabelPosition=bottom;labelBackgroundColor=#ffffff;verticalAlign=top;align=center;perimeter=rhombusPerimeter;outlineConnect=0;';

const GATEWAY_STYLES: Record<NonNullable<ProcessNode['gatewayKind']>, string> = {
  xor: `${GATEWAY_BASE}outline=none;symbol=none;gwType=exclusive;`,
  and: `${GATEWAY_BASE}outline=none;symbol=none;gwType=parallel;`,
  or: `${GATEWAY_BASE}outline=none;symbol=none;gwType=inclusive;`,
  complex: `${GATEWAY_BASE}outline=none;symbol=none;gwType=complex;`,
  eventBased: `${GATEWAY_BASE}outline=catching;symbol=multiple;`,
};

/** Native diagrams.net BPMN 2.0 styles for cells created in Flowculus. */
export const drawioStyleForNode = (node: ProcessNode): string => {
  switch (node.kind) {
    case 'start':
      return `${EVENT_BASE}outline=standard;symbol=general;`;
    case 'end':
      return `${EVENT_BASE}outline=end;symbol=general;`;
    case 'event':
      return `${EVENT_BASE}outline=catching;symbol=general;`;
    case 'gateway':
      return GATEWAY_STYLES[node.gatewayKind ?? 'xor'];
    case 'subprocess':
      return 'rounded=1;whiteSpace=wrap;html=1;arcSize=10;container=0;dashed=0;strokeWidth=1;fillColor=#ffffff;strokeColor=#46525e;';
    case 'data':
      return 'shape=note;size=14;whiteSpace=wrap;html=1;labelPosition=center;verticalLabelPosition=bottom;align=center;verticalAlign=top;fillColor=#ffffff;strokeColor=#46525e;';
    case 'annotation':
      return 'shape=partialRectangle;html=1;top=0;bottom=0;right=0;fillColor=none;align=left;spacingLeft=6;whiteSpace=wrap;strokeColor=#46525e;';
    default:
      return 'rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=#ffffff;strokeColor=#46525e;';
  }
};

export const drawioStyleForEdge = (edge: ProcessEdge): string => {
  const base =
    'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;';
  if (edge.kind === 'message')
    return `${base}dashed=1;dashPattern=8 4;endArrow=open;endFill=0;startArrow=oval;startFill=0;`;
  if (edge.kind === 'association')
    return `${base}dashed=1;dashPattern=2 4;endArrow=none;`;
  return `${base}endArrow=block;endFill=1;`;
};
