import { describe, expect, it } from 'vitest';

import { analyzeProcess, computeImmediateDominators, dominates } from './index';
import { buildModel, endEvent, gateway, link, startEvent, task } from './test-fixtures';

const codes = (report: ReturnType<typeof analyzeProcess>) =>
  report.issues.map((issue) => issue.code);

describe('dominators (Cooper–Harvey–Kennedy)', () => {
  it('computes immediate dominators of a diamond with a loop', () => {
    const successors: Record<string, string[]> = {
      s: ['a'],
      a: ['b', 'c'],
      b: ['d'],
      c: ['d'],
      d: ['a', 'e'],
      e: [],
    };
    const predecessors: Record<string, string[]> = {};
    Object.entries(successors).forEach(([source, targets]) =>
      targets.forEach((target) => {
        predecessors[target] = [...(predecessors[target] ?? []), source];
      }),
    );
    const idom = computeImmediateDominators(
      's',
      (id) => successors[id] ?? [],
      (id) => predecessors[id] ?? [],
    );
    expect(Object.fromEntries(idom)).toEqual({
      s: 's',
      a: 's',
      b: 'a',
      c: 'a',
      d: 'a',
      e: 'd',
    });
    expect(dominates(idom, 'a', 'e')).toBe(true);
    expect(dominates(idom, 'b', 'd')).toBe(false);
  });
});

describe('block structure (join resolution)', () => {
  it('solves nested XOR exactly without any join heuristic', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('x1', 'xor'),
          gateway('x2', 'xor'),
          task('a', 10),
          task('b', 20),
          task('c', 40),
          gateway('m2', 'xor'),
          gateway('m1', 'xor'),
          endEvent(),
        ],
        [
          link('start', 'x1'),
          link('x1', 'x2', 0.5),
          link('x1', 'c', 0.5),
          link('x2', 'a', 0.3),
          link('x2', 'b', 0.7),
          link('a', 'm2'),
          link('b', 'm2'),
          link('m2', 'm1'),
          link('c', 'm1'),
          link('m1', 'end'),
        ],
      ),
    );
    // 0.5 × (0.3 × 10 + 0.7 × 20) + 0.5 × 40 = 28.5
    expect(report.quality).toBe('exact');
    expect(report.cycleTimeMinutes).toBeCloseTo(28.5, 9);
  });

  it('pairs nested AND blocks with their own joins (max of max)', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('p1', 'and'),
          gateway('p2', 'and'),
          task('a', 5),
          task('b', 15),
          task('c', 12),
          gateway('j2', 'and'),
          gateway('j1', 'and'),
          task('after', 3),
          endEvent(),
        ],
        [
          link('start', 'p1'),
          link('p1', 'p2'),
          link('p1', 'c'),
          link('p2', 'a'),
          link('p2', 'b'),
          link('a', 'j2'),
          link('b', 'j2'),
          link('j2', 'j1'),
          link('c', 'j1'),
          link('j1', 'after'),
          link('after', 'end'),
        ],
      ),
    );
    expect(report.quality).toBe('exact');
    expect(report.cycleTimeMinutes).toBeCloseTo(15 + 3, 9);
    // Cost counts every branch once and the shared continuation once.
    expect(report.costPerExecution).toBeCloseTo(5 + 15 + 12 + 3, 9);
  });

  it('handles OR nested in AND and labels max-of-expectations as an assumption', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('p', 'and'),
          gateway('o', 'or'),
          task('a', 10),
          task('b', 20),
          gateway('oj', 'or'),
          task('c', 8),
          gateway('pj', 'and'),
          endEvent(),
        ],
        [
          link('start', 'p'),
          link('p', 'o'),
          link('p', 'c'),
          link('o', 'a', 0.5),
          link('o', 'b', 0.5),
          link('a', 'oj'),
          link('b', 'oj'),
          link('oj', 'pj'),
          link('c', 'pj'),
          link('pj', 'end'),
        ],
      ),
    );
    // OR: {a}=1/3, {b}=1/3, {a,b}=1/3 → (10 + 20 + 20) / 3 = 16.667; AND max with 8.
    expect(report.cycleTimeMinutes).toBeCloseTo(50 / 3, 9);
    expect(report.quality).toBe('assumption');
    expect(codes(report)).toEqual(
      expect.arrayContaining(['parallel-branch-decision', 'or-independence-assumption']),
    );
  });

  it('accepts a join shared by nested AND splits of the same kind', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('p1', 'and'),
          gateway('p2', 'and'),
          task('a', 4),
          task('b', 9),
          task('c', 6),
          gateway('j', 'and'),
          endEvent(),
        ],
        [
          link('start', 'p1'),
          link('p1', 'a'),
          link('p1', 'p2'),
          link('p2', 'b'),
          link('p2', 'c'),
          link('a', 'j'),
          link('b', 'j'),
          link('c', 'j'),
          link('j', 'end'),
        ],
      ),
    );
    expect(report.quality).toBe('exact');
    expect(report.cycleTimeMinutes).toBeCloseTo(9, 9);
    expect(report.costPerExecution).toBeCloseTo(19, 9);
    expect(codes(report)).toContain('shared-join');
  });

  it('refuses an unstructured AND block that is entered from outside', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('x', 'xor'),
          gateway('p', 'and'),
          task('a', 5),
          task('b', 7),
          gateway('j', 'and'),
          endEvent(),
        ],
        [
          link('start', 'x'),
          link('x', 'p', 0.5),
          link('x', 'b', 0.5),
          link('p', 'a'),
          link('p', 'b'),
          link('a', 'j'),
          link('b', 'j'),
          link('j', 'end'),
        ],
      ),
    );
    expect(report.quality).toBe('simulation-required');
    expect(report.cycleTimeMinutes).toBeNull();
    expect(report.formulaAst).toBeUndefined();
    expect(codes(report)).toContain('unstructured-block');
  });

  it('accepts parallel branches that end separately, but not ones that merge without a join', () => {
    const separate = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('p', 'and'),
          task('a', 5),
          task('b', 7),
          endEvent('e1'),
          endEvent('e2'),
        ],
        [
          link('start', 'p'),
          link('p', 'a'),
          link('p', 'b'),
          link('a', 'e1'),
          link('b', 'e2'),
        ],
      ),
    );
    expect(separate.cycleTimeMinutes).toBe(7);
    expect(separate.quality).toBe('exact');
    expect(codes(separate)).toContain('implicit-join-at-end');

    const merged = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('p', 'and'),
          task('a', 5),
          task('b', 7),
          task('c', 2),
          task('m', 1),
          endEvent('e1'),
          endEvent('e2'),
        ],
        [
          link('start', 'p'),
          link('p', 'a'),
          link('p', 'b'),
          link('p', 'c'),
          link('a', 'm'),
          link('b', 'm'),
          link('m', 'e1'),
          link('c', 'e2'),
        ],
      ),
    );
    expect(merged.quality).toBe('simulation-required');
    expect(codes(merged)).toContain('join-not-found');
  });

  it('rejects a join of a different gateway kind', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('p', 'and'),
          task('a', 5),
          task('b', 7),
          gateway('j', 'xor'),
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
    );
    expect(report.quality).toBe('simulation-required');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: 'join-kind-mismatch',
        params: expect.objectContaining({ joinId: 'j', joinKind: 'xor' }),
      }),
    );
  });

  it('honours a consistent explicit join id and rejects an inconsistent one', () => {
    const nodes = [
      startEvent(),
      gateway('p', 'and', { metadata: { 'flowculus-join-id': 'j' } }),
      task('a', 5),
      task('b', 7),
      gateway('j', 'and'),
      task('t', 1),
      endEvent(),
    ];
    const edges = [
      link('start', 'p'),
      link('p', 'a'),
      link('p', 'b'),
      link('a', 'j'),
      link('b', 'j'),
      link('j', 't'),
      link('t', 'end'),
    ];
    const valid = analyzeProcess(buildModel(nodes, edges));
    expect(valid.cycleTimeMinutes).toBe(8);
    expect(valid.quality).toBe('exact');

    const wrong = analyzeProcess(
      buildModel(
        nodes.map((node) =>
          node.id === 'p' ? { ...node, metadata: { 'flowculus-join-id': 'a' } } : node,
        ),
        edges,
      ),
    );
    expect(wrong.quality).toBe('simulation-required');
    expect(codes(wrong)).toContain('explicit-join-invalid');
  });

  it('keeps XOR loops and task rework exact (expected visits)', () => {
    const loop = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('m', 'xor'),
          task('work', 30),
          gateway('ok', 'xor'),
          endEvent(),
        ],
        [
          link('start', 'm'),
          link('m', 'work'),
          link('work', 'ok'),
          link('ok', 'm', 0.25),
          link('ok', 'end', 0.75),
        ],
      ),
    );
    // Expected visits = 1 / (1 − 0.25) → 40 minutes.
    expect(loop.cycleTimeMinutes).toBeCloseTo(40, 6);
    expect(loop.quality).toBe('exact');
    expect(codes(loop)).toContain('cycle-detected');

    const rework = analyzeProcess(
      buildModel(
        [startEvent(), task('work', 30, { reworkProbability: 0.25 }), endEvent()],
        [link('start', 'work'), link('work', 'end')],
      ),
    );
    expect(rework.cycleTimeMinutes).toBeCloseTo(40, 9);
    expect(rework.quality).toBe('exact');
  });

  it('refuses an AND block whose branch loops back before the split', () => {
    const report = analyzeProcess(
      buildModel(
        [
          startEvent(),
          gateway('m', 'xor'),
          gateway('p', 'and'),
          task('a', 5),
          gateway('back', 'xor'),
          task('b', 7),
          gateway('j', 'and'),
          endEvent(),
        ],
        [
          link('start', 'm'),
          link('m', 'p'),
          link('p', 'a'),
          link('p', 'b'),
          link('a', 'back'),
          link('back', 'm', 0.2),
          link('back', 'j', 0.8),
          link('b', 'j'),
          link('j', 'end'),
        ],
      ),
    );
    expect(report.quality).toBe('simulation-required');
    expect(codes(report)).toContain('unstructured-block');
  });

  it('withholds the result for multiple start events instead of picking one', () => {
    const report = analyzeProcess(
      buildModel(
        [startEvent('s1'), startEvent('s2'), task('a', 5), endEvent()],
        [link('s1', 'a'), link('s2', 'a'), link('a', 'end')],
      ),
    );
    expect(report.status).toBe('unsupported');
    expect(report.startNodeId).toBeNull();
    expect(report.cycleTimeMinutes).toBeNull();
    expect(codes(report)).toContain('multiple-start-events');
  });
});
