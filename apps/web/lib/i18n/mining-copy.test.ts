import { describe, expect, it } from 'vitest';

import { getMiningConclusionsCopy } from './mining-conclusions-copy';
import { getWorkspaceCopy } from '.';
import { getMiningDataCopy } from './mining-data-copy';

describe('mining copy', () => {
  it('uses singular review counts', () => {
    expect(getWorkspaceCopy('en').miningImport.accepted(1, 1)).toBe(
      '1 accepted event across 1 case.',
    );
    expect(getWorkspaceCopy('en').miningImport.accepted(2, 2)).toBe(
      '2 accepted events across 2 cases.',
    );
  });
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

    expect(copy.skipped('1', '1', '1')).toContain(
      '1 row was omitted. There is 1 invalid completion timestamp and 1 invalid start timestamp.',
    );
  });
});
