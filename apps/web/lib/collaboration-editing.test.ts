import { describe, it, expect } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import { validateModelStructure } from '@flowculus/validation';
import {
  serializeFlowculusFile,
  parseFlowculusFile,
  processModelToCsv,
  parseProcessCsv,
} from '@flowculus/file-formats';
import { importDrawioXml, exportDrawioXml } from '@flowculus/drawio-adapter';
import { deliveryModel } from '../../../packages/process-mining/src/__fixtures__/software-delivery';
import {
  addPool,
  addLane,
  removeContainer,
  applyCollaborationPositions,
  nudgeCollaboration,
  resizeContainer,
} from './collaboration-editing';
import {
  makeCanvasClipboard,
  parseCanvasClipboard,
  pasteCanvasClipboard,
} from './canvas-clipboard';
import { toFlowNodes, absoluteCanvasPositions } from './canvas-flow';
import { arrangeLanes, orderedLanes } from './lane-arrangement';

describe('collaboration preservation', () => {
  it('keeps every analytic number when wrapping an existing single process', () => {
    const model = deliveryModel();
    const flat = {
      ...model,
      containers: undefined,
      nodes: Object.fromEntries(
        Object.entries(model.nodes).map(([id, node]) => [
          id,
          { ...node, poolId: undefined, laneId: undefined },
        ]),
      ),
    };
    const before = analyzeProcess(flat);
    const wrapped = addPool(flat, 'Organisation');
    const pooled = addLane(wrapped, Object.keys(wrapped.containers ?? {})[0], 'Owner');
    expect(
      Object.values(pooled.containers ?? {}).filter((item) => item.kind === 'lane'),
    ).toHaveLength(1);
    const after = analyzeProcess(pooled);
    expect(after.cycleTimeMinutes).toBe(before.cycleTimeMinutes);
    expect(after.theoreticalCycleTimeMinutes).toBe(before.theoreticalCycleTimeMinutes);
  });
  it('round-trips frames through file version 2 and still accepts version 1', () => {
    const model = deliveryModel();
    const restored = parseFlowculusFile(
      serializeFlowculusFile({ schemaVersion: 2, model }),
    );
    expect(validateModelStructure(restored.model).diagnostics).toEqual([]);
    expect(restored.model.containers).toEqual(model.containers);
    expect(() =>
      parseFlowculusFile(
        JSON.stringify({
          schemaVersion: 1,
          model: { schemaVersion: 1, id: 'old', name: 'Legacy', nodes: {}, edges: {} },
        }),
      ),
    ).not.toThrow();
  });
  it('round-trips actual pool/lane membership through draw.io and CSV', async () => {
    const model = deliveryModel();
    const xml = await exportDrawioXml(model);
    const restored = await importDrawioXml(xml);
    expect(restored.model.nodes.backend.poolId).toBe('team');
    expect(restored.model.nodes.backend.laneId).toBe('lane_be');
    expect(restored.model.nodes.backend.bounds).toEqual(model.nodes.backend.bounds);
    expect(analyzeProcess(restored.model).cycleTimeMinutes).toBe(
      analyzeProcess(model).cycleTimeMinutes,
    );
    const csv = parseProcessCsv(processModelToCsv(model));
    expect(validateModelStructure(csv).diagnostics).toEqual([]);
    expect(csv.containers).toEqual(model.containers);
    expect(csv.nodes.backend.laneId).toBe('lane_be');
  });
  it('copies a complete pool with fresh identities and no stale joins', () => {
    const model = deliveryModel();
    const payload = makeCanvasClipboard(model, ['team']);
    expect(payload).not.toBeNull();
    const parsed = parseCanvasClipboard(JSON.stringify(payload));
    expect(parsed).not.toBeNull();
    const pasted = pasteCanvasClipboard(model, parsed!, 36);
    expect(pasted).not.toBeNull();
    expect(validateModelStructure(pasted!.model).diagnostics).toEqual([]);
    expect(Object.keys(pasted!.model.nodes)).toHaveLength(
      Object.keys(model.nodes).length * 2,
    );
    expect(
      parseCanvasClipboard(JSON.stringify({ ...payload, containers: {} })),
    ).toBeNull();
  });
  it('moving a pool keeps absolute child coordinates and waypoint translation consistent', () => {
    const model = deliveryModel();
    const flow = toFlowNodes(model, new Set(), new Set()).map((node) =>
      node.id === 'team' ? { ...node, position: { x: 100, y: 80 } } : node,
    );
    const moved = applyCollaborationPositions(model, absoluteCanvasPositions(flow));
    expect(moved).not.toBeNull();
    expect(moved!.nodes.backend.bounds!.x).toBe(model.nodes.backend.bounds!.x + 100);
    expect(analyzeProcess(moved!).cycleTimeMinutes).toBe(
      analyzeProcess(model).cycleTimeMinutes,
    );
  });
  it('removing a lane keeps all steps and the owning pool', () => {
    const model = deliveryModel();
    const next = removeContainer(model, 'lane_be');
    expect(next.nodes.backend.poolId).toBe('team');
    expect(next.nodes.backend.laneId).toBeUndefined();
    expect(Object.keys(next.nodes)).toEqual(Object.keys(model.nodes));
  });
  it('nudges a pool and selected children once and preserves the analysis', () => {
    const model = deliveryModel();
    const moved = nudgeCollaboration(model, ['team', 'backend'], 10, -10)!;
    expect(moved.nodes.backend.bounds!.x).toBe(model.nodes.backend.bounds!.x + 10);
    expect(moved.containers!.lane_be.bounds.y).toBe(
      model.containers!.lane_be.bounds.y - 10,
    );
    expect(analyzeProcess(moved).cycleTimeMinutes).toBe(387);
    expect(nudgeCollaboration(model, ['backend'], 10000, 0)).toBeNull();
  });
  it('rejects lane resizing outside its pool or over an adjacent lane', () => {
    const model = deliveryModel();
    const lane = model.containers!.lane_be;
    expect(
      resizeContainer(model, lane.id, { ...lane.bounds, width: lane.bounds.width + 1 }),
    ).toBe(model);
    expect(
      resizeContainer(model, lane.id, {
        ...lane.bounds,
        height: lane.bounds.height + 10,
      }),
    ).toBe(model);
    expect(resizeContainer(model, lane.id, { ...lane.bounds, width: NaN })).toBe(model);
  });
  it('copies one lane portably without copying other lane tasks', () => {
    const model = deliveryModel();
    const payload = parseCanvasClipboard(
      JSON.stringify(makeCanvasClipboard(model, ['lane_be'])),
    )!;
    expect(payload.nodes.map((node) => node.id)).toEqual(['backend', 'fix']);
    const empty = {
      schemaVersion: 1 as const,
      id: 'blank',
      name: 'Blank',
      nodes: {},
      edges: {},
    };
    const pasted = pasteCanvasClipboard(empty, payload, 36)!;
    expect(validateModelStructure(pasted.model).diagnostics).toEqual([]);
    expect(
      Object.values(pasted.model.containers!).filter((item) => item.kind === 'pool')[0]
        .processId,
    ).not.toBe(model.containers!.team.processId);
  });
  it('keeps an empty pool copyable without inventing executable steps', () => {
    const model = addPool(
      { schemaVersion: 1, id: 'empty', name: 'Empty', nodes: {}, edges: {} },
      'Participant',
    );
    const payload = parseCanvasClipboard(
      JSON.stringify(makeCanvasClipboard(model, Object.keys(model.containers!))),
    )!;
    expect(payload).not.toBeNull();
    expect(
      Object.keys(pasteCanvasClipboard(model, payload, 36)!.model.containers!),
    ).toHaveLength(2);
  });
  it('keeps lane management order aligned with horizontal and vertical geometry', () => {
    const model = deliveryModel();
    const order = orderedLanes(model, 'team')
      .map((lane) => lane.id)
      .reverse();
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const arranged = arrangeLanes(model, 'team', order, orientation);
      expect(orderedLanes(arranged, 'team').map((lane) => lane.id)).toEqual(order);
      expect(analyzeProcess(arranged).cycleTimeMinutes).toBe(387);
    }
  });
});
