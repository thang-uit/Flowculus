import type { Locale } from '@/lib/i18n';

/**
 * The analysis packages deliberately return plain, locale-neutral diagnostics
 * so they remain usable in a worker and in non-React consumers. This adapter
 * translates the stable messages at the presentation boundary while keeping
 * user-provided node labels intact.
 */
export const localizeAnalysisMessage = (message: string, locale: Locale): string => {
  if (locale === 'en') return message;

  const translations: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [
      /^Task (.+) has no cycle time; 0 minutes was used\.$/,
      (match) => `Hoạt động ${match[1]} chưa có thời gian chu trình; đã dùng 0 phút.`,
    ],
    [
      /^Theoretical time for (.+) uses its cycle time because processing time is missing\.$/,
      (match) =>
        `Thời gian lý thuyết của ${match[1]} dùng thời gian chu trình vì chưa có thời gian xử lý.`,
    ],
    [
      /^Task (.+) has no cost metadata; its cost contribution is 0\.$/,
      (match) =>
        `Hoạt động ${match[1]} chưa có thông tin chi phí; đóng góp chi phí là 0.`,
    ],
    [
      /^Node (.+) processing time cannot exceed its cycle time\.$/,
      (match) => `Nút ${match[1]} có thời gian xử lý vượt thời gian chu trình.`,
    ],
    [
      /^Node (.+) waiting time cannot exceed its cycle time\.$/,
      (match) => `Nút ${match[1]} có thời gian chờ vượt thời gian chu trình.`,
    ],
    [
      /^Node (.+) processing and waiting time cannot exceed its cycle time together\.$/,
      (match) =>
        `Tổng thời gian xử lý và thời gian chờ của nút ${match[1]} không được vượt thời gian chu trình.`,
    ],
    [
      /^Edge (.+) has an edge-level rework probability; identify the rework block explicitly or use simulation\.$/,
      (match) =>
        `Cạnh ${match[1]} có xác suất làm lại ở cấp cạnh; hãy khai báo rõ khối làm lại hoặc dùng mô phỏng.`,
    ],
    [
      /^Capacity for (.+) assumes one resource because no pool size was provided\.$/,
      (match) =>
        `Năng lực của nhóm ${match[1]} đang giả định 1 nguồn lực vì chưa nhập quy mô nhóm.`,
    ],
    [
      /^Resource pool (.+) is at or above theoretical capacity\.$/,
      (match) => `Nhóm nguồn lực ${match[1]} đang ở hoặc vượt năng lực lý thuyết.`,
    ],
    [
      /^OR gateway (.+) has too many or incomplete branch probabilities; simulation is recommended\.$/,
      (match) =>
        `Gateway OR ${match[1]} có quá nhiều nhánh hoặc thiếu xác suất; nên dùng mô phỏng.`,
    ],
    [
      /^Gateway (.+) needs an explicit block type before exact flow analysis can be trusted\.$/,
      (match) =>
        `Gateway ${match[1]} cần khai báo loại khối rõ ràng trước khi tin cậy phân tích luồng chính xác.`,
    ],
    [
      /^Cycle detected at (.+); the numeric result uses fixed-point iteration\.$/,
      (match) =>
        `Phát hiện chu trình tại ${match[1]}; kết quả số dùng phép lặp điểm cố định.`,
    ],
    [
      /^(XOR|AND|OR) gateway (.+) has no common join; block flow analysis is not exact\.$/,
      (match) =>
        `Gateway ${match[1]} ${match[2]} không có điểm hợp nhất chung; phân tích khối không hoàn toàn chính xác.`,
    ],
    [
      /^The graph did not converge under the finite expected-value model\. Use simulation for a dependable estimate\.$/,
      () =>
        'Đồ thị không hội tụ theo mô hình giá trị kỳ vọng hữu hạn. Hãy dùng mô phỏng để có ước lượng đáng tin cậy.',
    ],
    [
      /^Semantic type for (.+) was inferred from its draw\.io shape and should be confirmed\.$/,
      (match) =>
        `Loại ngữ nghĩa của ${match[1]} được suy ra từ hình draw.io và cần được xác nhận.`,
    ],
    [
      /^Gateway type for (.+) was inferred from its draw\.io shape and should be confirmed\.$/,
      (match) =>
        `Loại gateway của ${match[1]} được suy ra từ hình draw.io và cần được xác nhận.`,
    ],
    [
      /^Edge (.+) references a missing source node\.$/,
      (match) => `Cạnh ${match[1]} tham chiếu đến nút nguồn không tồn tại.`,
    ],
    [
      /^Edge (.+) references a missing target node\.$/,
      (match) => `Cạnh ${match[1]} tham chiếu đến nút đích không tồn tại.`,
    ],
    [
      /^(XOR|OR) gateway (.+) needs a probability on every outgoing connector\.$/,
      (match) => `Gateway ${match[1]} ${match[2]} cần xác suất trên mọi connector đi ra.`,
    ],
    [
      /^XOR gateway (.+) probabilities must sum to 1 \(received (.+)\)\.$/,
      (match) =>
        `Tổng xác suất của gateway XOR ${match[1]} phải bằng 1 (hiện nhận ${match[2]}).`,
    ],
    [
      /^Add one start event or a node with no incoming connector\.$/,
      () => 'Thêm một sự kiện bắt đầu hoặc một nút không có connector đi vào.',
    ],
    [
      /^Add process nodes and connectors to begin analysis\.$/,
      () => 'Thêm nút quy trình và connector để bắt đầu phân tích.',
    ],
    [
      /^Little's Law needs an arrival rate greater than zero before WIP can be converted to cycle time\.$/,
      () =>
        'Định luật Little cần tốc độ đến lớn hơn 0 trước khi chuyển WIP thành thời gian chu trình.',
    ],
    [
      /^The configured queue is unstable; use a higher service rate or more servers\.$/,
      () =>
        'Hàng đợi đã cấu hình không ổn định; hãy tăng tốc độ phục vụ hoặc số nguồn phục vụ.',
    ],
    [
      /^Analysis options contain invalid values\.$/,
      () => 'Các giá trị thiết lập phân tích không hợp lệ.',
    ],
    [
      /^Some semantic types were inferred from native draw\.io shapes; confirm them in Inspector before sharing an exact result\.$/,
      () =>
        'Một số loại ngữ nghĩa được suy ra từ hình draw.io; hãy xác nhận trong Thuộc tính trước khi chia sẻ kết quả chính xác.',
    ],
  ];

  for (const [pattern, translate] of translations) {
    const match = message.match(pattern);
    if (match) return translate(match);
  }

  return message;
};
