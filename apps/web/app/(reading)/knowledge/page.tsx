import type { Metadata } from 'next';
import { KnowledgePage } from '@/components/knowledge/KnowledgePage';

export const metadata: Metadata = {
  title: 'Knowledge | Flowculus',
  description:
    'BPMN, cycle-time formulas, rework, queues and process mining — a bilingual illustrated handbook. Sổ tay công thức và kiến thức Flowculus.',
};

export default function Page() {
  return <KnowledgePage />;
}
