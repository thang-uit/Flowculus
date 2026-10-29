import type { ProcessModel, ProcessNode } from '@flowculus/process-model';
import { createEventLog } from '../parse';
export function deliveryModel(): ProcessModel {
  const tasks = [
    ['spec', 'Clarify requirements', 'ba', 60],
    ['backend', 'Implement API', 'be', 180],
    ['mobile', 'Implement mobile', 'mb', 120],
    ['qa', 'Test integrated build', 'qa', 60],
    ['fix', 'Correct defect', 'be', 90],
    ['retest', 'Retest correction', 'qa', 45],
    ['release', 'Approve release', 'ba', 30],
    ['accept', 'Record acceptance', 'ba', 30],
  ] as const;
  const nodes: Record<string, ProcessNode> = {
    start: {
      id: 'start',
      kind: 'start',
      label: 'Start',
      poolId: 'team',
      bounds: { x: 70, y: 70, width: 44, height: 44 },
    },
    split: {
      id: 'split',
      kind: 'gateway',
      label: 'Parallel development',
      gatewayKind: 'and',
      poolId: 'team',
      bounds: { x: 430, y: 100, width: 56, height: 56 },
    },
    join: {
      id: 'join',
      kind: 'gateway',
      label: 'Wait for both',
      gatewayKind: 'and',
      poolId: 'team',
      bounds: { x: 900, y: 100, width: 56, height: 56 },
    },
    decision: {
      id: 'decision',
      kind: 'gateway',
      label: 'QA outcome',
      gatewayKind: 'xor',
      poolId: 'team',
      bounds: { x: 1200, y: 480, width: 56, height: 56 },
    },
    merge: {
      id: 'merge',
      kind: 'gateway',
      label: 'Continue release',
      gatewayKind: 'xor',
      poolId: 'team',
      bounds: { x: 1640, y: 100, width: 56, height: 56 },
    },
    end: {
      id: 'end',
      kind: 'end',
      label: 'End',
      poolId: 'team',
      bounds: { x: 2150, y: 70, width: 44, height: 44 },
    },
  };
  const rows = { ba: 0, be: 1, mb: 2, qa: 3 };
  tasks.forEach(([id, label, lane, duration]) => {
    nodes[id] = {
      id,
      label,
      kind: 'task',
      poolId: 'team',
      laneId: `lane_${lane}`,
      processingMinutes: duration,
      waitingMinutes: 0,
      bounds: {
        x:
          id === 'spec'
            ? 170
            : id === 'backend' || id === 'mobile'
              ? 560
              : id === 'qa'
                ? 1000
                : id === 'fix'
                  ? 1300
                  : id === 'retest'
                    ? 1470
                    : id === 'release'
                      ? 1770
                      : 1970,
        y: rows[lane] * 170 + 60,
        width: 160,
        height: 70,
      },
    };
  });
  const links = [
    ['start', 'spec'],
    ['spec', 'split'],
    ['split', 'backend'],
    ['split', 'mobile'],
    ['backend', 'join'],
    ['mobile', 'join'],
    ['join', 'qa'],
    ['qa', 'decision'],
    ['decision', 'merge'],
    ['decision', 'fix'],
    ['fix', 'retest'],
    ['retest', 'merge'],
    ['merge', 'release'],
    ['release', 'accept'],
    ['accept', 'end'],
  ];
  return {
    schemaVersion: 2,
    id: 'software-delivery-standard',
    name: 'Software delivery — approved internal process',
    nodes,
    edges: Object.fromEntries(
      links.map(([source, target], index) => [
        `flow${index}`,
        {
          id: `flow${index}`,
          source,
          target,
          kind: 'sequence',
          ...(source === 'decision' ? { probability: target === 'fix' ? 0.2 : 0.8 } : {}),
          routing: { style: 'orthogonal', waypoints: [] },
        },
      ]),
    ),
    containers: {
      team: {
        id: 'team',
        label: 'Delivery team',
        kind: 'pool',
        processId: 'delivery',
        orientation: 'horizontal',
        bounds: { x: 0, y: 0, width: 2240, height: 680 },
      },
      ...Object.fromEntries(
        Object.entries(rows).map(([id, row]) => [
          `lane_${id}`,
          {
            id: `lane_${id}`,
            label: {
              ba: 'Business analysis',
              be: 'Backend',
              mb: 'Mobile',
              qa: 'Quality assurance',
            }[id],
            kind: 'lane',
            parentId: 'team',
            orientation: 'horizontal',
            bounds: { x: 36, y: row * 170, width: 2204, height: 170 },
          },
        ]),
      ),
    },
  };
}
export const activityLabel: Record<string, string> = Object.fromEntries(
  Object.values(deliveryModel().nodes)
    .filter((node) => node.kind === 'task')
    .map((node) => [node.id, node.label]),
);
export const DELIVERY_EXPECTATIONS = [
  {
    caseId: 'CASE_001',
    kind: 'valid',
    sequence: ['spec', 'backend', 'mobile', 'qa', 'release', 'accept'],
  },
  {
    caseId: 'CASE_002',
    kind: 'valid-parallel-order',
    sequence: ['spec', 'mobile', 'backend', 'qa', 'release', 'accept'],
  },
  {
    caseId: 'CASE_003',
    kind: 'valid-correction',
    sequence: ['spec', 'backend', 'mobile', 'qa', 'fix', 'retest', 'release', 'accept'],
  },
  {
    caseId: 'CASE_004',
    kind: 'missing-qa',
    sequence: ['spec', 'backend', 'mobile', 'release', 'accept'],
  },
  {
    caseId: 'CASE_005',
    kind: 'premature-approval',
    sequence: ['spec', 'release', 'backend', 'mobile', 'qa', 'accept'],
  },
  {
    caseId: 'CASE_006',
    kind: 'unknown-activity',
    sequence: ['spec', 'backend', 'mobile', 'qa', 'direct_publish', 'release', 'accept'],
  },
  {
    caseId: 'CASE_007',
    kind: 'incomplete-record',
    sequence: ['spec', 'backend', 'mobile', 'qa'],
  },
  {
    caseId: 'CASE_008',
    kind: 'long-qa-wait',
    sequence: ['spec', 'backend', 'mobile', 'qa', 'release', 'accept'],
  },
] as const;
export function deliveryLog() {
  const resources: Record<string, string> = {
    spec: 'BA 01',
    backend: 'Trịnh Thuận Huê',
    mobile: 'Chu Nam Thắng',
    qa: 'QA 01',
    fix: 'Trịnh Thuận Huê',
    retest: 'QA 01',
    release: 'BA 01',
    accept: 'BA 01',
    direct_publish: 'Release 01',
  };
  const events = DELIVERY_EXPECTATIONS.flatMap((item, caseIndex) => {
    let cursor = Date.UTC(2026, 9, 1 + caseIndex, 1);
    return item.sequence.map((activity) => {
      cursor += (item.caseId === 'CASE_008' && activity === 'qa' ? 24 * 60 : 30) * 60000;
      const startTime = cursor;
      cursor += (deliveryModel().nodes[activity]?.processingMinutes ?? 10) * 60000;
      return {
        caseId: item.caseId,
        activity: activityLabel[activity] ?? activity,
        startTime,
        completeTime: cursor,
        resource: resources[activity],
      };
    });
  });
  return createEventLog('Software delivery — synthetic demonstration', events);
}
