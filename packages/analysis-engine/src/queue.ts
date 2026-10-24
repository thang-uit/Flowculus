import type { Diagnostic } from '@flowculus/validation';

export interface QueueAnalysisInput {
  arrivalRatePerHour: number;
  serviceRatePerServerPerHour: number;
  servers?: number;
}

export interface QueueAnalysisReport {
  status: 'ready' | 'invalid' | 'unstable';
  model: 'M/M/1' | 'M/M/c';
  utilization: number | null;
  averageQueueLength: number | null;
  averageWaitingHours: number | null;
  averageSystemHours: number | null;
  averageSystemCount: number | null;
  /** Mathematical notation only; it is language-neutral. */
  formula: string;
  issues: Diagnostic[];
}

const factorial = (value: number): number => {
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
};

const formatNumber = (value: number): string => Number(value.toFixed(4)).toString();

/**
 * M/M/1 and M/M/c (Erlang C) steady state: utilisation ρ = λ / (cμ), queue
 * length Lq, waiting time Wq = Lq / λ and time in system W = Wq + 1/μ.
 */
export const analyzeQueue = (input: QueueAnalysisInput): QueueAnalysisReport => {
  const servers = input.servers ?? 1;
  const model = servers === 1 ? 'M/M/1' : 'M/M/c';
  if (
    !Number.isFinite(input.arrivalRatePerHour) ||
    !Number.isFinite(input.serviceRatePerServerPerHour) ||
    input.arrivalRatePerHour < 0 ||
    input.serviceRatePerServerPerHour <= 0 ||
    !Number.isInteger(servers) ||
    servers < 1
  ) {
    return {
      status: 'invalid',
      model,
      utilization: null,
      averageQueueLength: null,
      averageWaitingHours: null,
      averageSystemHours: null,
      averageSystemCount: null,
      formula: '',
      issues: [
        {
          code: 'queue-invalid-input',
          severity: 'error',
          impact: 'none',
          scope: 'queue',
        },
      ],
    };
  }

  const utilization =
    input.arrivalRatePerHour / (servers * input.serviceRatePerServerPerHour);
  if (utilization >= 1) {
    return {
      status: 'unstable',
      model,
      utilization,
      averageQueueLength: null,
      averageWaitingHours: null,
      averageSystemHours: null,
      averageSystemCount: null,
      formula: `ρ = λ / (${servers} × μ) = ${formatNumber(utilization)}`,
      issues: [
        {
          code: 'queue-unstable',
          severity: 'warning',
          impact: 'none',
          scope: 'queue',
          params: { utilization: Number(utilization.toFixed(4)) },
        },
      ],
    };
  }

  let averageQueueLength: number;
  if (servers === 1) {
    averageQueueLength = (utilization * utilization) / (1 - utilization);
  } else {
    const offeredLoad = input.arrivalRatePerHour / input.serviceRatePerServerPerHour;
    let denominator = 0;
    for (let index = 0; index < servers; index += 1) {
      denominator += offeredLoad ** index / factorial(index);
    }
    denominator += offeredLoad ** servers / (factorial(servers) * (1 - utilization));
    averageQueueLength =
      (offeredLoad ** servers * utilization) /
      (factorial(servers) * (1 - utilization) ** 2 * denominator);
  }

  const averageWaitingHours =
    input.arrivalRatePerHour === 0 ? 0 : averageQueueLength / input.arrivalRatePerHour;
  const averageSystemHours = averageWaitingHours + 1 / input.serviceRatePerServerPerHour;
  return {
    status: 'ready',
    model,
    utilization,
    averageQueueLength,
    averageWaitingHours,
    averageSystemHours,
    averageSystemCount: input.arrivalRatePerHour * averageSystemHours,
    formula:
      servers === 1
        ? 'Lq = ρ² / (1 − ρ), Wq = Lq / λ, W = Wq + 1 / μ'
        : 'Lq = ((λ/μ)^c × ρ) / (c! × (1 − ρ)² × Σ), Wq = Lq / λ, W = Wq + 1 / μ',
    issues: [],
  };
};
