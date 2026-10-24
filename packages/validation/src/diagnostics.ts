/**
 * Structured, locale-neutral diagnostics shared by validation and the
 * analysis engine. Packages never produce user-facing sentences: the web layer
 * maps every `code` to an English and a Vietnamese message.
 */

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * How a diagnostic limits the trust in a result. `invalid` blocks the
 * calculation, `simulation-required` withholds the analytic number,
 * `assumption` keeps the number but downgrades its quality.
 */
export type QualityImpact = 'none' | 'assumption' | 'simulation-required' | 'invalid';

/**
 * Which results a diagnostic affects. `model` applies to every graph metric;
 * the narrower scopes only affect the named result family.
 */
export type DiagnosticScope =
  'model' | 'processing' | 'efficiency' | 'cost' | 'capacity' | 'queue' | 'critical-path';

export const DIAGNOSTIC_CODES = [
  // Model structure and input data
  'schema-invalid',
  'edge-missing-source',
  'edge-missing-target',
  'processing-exceeds-cycle-time',
  'waiting-exceeds-cycle-time',
  'time-components-exceed-cycle-time',
  'invalid-analysis-options',
  'empty-model',
  // Graph validation
  'missing-start',
  'implicit-start',
  'multiple-start-events',
  'multiple-end-events',
  'implicit-end',
  'sequence-flow-into-start',
  'sequence-flow-from-end',
  'sequence-flow-artifact-endpoint',
  'self-loop-sequence-flow',
  'message-flow-artifact-endpoint',
  'association-without-artifact',
  'unknown-edge-kind',
  'gateway-kind-on-non-gateway',
  'unknown-node-kind',
  'unreachable-node',
  'orphan-node',
  'disconnected-components',
  'no-path-to-end',
  'branch-probability-missing',
  'branch-probability-sum',
  'probability-ignored',
  'implicit-split',
  'implicit-join',
  'mixed-gateway',
  'gateway-pass-through',
  'unsupported-gateway-kind',
  'edge-rework-unsupported',
  'rework-ignored',
  'unsupported-element',
  'containers-not-modelled',
  'unconfirmed-semantics',
  // Block structure (split/join resolution)
  'join-not-found',
  'join-kind-mismatch',
  'unstructured-block',
  'explicit-join-invalid',
  'shared-join',
  'unmatched-join',
  'implicit-join-at-end',
  'parallel-branch-decision',
  'or-independence-assumption',
  'or-too-many-branches',
  'cycle-detected',
  // Activity times, cost and convergence
  'missing-activity-time',
  'unexplained-wait',
  'processing-estimated-from-cycle-time',
  'missing-processing-time',
  'missing-cost',
  'did-not-converge',
  'cycle-time-zero',
  'cte-out-of-range',
  // Capacity, queues and Little's Law
  'capacity-default-pool-size',
  'capacity-over-utilized',
  'pool-queue-approximation',
  'little-law-zero-arrival',
  'queue-unstable',
  'queue-invalid-input',
  // Critical path / chain
  'cpm-duration-estimate',
] as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export type DiagnosticParams = Record<string, string | number>;

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  impact: QualityImpact;
  /** Results affected; defaults to `model` (every graph metric). */
  scope?: DiagnosticScope;
  /** Dotted path of the offending element, e.g. `nodes.review`. */
  path?: string;
  params?: DiagnosticParams;
}

const IMPACT_RANK: Record<QualityImpact, number> = {
  none: 0,
  assumption: 1,
  'simulation-required': 2,
  invalid: 3,
};

export const worstImpact = (impacts: Iterable<QualityImpact>): QualityImpact => {
  let worst: QualityImpact = 'none';
  for (const impact of impacts) {
    if (IMPACT_RANK[impact] > IMPACT_RANK[worst]) worst = impact;
  }
  return worst;
};

export const isDiagnosticCode = (value: unknown): value is DiagnosticCode =>
  typeof value === 'string' && (DIAGNOSTIC_CODES as readonly string[]).includes(value);

/** Keeps the first occurrence of each code/path pair, preserving order. */
export const dedupeDiagnostics = (diagnostics: Diagnostic[]): Diagnostic[] => {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}\u0000${diagnostic.path ?? ''}\u0000${diagnostic.scope ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Diagnostic parameters that identify a node for the message layer. */
export const nodeParams = (node: { id: string; label: string }): DiagnosticParams => ({
  nodeId: node.id,
  label: node.label,
});
