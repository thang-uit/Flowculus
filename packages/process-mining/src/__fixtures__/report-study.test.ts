import { expect, it } from 'vitest';
import { analyzeProcess } from '@flowculus/analysis-engine';
import { alignmentConformance } from '../alignment-conformance';
import { discoverProcess } from '../discovery-session';
import { createDurationClock, DEFAULT_WORK_CALENDAR } from '../business-calendar';
import { studyLog, studyModel, STUDY_CALENDAR, studyViolationLog } from './report-study';
it('reproduces the declared working-time study without weekend/overtime work', () => {
  const clock = createDurationClock(STUDY_CALENDAR);
  for (const variant of ['as-is', 'to-be'] as const) {
    const model = studyModel(variant),
      log = studyLog(variant),
      report = analyzeProcess(model);
    const discovery = discoverProcess(log, undefined, STUDY_CALENDAR);
    expect(report.cycleTimeMinutes! / 60).toBeCloseTo(variant === 'as-is' ? 101.2 : 49.6);
    expect(discovery.stats.meanLeadTimeMs / 3600000).toBeCloseTo(
      report.cycleTimeMinutes! / 60,
    );
    expect(alignmentConformance(log, model).compatibleCases).toBe(20);
    for (const event of log.events) {
      expect(clock(event.startTime!, event.completeTime)).toBeGreaterThanOrEqual(0);
      for (const at of [event.startTime!, event.completeTime]) {
        const d = new Date(at + 420 * 60000);
        expect(d.getUTCDay()).toBeGreaterThanOrEqual(1);
        expect(d.getUTCDay()).toBeLessThanOrEqual(5);
        const m = d.getUTCHours() * 60 + d.getUTCMinutes();
        expect((m >= 480 && m <= 720) || (m >= 780 && m <= 1020)).toBe(true);
      }
    }
  }
  expect(
    alignmentConformance(studyViolationLog(), studyModel('to-be')).compatibleCases,
  ).toBe(1);
  expect(DEFAULT_WORK_CALENDAR.weekdays).toHaveLength(5);
});
