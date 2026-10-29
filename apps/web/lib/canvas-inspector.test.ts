import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectCanvasElement } from './canvas-inspector';
import { useWorkspaceStore } from './workspace-store';
import type { ProcessModel } from '@flowculus/process-model';

const click = { shiftKey: false, metaKey: false, ctrlKey: false };
const model: ProcessModel = {
  schemaVersion: 1,
  id: 'inspector',
  name: 'Inspector test',
  nodes: {
    a: { id: 'a', kind: 'task', label: 'A', processingMinutes: 120 },
    b: { id: 'b', kind: 'task', label: 'B', processingMinutes: 60 },
  },
  edges: { flow: { id: 'flow', source: 'a', target: 'b' } },
};
beforeEach(() => {
  useWorkspaceStore.setState({
    processModel: model,
    selectedNodeIds: [],
    selectedEdgeId: null,
    inspectorOpen: false,
    activeTool: 'select',
  });
});
afterEach(() => vi.unstubAllGlobals());
describe('explicit canvas inspection', () => {
  it('leaves quick actions, inline fields and connector handles to their own handlers', () => {
    class Control {
      closest = () => this;
    }
    vi.stubGlobal('Element', Control);
    useWorkspaceStore.getState().setSelection({ nodeIds: ['b'], edgeId: null });
    inspectCanvasElement(
      { ...click, target: new Control() as unknown as EventTarget },
      'node',
      'a',
    );
    expect(useWorkspaceStore.getState().selectedNodeIds).toEqual(['b']);
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(false);
  });
  it('opens the selected task and reopens it after the panel was dismissed', () => {
    inspectCanvasElement(click, 'node', 'a');
    expect(useWorkspaceStore.getState().selectedNodeIds).toEqual(['a']);
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(true);
    useWorkspaceStore.getState().setInspectorOpen(false);
    inspectCanvasElement(click, 'node', 'a');
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(true);
    inspectCanvasElement(click, 'node', 'b');
    expect(useWorkspaceStore.getState().selectedNodeIds).toEqual(['b']);
  });
  it('opens a connector and clears the previously selected task', () => {
    inspectCanvasElement(click, 'node', 'a');
    inspectCanvasElement(click, 'edge', 'flow');
    expect(useWorkspaceStore.getState().selectedNodeIds).toEqual([]);
    expect(useWorkspaceStore.getState().selectedEdgeId).toBe('flow');
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(true);
  });
  it('keeps drag, marquee and cleared selection passive', () => {
    useWorkspaceStore.getState().setSelection({ nodeIds: ['a'], edgeId: null });
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(false);
    useWorkspaceStore.getState().setSelection({ nodeIds: [], edgeId: null });
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(false);
  });
  it.each(['shiftKey', 'metaKey', 'ctrlKey'] as const)(
    'preserves multi-selection with %s',
    (key) => {
      useWorkspaceStore.getState().setSelection({ nodeIds: ['a', 'b'], edgeId: null });
      inspectCanvasElement({ ...click, [key]: true }, 'node', 'a');
      expect(useWorkspaceStore.getState().selectedNodeIds).toEqual(['a', 'b']);
      expect(useWorkspaceStore.getState().inspectorOpen).toBe(false);
    },
  );
  it('ignores pan mode and elements that no longer exist', () => {
    useWorkspaceStore.getState().setActiveTool('hand');
    inspectCanvasElement(click, 'node', 'a');
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(false);
    useWorkspaceStore.getState().setActiveTool('select');
    inspectCanvasElement(click, 'node', 'missing');
    expect(useWorkspaceStore.getState().inspectorOpen).toBe(false);
  });
});
