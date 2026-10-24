import type { CalculationQuality } from '@flowculus/analysis-engine';

import type { WorkspaceCopy } from '@/lib/i18n';

export const qualityLabel = (quality: CalculationQuality, copy: WorkspaceCopy): string =>
  quality === 'exact'
    ? copy.exact
    : quality === 'assumption'
      ? copy.assumption
      : copy.simulationRequired;
