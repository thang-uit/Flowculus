import type { Locale } from './types';
const plural = (value: string, singular: string, pluralForm = `${singular}s`) =>
  `${value} ${value === '1' ? singular : pluralForm}`;
const EN = {
  title: 'Conclusions',
  empty: 'Upload an event log and confirm its columns to see the report here.',
  loading: 'Analysing the event log… The report will appear when processing finishes.',
  failed: 'The analysis could not finish. Check the source panel and retry the upload.',
  skipped: (rows: string, timestamps: string, starts: string) =>
    `${plural(rows, 'row')} ${rows === '1' ? 'was' : 'were'} omitted. There ${timestamps === '1' ? 'is' : 'are'} ${plural(timestamps, 'invalid completion timestamp')} and ${plural(starts, 'invalid start timestamp')}. Check the source data before drawing conclusions.`,
};
const VI: typeof EN = {
  title: 'Kết luận',
  empty: 'Tải nhật ký sự kiện lên và xác nhận các cột để xem báo cáo tại đây.',
  loading: 'Đang phân tích nhật ký… Báo cáo sẽ xuất hiện khi xử lý hoàn tất.',
  failed: 'Chưa hoàn tất phân tích. Hãy kiểm tra vùng nhật ký và thử tải lại.',
  skipped: (rows, timestamps, starts) =>
    `Đã bỏ ${rows} dòng không dùng được. Có ${timestamps} thời điểm hoàn thành và ${starts} giờ bắt đầu không hợp lệ. Hãy kiểm tra dữ liệu gốc trước khi đưa ra kết luận.`,
};
export const getMiningConclusionsCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
