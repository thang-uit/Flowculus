import { describe, expect, it } from 'vitest';
import type { ProcessModel } from '@flowculus/process-model';

import {
  UnconfirmedSemanticsError,
  assertConfirmedModel,
  checkSemanticGate,
  collectUnconfirmedSemantics,
  confirmSemantics,
} from './index';

const inferredModel = (): ProcessModel => ({
  schemaVersion: 1,
  id: 'native',
  name: 'Native draw.io',
  metadata: { source: 'drawio' },
  nodes: {
    start: { id: 'start', label: 'Start', kind: 'start' },
    gw: {
      id: 'gw',
      label: 'Approved?',
      kind: 'gateway',
      gatewayKind: 'xor',
      metadata: {
        'flowculus-inferred-kind': true,
        'flowculus-inferred-gateway-kind': true,
      },
    },
    fix: {
      id: 'fix',
      label: 'Fix',
      kind: 'task',
      reworkProbability: 0.2,
      metadata: { 'flowculus-inferred-rework': true, source: 'process-mining' },
    },
    mystery: { id: 'mystery', label: 'Mystery', kind: 'unknown' },
    end: { id: 'end', label: 'End', kind: 'end' },
  },
  edges: {
    e1: {
      id: 'e1',
      source: 'start',
      target: 'gw',
      metadata: { 'flowculus-inferred-edge-kind': true },
    },
    e2: {
      id: 'e2',
      source: 'gw',
      target: 'fix',
      probability: 0.4,
      metadata: { 'flowculus-inferred-probability': true },
    },
    // A probability flag without a probability is not a pending decision.
    e3: {
      id: 'e3',
      source: 'gw',
      target: 'end',
      metadata: { 'flowculus-inferred-probability': true },
    },
    dangling: {
      id: 'dangling',
      source: 'gw',
      target: 'gone',
      metadata: { 'flowculus-inferred-edge-kind': true },
    },
  },
});

describe('semantic confirmation policy', () => {
  it('lists every unconfirmed node and edge semantic with stable codes', () => {
    const items = collectUnconfirmedSemantics(inferredModel());
    expect(items.map((item) => `${item.elementId}:${item.code}`)).toEqual([
      'gw:inferred-node-kind',
      'gw:inferred-gateway-kind',
      'fix:inferred-rework',
      'mystery:unknown-node-kind',
      'e1:inferred-edge-kind',
      'e2:inferred-edge-probability',
    ]);
    expect(items.find((item) => item.elementId === 'fix')?.origin).toBe('process-mining');
    expect(items.find((item) => item.elementId === 'gw')?.origin).toBe('drawio');
    expect(items.find((item) => item.code === 'unknown-node-kind')?.confirmable).toBe(
      false,
    );
    expect(items.find((item) => item.elementId === 'e2')?.label).toBe('Approved? → Fix');
  });

  it('blocks the gate until every item is resolved', () => {
    const gate = checkSemanticGate(inferredModel());
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.items).toHaveLength(6);
  });

  it('confirms one element and records the confirmation', () => {
    const confirmed = confirmSemantics(inferredModel(), [
      { elementType: 'node', elementId: 'gw' },
    ]);
    expect(confirmed.nodes.gw.metadata).toEqual({ 'flowculus-confirmed': true });
    expect(collectUnconfirmedSemantics(confirmed)).toHaveLength(4);
  });

  it('confirms only the requested codes of an element', () => {
    const confirmed = confirmSemantics(inferredModel(), [
      { elementType: 'node', elementId: 'gw', codes: ['inferred-gateway-kind'] },
    ]);
    expect(confirmed.nodes.gw.metadata).toEqual({
      'flowculus-inferred-kind': true,
      'flowculus-confirmed': true,
    });
  });

  it('confirm-all resolves everything except unknown types', () => {
    const confirmed = confirmSemantics(inferredModel());
    const remaining = collectUnconfirmedSemantics(confirmed);
    expect(remaining.map((item) => item.code)).toEqual(['unknown-node-kind']);
    const fixed = { ...confirmed, nodes: { ...confirmed.nodes } };
    fixed.nodes.mystery = { ...fixed.nodes.mystery, kind: 'task' };
    const gate = checkSemanticGate(fixed);
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(() => assertConfirmedModel(gate.model)).not.toThrow();
  });

  it('refuses a stale branded model at the lowest export layer', () => {
    const clean: ProcessModel = { ...inferredModel(), nodes: {}, edges: {} };
    const gate = checkSemanticGate(clean);
    expect(gate.ok).toBe(true);
    if (!gate.ok) return;
    const tampered = {
      ...gate.model,
      nodes: inferredModel().nodes,
    } as typeof gate.model;
    expect(() => assertConfirmedModel(tampered)).toThrow(UnconfirmedSemanticsError);
  });

  it('returns the same object when nothing needs confirmation', () => {
    const clean: ProcessModel = { ...inferredModel(), nodes: {}, edges: {} };
    expect(confirmSemantics(clean)).toBe(clean);
  });
});
