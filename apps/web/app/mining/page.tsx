import type { Metadata } from 'next';
import { FlowculusWorkspace } from '@/components/FlowculusWorkspace';

export const metadata: Metadata = { title: 'Process mining | Flowculus' };

export default function MiningPage() {
  return <FlowculusWorkspace initialMode="mining" />;
}
