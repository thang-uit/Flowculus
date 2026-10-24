'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { ProcessNode } from '@flowculus/process-model';

import { replaceNode } from '@/lib/model-editing';
import { useWorkspaceStore } from '@/lib/workspace-store';

function LabelInput({
  node,
  onDone,
}: Readonly<{ node: ProcessNode; onDone: () => void }>) {
  const [draft, setDraft] = useState(node.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const label = draft.trim();
    if (label && label !== node.label) {
      const state = useWorkspaceStore.getState();
      const current = state.processModel.nodes[node.id];
      if (current)
        state.commitModel(replaceNode(state.processModel, { ...current, label }));
    }
    onDone();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') commit();
    if (event.key === 'Escape') onDone();
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      aria-label={node.label}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="flow-label-input nodrag nopan"
    />
  );
}

/** Inline rename: Enter commits, Escape cancels, blur commits. */
export function EditableLabel({
  node,
  editing,
  onDone,
  className,
}: Readonly<{
  node: ProcessNode;
  editing: boolean;
  onDone: () => void;
  className: string;
}>) {
  return editing ? (
    <LabelInput node={node} onDone={onDone} />
  ) : (
    <span className={className}>{node.label}</span>
  );
}
