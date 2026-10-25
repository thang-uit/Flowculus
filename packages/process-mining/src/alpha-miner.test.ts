import { describe, expect, it } from 'vitest';

import { createEventLog, generatePresetLog, mineAlpha } from './index';

const log = (cases: string[][]) =>
  createEventLog(
    'alpha fixture',
    cases.flatMap((activities, caseIndex) =>
      activities.map((activity, index) => ({
        caseId: String(caseIndex),
        activity,
        completeTime: index + 1,
      })),
    ),
  );

describe('Alpha Miner and token replay', () => {
  it('discovers XOR places and replays observed choices', () => {
    const result = mineAlpha(
      log([
        ['A', 'B', 'D'],
        ['A', 'C', 'D'],
      ]),
    );
    expect(result.status).toBe('ready');
    expect(result.places).toEqual([
      { inputs: ['A'], outputs: ['B', 'C'] },
      { inputs: ['B', 'C'], outputs: ['D'] },
    ]);
    expect(result.replay).toMatchObject({ examinedCases: 2, compatibleCases: 2 });
  });

  it('discovers parallel branches when both observed orders occur', () => {
    const result = mineAlpha(
      log([
        ['A', 'B', 'C', 'D'],
        ['A', 'C', 'B', 'D'],
      ]),
    );
    expect(result.parallelCount).toBe(1);
    expect(result.places).toEqual([
      { inputs: ['A'], outputs: ['B'] },
      { inputs: ['A'], outputs: ['C'] },
      { inputs: ['B'], outputs: ['D'] },
      { inputs: ['C'], outputs: ['D'] },
    ]);
    expect(result.replay).toMatchObject({ compatibleCases: 2 });
  });

  it('withholds token replay for short loops that classic Alpha cannot represent', () => {
    const result = mineAlpha(log([['A', 'B', 'A']]));
    expect(result.shortLoops).toContain('A ↔ B');
    expect(result.replay).toBeNull();
  });

  it('bounds analysis of the bundled order log', () => {
    const result = mineAlpha(generatePresetLog('order-to-cash'));
    expect(result.activityCount).toBeGreaterThan(0);
    expect(result.places.length).toBeLessThanOrEqual(2_000);
  });
});
