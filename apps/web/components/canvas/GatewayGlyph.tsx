import type { ProcessNode } from '@flowculus/process-model';

/** BPMN gateway marker drawn inside the diamond (XOR, AND, OR, complex, event-based). */
export function GatewayGlyph({ kind }: Readonly<{ kind: ProcessNode['gatewayKind'] }>) {
  switch (kind) {
    case 'and':
      return (
        <path
          className="flow-shape__glyph"
          strokeWidth="5"
          d="M 34 50 H 66 M 50 34 V 66"
        />
      );
    case 'or':
      return (
        <circle className="flow-shape__glyph" strokeWidth="4.5" cx="50" cy="50" r="15" />
      );
    case 'complex':
      return (
        <path
          className="flow-shape__glyph"
          strokeWidth="4.5"
          d="M 34 50 H 66 M 50 34 V 66 M 39 39 L 61 61 M 61 39 L 39 61"
        />
      );
    case 'eventBased':
      return (
        <g className="flow-shape__glyph" strokeWidth="2">
          <circle cx="50" cy="50" r="18" />
          <circle cx="50" cy="50" r="14.5" />
          <polygon points="50,41 58.6,47.2 55.3,57.3 44.7,57.3 41.4,47.2" />
        </g>
      );
    default:
      return (
        <path
          className="flow-shape__glyph"
          strokeWidth="5"
          d="M 38 38 L 62 62 M 62 38 L 38 62"
        />
      );
  }
}
