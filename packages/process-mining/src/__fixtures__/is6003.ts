import { createEventLog } from '../parse';
import { parseTimestamp } from '../timestamp';
import type { EventLog } from '../types';
/**
 * The event log published in the IS6003 report (Bảng 2), two feature cases
 * from Jira/Git. Activity names are harmonised (for example "Bàn giao & Kiểm
 * thử nội bộ" and "Bàn giao & Tester kiểm thử" are the same step), which is the
 * usual pre-processing before discovery; times are the report's local times.
 */
const IS6003_EVENTS: Array<[string, string, string, string, string]> = [
  [
    'FEAT_301',
    'Phân tích yêu cầu',
    '2026-10-01 08:30',
    '2026-10-01 17:00',
    'Nguyễn Văn An (BA)',
  ],
  [
    'FEAT_301',
    'Lập trình API Backend',
    '2026-10-02 08:00',
    '2026-10-05 17:00',
    'Trịnh Thuận Huê (Backend)',
  ],
  [
    'FEAT_301',
    'Lập trình giao diện Mobile',
    '2026-10-06 08:30',
    '2026-10-08 17:30',
    'Chu Nam Thắng (Mobile)',
  ],
  [
    'FEAT_301',
    'Bàn giao & Kiểm thử nội bộ',
    '2026-10-09 08:30',
    '2026-10-10 11:30',
    'Lê Thị Lan (Tester)',
  ],
  [
    'FEAT_301',
    'Sửa lỗi nội bộ',
    '2026-10-10 11:30',
    '2026-10-11 12:00',
    'Backend & Mobile',
  ],
  [
    'FEAT_301',
    'Tester kiểm tra lại',
    '2026-10-11 13:00',
    '2026-10-11 17:00',
    'Lê Thị Lan (Tester)',
  ],
  [
    'FEAT_301',
    'BA gửi mail UAT',
    '2026-10-12 08:30',
    '2026-10-12 11:30',
    'Nguyễn Văn An (BA)',
  ],
  [
    'FEAT_301',
    'Khách hàng UAT',
    '2026-10-12 14:00',
    '2026-10-14 16:00',
    'Đại diện Khách hàng',
  ],
  [
    'FEAT_302',
    'Phân tích yêu cầu',
    '2026-10-03 08:30',
    '2026-10-03 17:00',
    'Nguyễn Văn An (BA)',
  ],
  [
    'FEAT_302',
    'Lập trình API Backend',
    '2026-10-04 08:00',
    '2026-10-07 17:00',
    'Trịnh Thuận Huê (Backend)',
  ],
  [
    'FEAT_302',
    'Lập trình giao diện Mobile',
    '2026-10-08 08:30',
    '2026-10-10 16:00',
    'Chu Nam Thắng (Mobile)',
  ],
  [
    'FEAT_302',
    'Bàn giao & Kiểm thử nội bộ',
    '2026-10-11 08:30',
    '2026-10-12 12:00',
    'Lê Thị Lan (Tester)',
  ],
  [
    'FEAT_302',
    'BA gửi mail UAT',
    '2026-10-12 13:30',
    '2026-10-12 16:30',
    'Nguyễn Văn An (BA)',
  ],
  [
    'FEAT_302',
    'Khách hàng UAT',
    '2026-10-13 09:00',
    '2026-10-15 15:00',
    'Đại diện Khách hàng',
  ],
  [
    'FEAT_302',
    'Sửa lỗi UAT & Khách duyệt',
    '2026-10-15 16:00',
    '2026-10-17 17:00',
    'Toàn bộ nhóm & Khách hàng',
  ],
];

export const is6003Log = (): EventLog =>
  createEventLog(
    'IS6003 software delivery',
    IS6003_EVENTS.map(([caseId, activity, start, complete, resource]) => ({
      caseId,
      activity,
      startTime: parseTimestamp(start) ?? undefined,
      completeTime: parseTimestamp(complete) ?? 0,
      resource,
    })),
  );
