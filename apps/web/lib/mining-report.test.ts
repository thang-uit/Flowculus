import { describe, expect, it } from 'vitest';
import type { ResourceCentrality, SocialNetwork } from '@flowculus/process-mining';
import { DEFAULT_DISCOVERY_FILTER } from '@flowculus/process-mining';
import { miningConclusions } from './mining-conclusions';
import { miningResourceFindings, miningResourceLeaders } from './mining-report-findings';
import { createMiningSession } from './mining-engine';
import { isCurrentMiningReference } from './mining-current-reference';
import { INITIAL_PROCESS_MODEL } from './initial-process-model';
import { getMiningEvidenceCopy } from './i18n/mining-evidence-copy';

const resource = (
  id: string,
  patch: Partial<ResourceCentrality> = {},
): ResourceCentrality => ({
  id,
  eventCount: 1,
  inDegree: 0,
  outDegree: 0,
  handoffs: 0,
  incomingHandoffs: 0,
  outgoingHandoffs: 0,
  betweenness: 0,
  closeness: 0,
  eigenvector: 0,
  pageRank: 0,
  ...patch,
});
const network: SocialNetwork = {
  resources: [
    resource('B', {
      inDegree: 2,
      outDegree: 1,
      incomingHandoffs: 12,
      betweenness: 0.5,
      closeness: 0.8,
      pageRank: 0.4,
      eigenvector: 0.6,
    }),
    resource('A', {
      inDegree: 1,
      outDegree: 2,
      incomingHandoffs: 12,
      betweenness: 0.5,
      closeness: 0.8,
      pageRank: 0.4,
      eigenvector: 0.6,
    }),
  ],
  handoffs: [{ source: 'A', target: 'B', count: 12 }],
  omittedResources: 0,
};

describe('evidence-driven report language', () => {
  it('hides a previous comparison when its reference, scope or mapping changes', () => {
    const reference = { poolId: '', mapping: { Review: 'task-1' } };
    const stored = {
      model: INITIAL_PROCESS_MODEL,
      optionsKey: JSON.stringify({
        poolId: undefined,
        activityMapping: reference.mapping,
      }),
    };
    expect(isCurrentMiningReference(stored, INITIAL_PROCESS_MODEL, reference)).toBe(true);
    expect(isCurrentMiningReference(stored, undefined, reference)).toBe(false);
    expect(
      isCurrentMiningReference(stored, { ...INITIAL_PROCESS_MODEL }, reference),
    ).toBe(false);
    expect(
      isCurrentMiningReference(stored, INITIAL_PROCESS_MODEL, {
        ...reference,
        poolId: 'other',
      }),
    ).toBe(false);
    expect(
      isCurrentMiningReference(stored, INITIAL_PROCESS_MODEL, {
        ...reference,
        mapping: { Review: 'task-2' },
      }),
    ).toBe(false);
  });

  it('keeps tied network leaders and never treats an isolated resource as a bridge', () => {
    expect(miningResourceLeaders(network, 'betweenness')).toMatchObject({
      ids: ['A', 'B'],
      value: 0.5,
    });
    expect(miningResourceLeaders({ ...network, handoffs: [] }, 'pageRank')).toBeNull();
    expect(
      miningResourceLeaders(
        {
          ...network,
          resources: network.resources.map((person) => ({ ...person, betweenness: 0 })),
        },
        'betweenness',
      ),
    ).toBeNull();
    expect(miningResourceFindings({ ...network, handoffs: [] }, 'vi')).toEqual([]);
  });
  it('explains all five network measures with observations, meaning and an action', () => {
    const findings = miningResourceFindings(network, 'vi');
    expect(findings.map((finding) => finding.id)).toEqual([
      'connections',
      'betweenness',
      'closeness',
      'eigenvector',
      'pageRank',
    ]);
    expect(
      findings.every(
        (finding) =>
          finding.observation.includes('A, B') && finding.meaning && finding.action,
      ),
    ).toBe(true);
    expect(findings.find((finding) => finding.id === 'pageRank')?.meaning).toContain(
      'chưa đồng nghĩa với tồn đọng',
    );
  });
  it('uses full-log observations and distinguishes waiting from incomplete timestamps', () => {
    const session = createMiningSession();
    session({
      type: 'inspect-file',
      fileName: 'events.csv',
      source:
        'case,activity,start,time,person\n1,Review,2026-10-05T08:00Z,2026-10-05T09:00Z,Ann\n1,Approve,2026-10-05T11:00Z,2026-10-05T12:00Z,Bob',
    });
    const result = session({
      type: 'apply-mapping',
      name: 'Example',
      mapping: {
        caseId: 'case',
        activity: 'activity',
        timestamp: 'time',
        startTimestamp: 'start',
        resource: 'person',
      },
      filter: DEFAULT_DISCOVERY_FILTER,
    });
    if (result.type !== 'discovery') throw Error('Expected discovery');
    const duration = (value: number) => `${value / 3600000} giờ`;
    const measured = miningConclusions(result, 'vi', duration);
    expect(measured[0].observation).toContain('chờ trung bình 2 giờ');
    expect(measured[0].action).toContain('Review');
    expect(
      miningConclusions({ ...result, missingStartTimes: 1 }, 'vi', duration)[0]
        .observation,
    ).toContain('chưa tách riêng');
    const filtered = session({
      type: 'discover',
      filter: {
        ...DEFAULT_DISCOVERY_FILTER,
        minActivityShare: 1,
        minEdgeShare: 1,
        minTransitionHours: 100,
      },
    });
    if (filtered.type !== 'discovery') throw Error('Expected discovery');
    expect(miningConclusions(filtered, 'vi', duration)).toEqual(measured);
  });
  it('presents Vietnamese labels without the mixed internal algorithm vocabulary', () => {
    const copy = getMiningEvidenceCopy('vi');
    for (const value of [
      copy.fitness,
      copy.alignment,
      copy.resultVersion,
      copy.precision,
      copy.generalization,
      copy.simplicity,
      copy.networkHint,
      copy.method,
      copy.qualityScope,
    ])
      expect(value).not.toMatch(
        /\b(alignment|mapping|resource|transition|prefix|synchronous|workflow|log move)\b/i,
      );
    expect(copy.fitness).toBe('Mức khớp trình tự');
  });
});
