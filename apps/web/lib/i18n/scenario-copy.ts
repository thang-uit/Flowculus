import type { Locale } from './types';
const EN = {
  title: 'Compare process scenarios',
  hint: 'Analytical comparison of two open models. Time is in minutes, CTE is a ratio. Relative change = (candidate − baseline) / |baseline|. A zero baseline has no percentage. Check that assumptions, currency and scope match; this is not measured deployment impact.',
  close: 'Close',
  before: 'Baseline',
  after: 'Candidate',
  choose: 'Choose an open process',
  run: 'Compare',
  metric: 'Metric',
  change: 'Relative change',
  metrics: [
    'Cycle time (min)',
    'Theoretical cycle time (min)',
    'CTE (ratio)',
    'Cost per execution',
  ],
  export: 'Export comparison JSON',
  error:
    'The comparison could not complete. Confirm model semantics and review the process inputs.',
};
const VI: typeof EN = {
  title: 'So sánh kịch bản quy trình',
  hint: 'So sánh giải tích hai mô hình đang mở. Thời gian tính bằng phút, CTE là tỉ lệ. Thay đổi tương đối = (kịch bản − gốc) / |gốc|. Gốc bằng 0 thì không có phần trăm. Cần cùng giả định, tiền tệ và phạm vi; đây chưa phải hiệu quả triển khai đo thực tế.',
  close: 'Đóng',
  before: 'Mô hình gốc',
  after: 'Kịch bản',
  choose: 'Chọn quy trình đang mở',
  run: 'So sánh',
  metric: 'Chỉ số',
  change: 'Thay đổi tương đối',
  metrics: ['CT (phút)', 'TCT (phút)', 'CTE (tỉ lệ)', 'Chi phí mỗi lần chạy'],
  export: 'Xuất JSON so sánh',
  error: 'Chưa hoàn tất so sánh. Hãy xác nhận ngữ nghĩa và kiểm tra dữ liệu quy trình.',
};
export const getScenarioCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
