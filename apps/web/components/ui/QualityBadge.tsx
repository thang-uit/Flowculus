import type { CalculationQuality } from '@flowculus/analysis-engine';

import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import type { WorkspaceCopy } from '@/lib/i18n';
import { qualityLabel } from '@/lib/quality-label';

export const QUALITY_DOT: Record<CalculationQuality, string> = {
  exact: 'bg-[var(--success)]',
  assumption: 'bg-[var(--accent)]',
  'simulation-required': 'bg-[var(--danger)]',
};

export { qualityLabel };

/**
 * Quality is shown with a dot, a text label and a tooltip, never with colour
 * alone, so it stays readable for colour-blind users and screen readers.
 */
export function QualityBadge({
  quality,
  copy,
  size = 'md',
  className,
}: Readonly<{
  quality: CalculationQuality;
  copy: WorkspaceCopy;
  size?: 'sm' | 'md';
  className?: string;
}>) {
  const label = qualityLabel(quality, copy);
  return (
    <Tooltip content={copy.quality.metricQualityHint}>
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] font-semibold text-[var(--muted-strong)]',
          size === 'sm' ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[10.5px]',
          className,
        )}
        tabIndex={0}
        aria-label={label}
      >
        <span
          className={cn('size-1.5 rounded-full', QUALITY_DOT[quality])}
          aria-hidden="true"
        />
        {label}
      </span>
    </Tooltip>
  );
}
