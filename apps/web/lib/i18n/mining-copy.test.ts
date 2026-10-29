import { describe, expect, it } from 'vitest';

import { getMiningConclusionsCopy } from './mining-conclusions-copy';
import { getMiningDataCopy } from './mining-data-copy';

describe('mining copy', () => {
  it('uses English singular nouns for one event, case and activity', () => {
    const copy = getMiningDataCopy('en');

    expect(copy.eventCount(1, '1')).toBe('1 event');
    expect(copy.caseCount(1, '1')).toBe('1 case');
    expect(copy.activityCount(1, '1')).toBe('1 activity');
    expect(copy.eventCount(2, '2')).toBe('2 events');
    expect(copy.caseCount(2, '2')).toBe('2 cases');
    expect(copy.activityCount(2, '2')).toBe('2 activities');
  });

  it('keeps Vietnamese count labels stable', () => {
    const copy = getMiningDataCopy('vi');

    expect(copy.eventCount(1, '1')).toBe('1 sự kiện');
    expect(copy.caseCount(2, '2')).toBe('2 ca');
    expect(copy.activityCount(3, '3')).toBe('3 hoạt động');
  });

  it('writes singular English conclusions as complete sentences', () => {
    const copy = getMiningConclusionsCopy('en');

    expect(copy.overview('1', '1', '1', '1')).toContain(
      '1 case, 1 event, 1 activity and 1 named resource',
    );
    expect(copy.petri('1')).toContain('1 reachable marking');
    expect(copy.skipped('1', '1', '1')).toContain(
      '1 row was omitted. There is 1 invalid completion timestamp and 1 invalid start timestamp.',
    );
    expect(copy.compared('Reference', '1', '1', '0')).toContain(
      '1/1 examined case follows a complete valid route.',
    );
  });
});
