import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DISCOVERY_FILTER,
  DEFAULT_WORK_CALENDAR,
} from '@flowculus/process-mining';
import { createMiningSession } from './mining-engine';
import { getMiningRediscoveryRequest } from './mining-rediscovery';
import { useMiningStore } from './mining-store';

const source = 'caseId,activity,timestamp\n1,Review,2026-10-05T08:00:00Z';
const mapping = { caseId: 'caseId', activity: 'activity', timestamp: 'timestamp' };

function load(name: string) {
  const worker = createMiningSession();
  worker({ type: 'inspect-file', fileName: name, source });
  const response = worker({
    type: 'apply-mapping',
    mapping,
    name,
    filter: DEFAULT_DISCOVERY_FILTER,
  });
  if (response.type !== 'discovery') throw new Error('Expected discovery');
  useMiningStore
    .getState()
    .setResult(response, { kind: 'file', fileName: name, source, mapping });
  return worker;
}

beforeEach(() => {
  useMiningStore.setState(useMiningStore.getInitialState(), true);
  load('original.csv');
});

describe('deferred Mining rediscovery', () => {
  it('does not issue duplicate discovery for controls already applied', () => {
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
  });

  it('waits for replacement file reading and then applies the latest filters to the new source', () => {
    useMiningStore.getState().setStatus('loading');
    useMiningStore.getState().setFilter({ minEdgeShare: 0.2 });
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
    useMiningStore.getState().setFilter({ minEdgeShare: 0.8 });
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
    const worker = load('replacement.csv');
    const request = getMiningRediscoveryRequest(useMiningStore.getState());
    expect(request?.filter.minEdgeShare).toBe(0.8);
    expect(useMiningStore.getState().replay).toMatchObject({
      fileName: 'replacement.csv',
    });
    if (!request) throw new Error('Expected deferred discovery');
    const response = worker(request);
    if (response.type !== 'discovery') throw new Error('Expected discovery');
    useMiningStore.getState().setResult(response);
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
  });

  it('does not run against a source awaiting inspection or column mapping', () => {
    useMiningStore.getState().setFilter({ minActivityShare: 0.5 });
    useMiningStore.getState().queueUpload({ fileName: 'next.csv', source });
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
    useMiningStore.getState().takePendingUpload();
    const table = createMiningSession()({
      type: 'inspect-file',
      fileName: 'next.csv',
      source,
    });
    if (table.type !== 'table') throw new Error('Expected table');
    useMiningStore.getState().setMappingTable({ ...table, source });
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
    useMiningStore.getState().setMappingTable(null);
    expect(
      getMiningRediscoveryRequest(useMiningStore.getState())?.filter.minActivityShare,
    ).toBe(0.5);
  });

  it('applies calendar changes after loading completes', () => {
    const policy = {
      basis: 'working' as const,
      calendar: structuredClone(DEFAULT_WORK_CALENDAR),
    };
    useMiningStore.getState().setStatus('loading');
    useMiningStore.getState().setTimePolicy(policy);
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
    useMiningStore.getState().setStatus('ready');
    expect(getMiningRediscoveryRequest(useMiningStore.getState())?.timePolicy).toEqual(
      policy,
    );
  });

  it('does not revive a cleared or failed session', () => {
    useMiningStore.getState().setFilter({ minEdgeShare: 0.5 });
    useMiningStore.getState().setStatus('error', 'failure');
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
    useMiningStore.getState().abortSession(null);
    expect(getMiningRediscoveryRequest(useMiningStore.getState())).toBeNull();
  });
});
