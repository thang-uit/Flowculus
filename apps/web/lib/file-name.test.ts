import { describe, expect, it } from 'vitest';
import { exportFileName, safeFileStem } from './file-name';
const at = new Date('2026-10-25T10:16:49.123Z');
describe('portable export naming', () => {
  it('uses a stable UTC pattern and descriptive artifact names across formats', () => {
    expect(exportFileName('Quy trình xử lý yêu cầu', 'model', 'flowculus.json', at)).toBe(
      'flowculus_quy-trinh-xu-ly-yeu-cau_model_20261025-101649Z.flowculus.json',
    );
    for (const artifact of [
      'nodes',
      'edges',
      'analysis',
      'diagram',
      'event-log',
    ] as const)
      expect(exportFileName('Đơn hàng', artifact, 'csv', at)).toBe(
        `flowculus_don-hang_${artifact}_20261025-101649Z.csv`,
      );
  });
  it('bounds user input and removes paths, existing suffixes and invalid extension input', () => {
    expect(exportFileName('../CON\\\\report.csv', 'event-log', 'csv', at)).toContain(
      '_con-report_event-log_',
    );
    expect(exportFileName('你好', 'model', 'flowculus.json', at)).toContain(
      '_process_model_',
    );
    expect(exportFileName('a'.repeat(200), 'diagram', 'svg', at).length).toBeLessThan(
      140,
    );
    expect(() => exportFileName('report', 'analysis', '../pdf', at)).toThrow(TypeError);
  });
});

describe('safeFileStem', () => {
  it('preserves Vietnamese names while removing path characters', () => {
    expect(safeFileStem('Phân tích / quy trình: tuần 3')).toBe(
      'Phân tích quy trình tuần 3',
    );
  });

  it('uses a fallback for an empty or reserved Windows name', () => {
    expect(safeFileStem('***', 'process')).toBe('process');
    expect(safeFileStem('CON')).toBe('_CON');
  });
});
