import { describe, expect, it } from 'vitest';
import {
  assertReportTextBudget,
  MAX_REPORT_IMAGE_HEIGHT,
  MAX_REPORT_TEXT_CHARACTERS,
  reportImageLayout,
  ReportImageTooLargeError,
} from './report-image-layout';

describe('report bitmap layout', () => {
  it('reserves space for all note rows and the footer after a tall diagram', () => {
    const layout = reportImageLayout(680, 12, 8);
    const finalNoteBaseline = layout.notesTop + 36 + 7 * 32;
    expect(finalNoteBaseline).toBeLessThan(layout.height - 76);
    expect(layout.formulaTop + 12 * 32 + 44).toBeLessThan(layout.notesTop);
    expect(layout.width * layout.height).toBeLessThanOrEqual(8_000_000);
  });
  it('moves the diagram and sections below a wrapped title', () => {
    const one = reportImageLayout(400, 3, 0),
      three = reportImageLayout(400, 3, 0, 3);
    expect(three.diagramY - one.diagramY).toBe(88);
    expect(three.metricsTop - one.metricsTop).toBe(88);
    expect(three.notesTop - one.notesTop).toBe(88);
  });
  it('rejects unreadable overlong reports before allocating a large bitmap', () => {
    expect(() => reportImageLayout(680, 200, 8)).toThrow(ReportImageTooLargeError);
    expect(() =>
      assertReportTextBudget(['x'.repeat(MAX_REPORT_TEXT_CHARACTERS), 'x']),
    ).toThrow(ReportImageTooLargeError);
    for (let lines = 0; lines < 100; lines++) {
      const layout = reportImageLayout(680, lines, 3);
      expect(layout.height).toBeLessThanOrEqual(MAX_REPORT_IMAGE_HEIGHT);
      expect(layout.width * layout.height).toBeLessThanOrEqual(8_000_000);
    }
  });
  it('refuses non-finite or negative dimensions', () => {
    expect(() => reportImageLayout(NaN, 1, 1)).toThrow();
    expect(() => reportImageLayout(400, -1, 1)).toThrow();
    expect(() => reportImageLayout(400, 1, 1, 0)).toThrow();
  });
});
