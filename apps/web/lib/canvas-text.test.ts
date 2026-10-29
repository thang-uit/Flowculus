import { describe, expect, it } from 'vitest';
import { wrapText } from './canvas-text';
const context = {
  measureText: (value: string) => ({ width: Array.from(value).length * 10 }),
} as CanvasRenderingContext2D;
describe('report text wrapping', () => {
  it('wraps long unbroken labels within the column without splitting surrogate pairs', () => {
    const source = '📦'.repeat(25);
    const lines = wrapText(context, source, 60);
    expect(lines.join('')).toBe(source);
    expect(lines.every((line) => context.measureText(line).width <= 60)).toBe(true);
    expect(lines).toHaveLength(5);
  });
  it('retains readable word boundaries around long IDs and handles empty text', () => {
    const lines = wrapText(context, 'Check ABCDEFGHIJKLMNOPQRST now', 60);
    expect(lines.every((line) => context.measureText(line).width <= 60)).toBe(true);
    expect(lines.join('').replaceAll(' ', '')).toBe('CheckABCDEFGHIJKLMNOPQRSTnow');
    expect(wrapText(context, ' ', 60)).toEqual(['']);
  });
});
