import { describe, expect, it } from 'vitest';

import { findActiveTopic } from './active-topic';

describe('knowledge active topic', () => {
  it('does not highlight the previous article at a fractional anchor boundary', () => {
    expect(
      findActiveTopic(
        [
          { id: 'files', top: -1165.54, bottom: 100.17 },
          { id: 'image-trace', top: 100.17, bottom: 948.94 },
        ],
        { top: 100, bottom: 400 },
      ),
    ).toBe('image-trace');
  });

  it('uses the dominant article in the mobile reading area', () => {
    expect(
      findActiveTopic(
        [
          { id: 'previous', top: -500, bottom: 130 },
          { id: 'selected', top: 130, bottom: 900 },
        ],
        { top: 100, bottom: 610 },
      ),
    ).toBe('selected');
  });

  it('keeps the current article while the next has only just entered', () => {
    expect(
      findActiveTopic(
        [
          { id: 'current', top: -100, bottom: 380 },
          { id: 'next', top: 380, bottom: 800 },
        ],
        { top: 100, bottom: 400 },
      ),
    ).toBe('current');
    expect(findActiveTopic([], { top: 100, bottom: 400 })).toBeUndefined();
  });
});
