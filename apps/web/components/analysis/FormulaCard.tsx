import type { FormulaNode } from '@flowculus/formula-renderer';

import { FormulaMath } from '@/components/FormulaMath';

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
        <span className="text-[10px] text-[var(--muted)]">{description}</span>
      </div>
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
