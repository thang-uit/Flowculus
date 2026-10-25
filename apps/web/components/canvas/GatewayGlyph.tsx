import type { ProcessNode } from '@flowculus/process-model';
import { GatewayMarker } from '@/components/bpmn/GatewayMarker';

export function GatewayGlyph({ kind }: Readonly<{ kind: ProcessNode['gatewayKind'] }>) {
  return <GatewayMarker kind={kind ?? 'xor'} className="flow-shape__glyph" />;
}
