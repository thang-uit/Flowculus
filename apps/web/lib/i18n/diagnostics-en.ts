import type { DiagnosticCode, DiagnosticParams } from '@flowculus/validation';

type Formatter = (params: DiagnosticParams) => string;

const label = (params: DiagnosticParams): string =>
  String(params.label ?? params.nodeId ?? params.edgeId ?? '');
const flow = (params: DiagnosticParams): string =>
  params.source != null
    ? `${String(params.source)} → ${String(params.target)}`
    : label(params);
const kind = (params: DiagnosticParams): string =>
  String(params.gatewayKind ?? '').toUpperCase();

export const DIAGNOSTICS_EN: Record<DiagnosticCode, Formatter> = {
  'schema-invalid': (p) =>
    `The model has an invalid value at ${String(p.path || 'its root')}.`,
  'edge-missing-source': (p) =>
    `Flow ${String(p.edgeId)} starts at a node that no longer exists.`,
  'edge-missing-target': (p) =>
    `Flow ${String(p.edgeId)} ends at a node that no longer exists.`,
  'processing-exceeds-cycle-time': (p) =>
    `${label(p)}: processing time T is longer than its observed cycle time D.`,
  'waiting-exceeds-cycle-time': (p) =>
    `${label(p)}: waiting time Wq is longer than its observed cycle time D.`,
  'time-components-exceed-cycle-time': (p) =>
    `${label(p)}: T + Wq is longer than the observed cycle time D.`,
  'invalid-analysis-options': () => 'The scenario inputs contain an invalid value.',
  'empty-model': () => 'Add process steps and connect them to start the analysis.',
  'missing-start': () => 'There is no start event and no single entry step.',
  'implicit-start': (p) => `No start event: ${label(p)} is used as the entry step.`,
  'multiple-start-events': (p) =>
    `${String(p.count)} start events: their mix is unknown, so the cycle time needs simulation.`,
  'multiple-end-events': (p) =>
    `${String(p.count)} end events; the process ends at any of them.`,
  'implicit-end': (p) => `${label(p)} has no outgoing flow and is treated as an end.`,
  'sequence-flow-into-start': (p) => `Flow ${flow(p)} enters a start event.`,
  'sequence-flow-from-end': (p) => `Flow ${flow(p)} leaves an end event.`,
  'sequence-flow-artifact-endpoint': (p) =>
    `Sequence flow ${flow(p)} touches a data object or annotation; use an association.`,
  'self-loop-sequence-flow': (p) =>
    `${flow(p)} loops to itself; model repetition with a rework probability instead.`,
  'message-flow-artifact-endpoint': (p) => `Message flow ${flow(p)} touches an artifact.`,
  'association-without-artifact': (p) =>
    `Association ${flow(p)} connects two flow nodes; it is ignored by the analysis.`,
  'unknown-edge-kind': (p) => `Flow ${flow(p)} has an unknown type and is ignored.`,
  'gateway-kind-on-non-gateway': (p) =>
    `${label(p)} has a gateway type but is not a gateway.`,
  'unknown-node-kind': (p) => `${label(p)} has an unknown type; choose one in Inspector.`,
  'unreachable-node': (p) => `${label(p)} cannot be reached from the start.`,
  'orphan-node': (p) => `${label(p)} is not connected to anything.`,
  'disconnected-components': (p) => `The diagram has ${String(p.count)} separate parts.`,
  'no-path-to-end': (p) =>
    `${label(p)} can never reach an end; the process may not finish.`,
  'branch-probability-missing': (p) =>
    `${kind(p)} gateway ${label(p)} needs a probability on every outgoing flow.`,
  'branch-probability-sum': (p) =>
    `XOR gateway ${label(p)}: probabilities sum to ${String(p.sum)} instead of 1.`,
  'probability-ignored': (p) =>
    `A probability after ${label(p)} has no effect and is ignored.`,
  'implicit-split': (p) =>
    `${label(p)} has several outgoing flows without a gateway; add an explicit gateway.`,
  'implicit-join': (p) =>
    `${label(p)} merges several flows without a gateway (XOR merge).`,
  'mixed-gateway': (p) => `${label(p)} both merges and splits; consider two gateways.`,
  'gateway-pass-through': (p) =>
    `${label(p)} has one input and one output and does nothing.`,
  'unsupported-gateway-kind': (p) =>
    `${kind(p)} gateway ${label(p)} cannot be analysed analytically; simulation is required.`,
  'edge-rework-unsupported': (p) =>
    `Flow ${flow(p)} carries a rework probability; put it on the repeated task instead.`,
  'rework-ignored': (p) =>
    `${label(p)} is not an activity; its rework probability is ignored.`,
  'unsupported-element': (p) =>
    `${label(p)} is a ${String(p.shape)} that Flowculus keeps in the file but does not model.`,
  'containers-not-modelled': (p) =>
    `${String(p.count)} pool(s)/lane(s) are kept in the file but not analysed.`,
  'unconfirmed-semantics': (p) =>
    `${String(p.count)} inferred semantic item(s) need confirmation in Inspector.`,
  'join-not-found': (p) =>
    `${kind(p)} split ${label(p)}: its branches merge without a matching join.`,
  'join-kind-mismatch': (p) =>
    `${kind(p)} split ${label(p)} is closed by ${String(p.joinLabel)} (${String(p.joinKind).toUpperCase()}); the types must match.`,
  'unstructured-block': (p) =>
    `${kind(p)} block at ${label(p)} is not single-entry/single-exit; simulation is required.`,
  'explicit-join-invalid': (p) =>
    `${label(p)} is paired with join ${String(p.joinId)}, which does not close its block.`,
  'shared-join': (p) => `${label(p)} closes several nested blocks of the same type.`,
  'unmatched-join': (p) =>
    `${kind(p)} join ${label(p)} has no matching split; it may wait forever.`,
  'implicit-join-at-end': (p) =>
    `Branches of ${label(p)} finish at end events without a join.`,
  'parallel-branch-decision': (p) =>
    `Parallel block ${label(p)} contains decisions or loops: max of expected values is used.`,
  'or-independence-assumption': (p) =>
    `OR gateway ${label(p)}: branches are assumed independent; an empty choice is excluded.`,
  'or-too-many-branches': (p) =>
    `OR gateway ${label(p)} has ${String(p.count)} branches (limit ${String(p.limit)}).`,
  'cycle-detected': (p) => `Loop at ${label(p)}: solved as expected repetitions.`,
  'missing-activity-time': (p) => `${label(p)} has no time; 0 minutes is used.`,
  'unexplained-wait': (p) =>
    `${label(p)}: T + Wq is ${String(p.minutes)} min shorter than the observed cycle time.`,
  'processing-estimated-from-cycle-time': (p) =>
    `${label(p)}: processing time is estimated from its cycle time.`,
  'missing-processing-time': (p) =>
    `${label(p)} has waiting time but no processing time.`,
  'missing-cost': (p) => `${label(p)} has no cost data; its cost counts as 0.`,
  'did-not-converge': () => 'The calculation did not converge; simulation is required.',
  'cycle-time-zero': () => 'The cycle time is 0, so efficiency cannot be computed.',
  'cte-out-of-range': (p) =>
    `Theoretical time exceeds cycle time (ratio ${String(p.ratio)}); check the inputs.`,
  'capacity-default-pool-size': (p) => `Pool ${String(p.poolId)}: 1 resource is assumed.`,
  'capacity-over-utilized': (p) =>
    `Pool ${String(p.poolId)} is over capacity (utilisation ${String(p.utilization)}).`,
  'pool-queue-approximation': (p) =>
    `Pool ${String(p.poolId)}: its work per case is treated as one M/M/c service.`,
  'little-law-zero-arrival': () => "Little's Law needs an arrival rate above 0.",
  'queue-unstable': () =>
    'Utilisation is at or above 100 %; the queue grows without limit.',
  'queue-invalid-input': () => 'Arrival rate, service rate and servers must be valid.',
  'cpm-duration-estimate': (p) =>
    `CPM uses cycle time as an estimate of processing time for: ${String(p.labels)}.`,
};
