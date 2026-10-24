import { FLOW_MARKER_IDS } from '@/lib/canvas-flow';

/** Arrow markers rendered once per canvas and styled through CSS tokens. */
export function FlowMarkers() {
  return (
    <svg className="flow-marker-defs" aria-hidden="true" focusable="false">
      <defs>
        <marker
          id={FLOW_MARKER_IDS.default}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="flow-marker-fill" />
        </marker>
        <marker
          id={FLOW_MARKER_IDS.critical}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            className="flow-marker-fill flow-marker-fill--critical"
          />
        </marker>
        <marker
          id={FLOW_MARKER_IDS.open}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10" className="flow-marker-stroke" />
        </marker>
      </defs>
    </svg>
  );
}
