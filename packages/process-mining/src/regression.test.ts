import { describe, expect, it } from 'vitest';
import { is6003Log } from './__fixtures__/is6003';
import { analyzeProcess } from '@flowculus/analysis-engine';

import {
  MINING_PRESETS,
  dfgToProcessModel,
  discoverProcess,
  generatePresetLog,
} from './index';

/**
 * Pinned results of the bundled presets (minutes). They were identical
 * before and after the join-resolution and cycle-time-contract hardening; a
 * change here must be a deliberate, documented behaviour change.
 */
const PINNED: Record<string, { ct: number; tct: number; cte: number; cost: number }> = {
  'order-to-cash': {
    ct: 18304.76687993502,
    tct: 153.27651271722598,
    cte: 0.00837358452705791,
    cost: 87.41445743804883,
  },
  'procure-to-pay': {
    ct: 17829.077457999403,
    tct: 180.2656119989608,
    cte: 0.010110764980612091,
    cost: 94.5896519994819,
  },
  'it-service-desk': {
    ct: 2000.5212784403554,
    tct: 213.23474876933798,
    cte: 0.1065895929562818,
    cost: 77.97216124659425,
  },
  'is6003-delivery': { ct: 19920, tct: 16005, cte: 0.8034638554216867, cost: 0 },
};

describe('preset regression pins', () => {
  MINING_PRESETS.forEach((preset) => {
    it(`${preset.id} keeps its cycle-time results`, () => {
      const log = generatePresetLog(preset.id);
      const { model } = dfgToProcessModel(discoverProcess(log).dfg, {
        name: log.name,
        hasStartTimes: log.hasStartTimes,
      });
      const report = analyzeProcess(model);
      const pinned = PINNED[preset.id];
      expect(report.quality).toBe('assumption');
      expect(report.cycleTimeMinutes).toBeCloseTo(pinned.ct, 6);
      expect(report.theoreticalCycleTimeMinutes).toBeCloseTo(pinned.tct, 6);
      expect(report.cycleTimeEfficiency).toBeCloseTo(pinned.cte, 9);
      expect(report.costPerExecution).toBeCloseTo(pinned.cost, 6);
    });
  });
});

it('retains the retired report log as a test fixture outside the runtime presets', () => {
  const log = is6003Log();
  const { model } = dfgToProcessModel(discoverProcess(log).dfg, {
    name: log.name,
    hasStartTimes: log.hasStartTimes,
  });
  const report = analyzeProcess(model);
  const pin = PINNED['is6003-delivery'];
  expect(report.cycleTimeMinutes).toBeCloseTo(pin.ct, 6);
  expect(report.theoreticalCycleTimeMinutes).toBeCloseTo(pin.tct, 6);
  expect(report.cycleTimeEfficiency).toBeCloseTo(pin.cte, 9);
});
