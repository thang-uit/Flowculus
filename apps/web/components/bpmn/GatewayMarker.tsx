import { createElement } from 'react';
import { BPMN_GATEWAY_MARKERS, type GatewayKind } from '@flowculus/process-model';

/** All gateways use the same normalized SVG marker in palette, editor and lessons. */
export function GatewayMarker({
  kind,
  className,
}: Readonly<{ kind: GatewayKind; className?: string }>) {
  return (
    <g
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-gateway-marker={kind}
    >
      {BPMN_GATEWAY_MARKERS[kind].map(({ tag, ...attributes }, index) =>
        createElement(tag, { key: index, ...attributes }),
      )}
    </g>
  );
}
