import { describe, expect, it } from 'vitest';

import { analyzeProcess, analyzeQueue, type AnalysisReport } from './index';
import { buildModel, endEvent, gateway, link, startEvent, task } from './test-fixtures';

const codes = (report: AnalysisReport) => report.issues.map((issue) => issue.code);

describe('formula groups', () => {
  it('sequence: CT = Σ (T + Wq)', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          task('a', 5, { waitingMinutes: 15 }),
          task('b', 4, { waitingMinutes: 6 }),
          endEvent(),
        ],
        [link('start', 'a'), link('a', 'b'), link('b', 'end')],
      ),
    );
    expect(report.cycleTimeMinutes).toBe(30);
    expect(report.theoreticalCycleTimeMinutes).toBe(9);
    expect(report.cycleTimeEfficiency).toBe(0.3);
    expect(report.quality).toBe('exact');
  });

  it('XOR: expected value Σ p × CT', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('x', 'xor'),
          task('a', 10),
          task('b', 30),
          gateway('m', 'xor'),
          endEvent(),
        ],
        [
          link('start', 'x'),
          link('x', 'a', 0.6),
          link('x', 'b', 0.4),
          link('a', 'm'),
          link('b', 'm'),
          link('m', 'end'),
        ],
      ),
    );
    expect(report.cycleTimeMinutes).toBeCloseTo(18, 9);
    expect(report.formula).toContain('0.6');
  });

  it('AND: max for elapsed time, sum for cost and unit load', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('p', 'and'),
          task('a', 6, { cost: { resourceRatePerHour: 60, resourcePoolId: 'team' } }),
          task('b', 8, {
            cost: { resourceRatePerHour: 120, resourcePoolId: 'team', resourceCount: 2 },
          }),
          gateway('j', 'and'),
          endEvent(),
        ],
        [
          link('start', 'p'),
          link('p', 'a'),
          link('p', 'b'),
          link('a', 'j'),
          link('b', 'j'),
          link('j', 'end'),
        ],
      ),
      { workingHoursPerDay: 8 },
    );
    expect(report.cycleTimeMinutes).toBe(8);
    expect(report.costPerExecution).toBeCloseTo(6 + 16, 9);
    expect(report.capacity[0]).toMatchObject({ unitLoadMinutes: 14, resourceCount: 2 });
    expect(report.capacity[0]?.capacityPerDay).toBeCloseTo((2 * 8 * 60) / 14, 9);
  });

  it('OR: independent combinations without the empty selection, bounded branch count', () => {
    const or = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('o', 'or'),
          task('a', 4),
          task('b', 6),
          gateway('oj', 'or'),
          endEvent(),
        ],
        [
          link('start', 'o'),
          link('o', 'a', 0.5),
          link('o', 'b', 0.5),
          link('a', 'oj'),
          link('b', 'oj'),
          link('oj', 'end'),
        ],
      ),
    );
    // P{a}=P{b}=P{a,b}=1/3 after excluding ∅: (4 + 6 + 6) / 3.
    expect(or.cycleTimeMinutes).toBeCloseTo(16 / 3, 9);
    expect(or.quality).toBe('assumption');

    const branches = Array.from({ length: 13 }, (_, index) =>
      task(`t${index}`, index + 1),
    );
    const tooMany = analyzeProcess(
      buildModel(
        [startEvent(), gateway('o', 'or'), ...branches, gateway('oj', 'or'), endEvent()],
        [
          link('start', 'o'),
          ...branches.flatMap((branch) => [
            link('o', branch.id, 0.5),
            link(branch.id, 'oj'),
          ]),
          link('oj', 'end'),
        ],
      ),
    );
    expect(tooMany.quality).toBe('simulation-required');
    expect(codes(tooMany)).toContain('or-too-many-branches');
  });

  it('rework: T / (1 − r) only for the marked body, not its continuation', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          task('check', 12, { reworkProbability: 0.25 }),
          task('ship', 5),
          endEvent(),
        ],
        [link('start', 'check'), link('check', 'ship'), link('ship', 'end')],
      ),
    );
    expect(report.cycleTimeMinutes).toBeCloseTo(12 / 0.75 + 5, 9);
    expect(report.formula).toContain('1 - 0.25');
  });

  it('CPM: exact on decision-free graphs with explicit T; unavailable across decisions', () => {
    const cpm = analyzeProcess(
      buildModel(
        [
          startEvent(),
          task('prep', 4),
          gateway('p', 'and'),
          task('short', 3),
          task('long', 9),
          gateway('j', 'and'),
          task('finish', 2),
          endEvent(),
        ],
        [
          link('start', 'prep'),
          link('prep', 'p'),
          link('p', 'short'),
          link('p', 'long'),
          link('short', 'j'),
          link('long', 'j'),
          link('j', 'finish'),
          link('finish', 'end'),
        ],
      ),
    );
    expect(cpm.criticalPath).toMatchObject({
      status: 'ready',
      quality: 'exact',
      durationMinutes: 15,
      taskIds: ['prep', 'long', 'finish'],
      formula: '4 + 9 + 2 = 15',
    });
    expect(cpm.criticalPath?.edgeIds).toEqual([
      'start>prep',
      'prep>p',
      'p>long',
      'long>j',
      'j>finish',
      'finish>end',
    ]);

    const decision = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('x', 'xor'),
          task('a', 3),
          task('b', 8),
          gateway('m', 'xor'),
          endEvent(),
        ],
        [
          link('start', 'x'),
          link('x', 'a', 0.5),
          link('x', 'b', 0.5),
          link('a', 'm'),
          link('b', 'm'),
          link('m', 'end'),
        ],
      ),
    );
    expect(decision.criticalPath).toMatchObject({
      status: 'unavailable',
      reason: 'decision-gateway',
    });
  });

  it('CPM: duration-only tasks are an assumption; both values present use T', () => {
    const mixed = analyzeProcess(
      buildModel(
        [
          startEvent(),
          task('a', 0, { processingMinutes: undefined, durationMinutes: 12 }),
          task('b', 4, { durationMinutes: 10 }),
          endEvent(),
        ],
        [link('start', 'a'), link('a', 'b'), link('b', 'end')],
      ),
    );
    expect(mixed.criticalPath).toMatchObject({
      status: 'ready',
      quality: 'assumption',
      durationMinutes: 16,
      estimatedTaskIds: ['a'],
    });
  });

  it('critical chain: deterministic vs expected-time heuristic, never better than CT', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('x', 'xor'),
          task('likely', 10),
          task('rare', 100),
          gateway('m', 'xor'),
          endEvent(),
        ],
        [
          link('start', 'x'),
          link('x', 'likely', 0.8),
          link('x', 'rare', 0.2),
          link('likely', 'm'),
          link('rare', 'm'),
          link('m', 'end'),
        ],
      ),
    );
    expect(report.criticalChain).toMatchObject({
      basis: 'expected-time-heuristic',
      quality: 'assumption',
      taskIds: ['rare'],
    });
    const unsupported = analyzeProcess(
      buildModel(
        [startEvent(), task('a', 5), task('b', 5), endEvent()],
        [link('start', 'a'), link('a', 'b'), link('a', 'end'), link('b', 'end')],
      ),
    );
    expect(unsupported.criticalChain).toMatchObject({
      status: 'unavailable',
      reason: 'no-analytic-result',
    });
  });

  it("Little's Law: CT = WIP / λ from the scenario and WIP = λ × CT from the model", () => {
    const report = analyzeProcess(
      buildModel(
        [startEvent(), task('a', 30, { waitingMinutes: 30 }), endEvent()],
        [link('start', 'a'), link('a', 'end')],
      ),
      { arrivalRatePerHour: 4, workInProcess: 10 },
    );
    expect(report.littleLaw).toEqual({
      arrivalRatePerHour: 4,
      workInProcess: 10,
      cycleTimeHours: 2.5,
    });
    expect(report.littleLawForecast).toMatchObject({
      workInProcess: 4,
      quality: 'exact',
    });
    const zero = analyzeProcess(
      buildModel(
        [startEvent(), task('a', 30), endEvent()],
        [link('start', 'a'), link('a', 'end')],
      ),
      { arrivalRatePerHour: 0, workInProcess: 10 },
    );
    expect(codes(zero)).toContain('little-law-zero-arrival');
  });

  it('M/M/c: Erlang C waiting time and stability', () => {
    const mm2 = analyzeQueue({
      arrivalRatePerHour: 3,
      serviceRatePerServerPerHour: 2,
      servers: 2,
    });
    expect(mm2.utilization).toBeCloseTo(0.75, 9);
    expect(mm2.averageQueueLength).toBeCloseTo(1.928571, 5);
    expect(mm2.averageWaitingHours).toBeCloseTo(0.642857, 5);
    expect(mm2.averageSystemHours).toBeCloseTo(1.142857, 5);
    const unstable = analyzeQueue({
      arrivalRatePerHour: 5,
      serviceRatePerServerPerHour: 2,
      servers: 2,
    });
    expect(unstable.status).toBe('unstable');
    expect(unstable.issues.map((issue) => issue.code)).toEqual(['queue-unstable']);
    const invalid = analyzeQueue({
      arrivalRatePerHour: 1,
      serviceRatePerServerPerHour: 0,
    });
    expect(invalid.issues.map((issue) => issue.code)).toEqual(['queue-invalid-input']);
  });

  it('capacity: the pool with the smallest capacity is the bottleneck', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          task('a', 30, { cost: { resourcePoolId: 'clerks', resourceCount: 2 } }),
          task('b', 20, { cost: { resourcePoolId: 'experts', resourceCount: 1 } }),
          endEvent(),
        ],
        [link('start', 'a'), link('a', 'b'), link('b', 'end')],
      ),
      { arrivalRatePerHour: 1 },
    );
    const clerks = report.capacity.find((item) => item.resourcePoolId === 'clerks');
    const experts = report.capacity.find((item) => item.resourcePoolId === 'experts');
    expect(clerks?.capacityPerDay).toBeCloseTo(32, 9);
    expect(experts?.capacityPerDay).toBeCloseTo(24, 9);
    expect(experts?.isBottleneck).toBe(true);
    expect(experts?.utilization).toBeCloseTo(8 / 24, 9);
    expect(report.metricQuality.capacity).toBe('assumption');
    expect(codes(report)).toContain('pool-queue-approximation');
  });
});

describe('quality and issues survive serialization boundaries', () => {
  it('keeps quality, metric quality and issues through structured clone and JSON', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          task('a', 0, { processingMinutes: undefined, durationMinutes: 10 }),
          endEvent(),
        ],
        [link('start', 'a'), link('a', 'end')],
      ),
    );
    expect(report.quality).toBe('assumption');
    const cloned = structuredClone(report);
    const viaJson = JSON.parse(JSON.stringify(report)) as AnalysisReport;
    for (const copy of [cloned, viaJson]) {
      expect(copy.quality).toBe(report.quality);
      expect(copy.metricQuality).toEqual(report.metricQuality);
      expect(copy.issues).toEqual(report.issues);
      expect(copy.activityTimes).toEqual(report.activityTimes);
    }
  });
});
