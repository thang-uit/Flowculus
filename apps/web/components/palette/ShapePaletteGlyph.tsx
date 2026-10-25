import { GatewayMarker } from '@/components/bpmn/GatewayMarker';
import type { SemanticShapeTool } from '@/lib/shape-tools';

/** Miniatures use the same BPMN geometry as the canvas, not generic app icons. */
export function ShapePaletteGlyph({ tool }: Readonly<{ tool: SemanticShapeTool }>) {
  let shape;
  switch (tool) {
    case 'start':
      shape = <circle cx="50" cy="50" r="37" strokeWidth="5" />;
      break;
    case 'end':
      shape = <circle cx="50" cy="50" r="37" strokeWidth="10" />;
      break;
    case 'event':
      shape = (
        <>
          <circle cx="50" cy="50" r="37" strokeWidth="4" />
          <circle cx="50" cy="50" r="29" strokeWidth="4" />
        </>
      );
      break;
    case 'xor':
    case 'and':
    case 'or':
    case 'eventBased':
    case 'complex':
      shape = (
        <>
          <polygon points="50,5 95,50 50,95 5,50" strokeWidth="4" />
          <GatewayMarker kind={tool} />
        </>
      );
      break;
    case 'data':
      shape = (
        <path d="M 18 7 H 63 L 83 27 V 93 H 18 Z M 63 7 V 27 H 83" strokeWidth="4" />
      );
      break;
    case 'annotation':
      shape = <path d="M 35 12 H 20 V 88 H 35" strokeWidth="5" />;
      break;
    default:
      shape = (
        <>
          <rect x="9" y="19" width="82" height="62" rx="8" strokeWidth="4" />
          {tool === 'subprocess' ? (
            <g>
              <rect x="42" y="60" width="16" height="16" rx="1" strokeWidth="2" />
              <path d="M 46 68 H 54 M 50 64 V 72" strokeWidth="2" />
            </g>
          ) : tool === 'rework' ? (
            <text
              x="72"
              y="72"
              fill="currentColor"
              stroke="none"
              fontSize="22"
              fontStyle="italic"
            >
              r
            </text>
          ) : null}
        </>
      );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}
