import { describe, expect, it } from 'vitest';
import { menuPosition } from './menu-navigation';
describe('menu viewport placement', () => {
  it('clamps the end-aligned panel within a narrow screen', () => {
    const position = menuPosition(
      { left: 280, right: 312, top: 10, bottom: 42 },
      240,
      500,
      { width: 320, height: 600 },
      'end',
    );
    expect(position.left).toBe(72);
    expect(position.top).toBe(48);
    expect(position.maxHeight).toBeLessThanOrEqual(550);
  });
  it('opens above the trigger when there is more usable space', () => {
    const position = menuPosition(
      { left: 8, right: 40, top: 550, bottom: 582 },
      240,
      200,
      { width: 320, height: 600 },
      'start',
    );
    expect(position.left).toBe(8);
    expect(position.top).toBe(344);
  });
});
