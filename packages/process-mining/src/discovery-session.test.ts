import { describe, expect, it } from 'vitest';

import { createEventLog, createProcessDiscovery, discoverProcess } from './index';

describe('prepared discovery', () => {
  it('keeps full-log metrics stable across filter changes and restores hidden paths', () => {
    const log = createEventLog('events', [
      { caseId: '1', activity: 'A', completeTime: 0 },
      { caseId: '1', activity: 'B', completeTime: 10 },
      { caseId: '1', activity: 'C', completeTime: 20 },
      { caseId: '2', activity: 'A', completeTime: 0 },
      { caseId: '2', activity: 'C', completeTime: 30 },
    ]);
    const discover = createProcessDiscovery(log);
    const initial = discover();
    const filtered = discover({
      minActivityShare: 1,
      minEdgeShare: 0.5,
      minTransitionHours: 0,
    });

    expect(filtered.stats).toBe(initial.stats);
    expect(filtered.variants).toBe(initial.variants);
    expect(filtered.bottlenecks).toBe(initial.bottlenecks);
    expect(filtered.hiddenActivityCount).toBe(1);
    expect(filtered).toEqual(discoverProcess(log, filtered.filter));
    expect(discover()).toEqual(initial);
    expect(initial.dfg.activities.map((activity) => activity.id)).toContain('B');
  });
});
