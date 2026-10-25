import { createElement, type ReactNode } from 'react';
import {
  KNOWLEDGE_MATH,
  type KnowledgeFormulaId,
  type MathNode,
} from '@/lib/knowledge/math-expressions';

function renderNode(node: MathNode, key: number): ReactNode {
  if (typeof node === 'string') return node;
  return createElement(node.tag, { key }, node.children.map(renderNode));
}

/** Native MathML supplies fractions, indices and operator limits without a JS typesetter. */
export function KnowledgeMath({
  id,
  label,
}: Readonly<{ id: KnowledgeFormulaId; label: string }>) {
  return (
    <div className="knowledge-math-lines" role="group" aria-label={label}>
      {KNOWLEDGE_MATH[id].map((line, index) =>
        createElement(
          'math',
          {
            key: index,
            xmlns: 'http://www.w3.org/1998/Math/MathML',
            display: 'block',
          },
          renderNode(line, 0),
        ),
      )}
    </div>
  );
}
