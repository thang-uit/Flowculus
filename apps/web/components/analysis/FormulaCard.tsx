'use client';

import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';

import { formulaToText, type FormulaNode } from '@flowculus/formula-renderer';

import { FormulaMath } from '@/components/FormulaMath';
import { writeClipboardText } from '@/lib/clipboard-text';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** One formula row: symbol, explanation and the rendered AST (or a notice). */
export function FormulaCard({
  title,
  description,
  symbol,
  ast,
  fallback,
  accent = false,
}: Readonly<{
  title: string;
  description: string;
  symbol: string;
  ast?: FormulaNode;
  fallback: string;
  accent?: boolean;
}>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const formulaText = ast ? `${symbol} = ${formulaToText(ast)}` : null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span
          className={
            accent
              ? 'text-[11px] font-bold text-[var(--accent-strong)]'
              : 'text-[11px] font-bold text-[var(--muted-strong)]'
          }
        >
          {title}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted)]">{description}</span>
          {formulaText ? (
            <button
              type="button"
              className="focus-ring inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]"
              aria-label={`${copy.copyFormula}: ${symbol}`}
              title={copy.copyFormula}
              onClick={async () =>
                setCopyState(
                  (await writeClipboardText(formulaText)) ? 'copied' : 'failed',
                )
              }
            >
              {copyState === 'copied' ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Copy size={14} aria-hidden="true" />
              )}
              {copyState === 'copied' ? copy.formulaCopied : copy.copyFormula}
            </button>
          ) : null}
        </span>
      </div>
      <span className="sr-only" role="status">
        {copyState === 'failed'
          ? copy.formulaCopyFailed
          : copyState === 'copied'
            ? copy.formulaCopied
            : ''}
      </span>
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-lg bg-[var(--canvas)] p-2.5 scrollbar-thin">
        <span className="shrink-0 font-mono text-xs font-bold text-[var(--muted-strong)]">
          {symbol} =
        </span>
        {ast ? (
          <FormulaMath formula={ast} />
        ) : (
          <span className="text-xs text-[var(--muted)]">{fallback}</span>
        )}
      </div>
    </div>
  );
}
