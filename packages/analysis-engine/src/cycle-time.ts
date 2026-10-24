import type { ProcessNode } from '@flowculus/process-model';

/**
 * The single cycle-time contract used by the engine, formulas, reports and
 * exports.
 *
 * - `durationMinutes` (D) is the observed elapsed cycle time per execution.
 *   When present it is authoritative: source `observed`.
 * - Otherwise CT is derived as `processingMinutes + waitingMinutes`
 *   (T + Wq): source `derived`. A missing waiting time counts as 0.
 * - With neither, CT is 0 and the source is `missing`.
 *
 * Processing time T feeds TCT, cost, capacity and CPM:
 * - explicit T is used as is;
 * - with D and Wq but no T, T = D − Wq (`derived`);
 * - with only D, D is used as an estimate of T (`cycle-time-estimate`),
 *   which downgrades TCT/CTE/cost/CPM to `assumption`;
 * - with no D and no T, T is `missing` (0).
 *
 * When D, T and Wq are all present, T + Wq > D is rejected by validation and
 * T + Wq < D leaves an `unexplainedWaitMinutes` gap that is reported.
 */
export type CycleTimeSource = 'observed' | 'derived' | 'missing';
export type ProcessingTimeSource =
  'explicit' | 'derived' | 'cycle-time-estimate' | 'missing';

export interface ResolvedActivityTime {
  /** Elapsed time of one execution, before rework repetition. */
  cycleTimeMinutes: number;
  cycleTimeSource: CycleTimeSource;
  processingMinutes: number;
  processingSource: ProcessingTimeSource;
  /** Waiting time that applies: explicit, D − T, or null when unknown. */
  waitingMinutes: number | null;
  /** D − (T + Wq) when all three are known and the parts fall short of D. */
  unexplainedWaitMinutes: number;
}

const TOLERANCE = 1e-9;

export const resolveActivityTime = (
  node: Pick<ProcessNode, 'durationMinutes' | 'processingMinutes' | 'waitingMinutes'>,
): ResolvedActivityTime => {
  const observed = node.durationMinutes;
  const explicitProcessing = node.processingMinutes;
  const explicitWaiting = node.waitingMinutes;

  if (observed != null) {
    let processingMinutes: number;
    let processingSource: ProcessingTimeSource;
    if (explicitProcessing != null) {
      processingMinutes = explicitProcessing;
      processingSource = 'explicit';
    } else if (explicitWaiting != null) {
      processingMinutes = Math.max(0, observed - explicitWaiting);
      processingSource = 'derived';
    } else {
      processingMinutes = observed;
      processingSource = 'cycle-time-estimate';
    }
    const waitingMinutes =
      explicitWaiting ??
      (explicitProcessing != null ? Math.max(0, observed - explicitProcessing) : null);
    const unexplained =
      explicitProcessing != null && explicitWaiting != null
        ? observed - explicitProcessing - explicitWaiting
        : 0;
    return {
      cycleTimeMinutes: observed,
      cycleTimeSource: 'observed',
      processingMinutes,
      processingSource,
      waitingMinutes,
      unexplainedWaitMinutes: unexplained > TOLERANCE ? unexplained : 0,
    };
  }

  if (explicitProcessing != null || explicitWaiting != null) {
    return {
      cycleTimeMinutes: (explicitProcessing ?? 0) + (explicitWaiting ?? 0),
      cycleTimeSource: 'derived',
      processingMinutes: explicitProcessing ?? 0,
      processingSource: explicitProcessing != null ? 'explicit' : 'missing',
      waitingMinutes: explicitWaiting ?? 0,
      unexplainedWaitMinutes: 0,
    };
  }

  return {
    cycleTimeMinutes: 0,
    cycleTimeSource: 'missing',
    processingMinutes: 0,
    processingSource: 'missing',
    waitingMinutes: null,
    unexplainedWaitMinutes: 0,
  };
};

export const hasAnyTime = (
  node: Pick<ProcessNode, 'durationMinutes' | 'processingMinutes' | 'waitingMinutes'>,
): boolean =>
  node.durationMinutes != null ||
  node.processingMinutes != null ||
  node.waitingMinutes != null;

export type CycleTimeEfficiencyResult =
  | { status: 'ready'; ratio: number }
  | { status: 'undefined'; reason: 'zero-cycle-time' | 'invalid-input' }
  | { status: 'out-of-range'; ratio: number };

/**
 * CTE = TCT / CT as a ratio in [0, 1]. Presentation layers multiply by 100;
 * nothing in the domain does. CT = 0 leaves CTE undefined, and TCT > CT is a
 * data inconsistency rather than an efficiency above 100 %.
 */
export const computeCycleTimeEfficiency = (
  theoreticalCycleTimeMinutes: number | null,
  cycleTimeMinutes: number | null,
): CycleTimeEfficiencyResult => {
  if (
    theoreticalCycleTimeMinutes == null ||
    cycleTimeMinutes == null ||
    !Number.isFinite(theoreticalCycleTimeMinutes) ||
    !Number.isFinite(cycleTimeMinutes) ||
    theoreticalCycleTimeMinutes < 0 ||
    cycleTimeMinutes < 0
  ) {
    return { status: 'undefined', reason: 'invalid-input' };
  }
  if (cycleTimeMinutes <= TOLERANCE)
    return { status: 'undefined', reason: 'zero-cycle-time' };
  const ratio = theoreticalCycleTimeMinutes / cycleTimeMinutes;
  if (ratio > 1 + 1e-9) return { status: 'out-of-range', ratio };
  return { status: 'ready', ratio: Math.min(1, ratio) };
};

export interface ActivityTimeTerm {
  symbol: 'CT' | 'T' | 'Wq';
  minutes: number;
}

/**
 * The time chips shown on a task (canvas, SVG, report) so every surface tells
 * the same story: an observed cycle time is labelled CT, a derived one is
 * shown as its parts T and Wq, and an estimated T is never displayed as T.
 */
export const activityTimeTerms = (
  node: Pick<ProcessNode, 'durationMinutes' | 'processingMinutes' | 'waitingMinutes'>,
): ActivityTimeTerm[] => {
  const time = resolveActivityTime(node);
  if (time.cycleTimeSource === 'missing') return [];
  const terms: ActivityTimeTerm[] = [];
  if (time.cycleTimeSource === 'observed') {
    terms.push({ symbol: 'CT', minutes: time.cycleTimeMinutes });
  }
  if (time.processingSource === 'explicit' || time.processingSource === 'derived') {
    terms.push({ symbol: 'T', minutes: time.processingMinutes });
  }
  if (
    time.waitingMinutes != null &&
    (node.waitingMinutes != null || time.waitingMinutes > 0)
  ) {
    terms.push({ symbol: 'Wq', minutes: time.waitingMinutes });
  }
  return terms;
};
