import { describe, expect, it } from 'vitest';

import { buildSocialNetwork, createEventLog } from './index';

describe('resource handoff network', () => {
  it('counts only within-case handoffs and identifies the bridge in a chain', () => {
    const log = createEventLog('handoffs', [
      { caseId: '1', activity: 'A', completeTime: 1, resource: 'An' },
      { caseId: '1', activity: 'B', completeTime: 2, resource: 'Binh' },
      { caseId: '1', activity: 'C', completeTime: 3, resource: 'Chi' },
      { caseId: '2', activity: 'A', completeTime: 1, resource: 'An' },
      { caseId: '2', activity: 'B', completeTime: 2, resource: 'An' },
    ]);
    const network = buildSocialNetwork(log);
    expect(network.handoffs).toEqual([
      { source: 'An', target: 'Binh', count: 1 },
      { source: 'Binh', target: 'Chi', count: 1 },
    ]);
    const bridge = network.resources.find((resource) => resource.id === 'Binh');
    expect(bridge?.betweenness).toBe(0.5);
    expect(
      network.resources.reduce((sum, resource) => sum + resource.pageRank, 0),
    ).toBeCloseTo(1);
  });

  it('does not invent a resource network when the column is absent', () => {
    const log = createEventLog('no resources', [
      { caseId: '1', activity: 'A', completeTime: 1 },
    ]);
    expect(buildSocialNetwork(log)).toEqual({
      resources: [],
      handoffs: [],
      omittedResources: 0,
    });
  });
});
