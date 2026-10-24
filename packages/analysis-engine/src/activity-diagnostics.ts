import { isActivityKind, type ProcessModel } from '@flowculus/process-model';
import { nodeParams, type Diagnostic } from '@flowculus/validation';

import { hasAnyTime, resolveActivityTime, type ResolvedActivityTime } from './cycle-time';
import { MAX_OR_BRANCHES } from './solver';
import type { BlockStructure } from './structure';

/** Time-contract diagnostics per activity (missing, estimated, unexplained). */
export const collectActivityTimes = (
  model: ProcessModel,
  diagnostics: Diagnostic[],
): Record<string, ResolvedActivityTime> => {
  const times: Record<string, ResolvedActivityTime> = {};
  for (const node of Object.values(model.nodes)) {
    const activity = isActivityKind(node.kind);
    if (!activity && !hasAnyTime(node)) continue;
    const time = resolveActivityTime(node);
    times[node.id] = time;
    if (!activity) continue;
    const path = `nodes.${node.id}`;
    if (time.cycleTimeSource === 'missing') {
      diagnostics.push({
        code: 'missing-activity-time',
        severity: 'warning',
        impact: 'assumption',
        path,
        params: nodeParams(node),
      });
    }
    if (time.processingSource === 'cycle-time-estimate') {
      diagnostics.push({
        code: 'processing-estimated-from-cycle-time',
        severity: 'info',
        impact: 'assumption',
        scope: 'processing',
        path,
        params: nodeParams(node),
      });
    } else if (
      time.processingSource === 'missing' &&
      time.cycleTimeSource !== 'missing'
    ) {
      diagnostics.push({
        code: 'missing-processing-time',
        severity: 'warning',
        impact: 'assumption',
        scope: 'processing',
        path,
        params: nodeParams(node),
      });
    }
    if (time.unexplainedWaitMinutes > 0) {
      diagnostics.push({
        code: 'unexplained-wait',
        severity: 'warning',
        impact: 'assumption',
        path,
        params: {
          ...nodeParams(node),
          minutes: Number(time.unexplainedWaitMinutes.toFixed(4)),
        },
      });
    }
    if (node.cost == null) {
      diagnostics.push({
        code: 'missing-cost',
        severity: 'info',
        impact: 'assumption',
        scope: 'cost',
        path,
        params: nodeParams(node),
      });
    }
  }
  return times;
};

export const collectOrDiagnostics = (
  model: ProcessModel,
  structure: BlockStructure,
  outgoingCount: (id: string) => number,
): Diagnostic[] =>
  [...structure.joinBySplitId.keys()].flatMap((splitId): Diagnostic[] => {
    const node = model.nodes[splitId];
    if (node?.gatewayKind !== 'or') return [];
    const count = outgoingCount(splitId);
    return [
      count > MAX_OR_BRANCHES
        ? {
            code: 'or-too-many-branches',
            severity: 'warning',
            impact: 'simulation-required',
            path: `nodes.${splitId}`,
            params: { ...nodeParams(node), count, limit: MAX_OR_BRANCHES },
          }
        : {
            code: 'or-independence-assumption',
            severity: 'info',
            impact: 'assumption',
            path: `nodes.${splitId}`,
            params: nodeParams(node),
          },
    ];
  });
