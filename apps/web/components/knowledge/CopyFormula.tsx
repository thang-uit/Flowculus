'use client';

import { KnowledgeMath } from '@/components/math/KnowledgeMath';
import type { KnowledgeFormulaId } from '@/lib/knowledge/math-expressions';
import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';

import { writeClipboardText } from '@/lib/clipboard-text';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function CopyFormula({
  mathId,
  label,
  expression,
  note,
}: Readonly<{
  mathId: KnowledgeFormulaId;
  label: string;
  expression: string;
  note: string;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <div className="knowledge-formula">
      <div className="knowledge-formula-heading">
        <span>{label}</span>
        <button
          type="button"
          className="focus-ring"
          aria-label={`${copy.copy}: ${label}`}
          onClick={async () =>
            setStatus((await writeClipboardText(expression)) ? 'copied' : 'failed')
          }
        >
          {status === 'copied' ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Copy size={15} aria-hidden="true" />
          )}
          {status === 'copied' ? copy.copied : copy.copy}
        </button>
      </div>
      <KnowledgeMath id={mathId} label={label} />
      {note.split('\n\n').map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <span role="status" className="sr-only">
        {status === 'failed' ? copy.copyFailed : status === 'copied' ? copy.copied : ''}
      </span>
    </div>
  );
}
