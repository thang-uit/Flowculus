import type { Locale } from '@/lib/i18n/types';
import type { SemanticShapeTool } from '@/lib/shape-tools';

export type NotationKind =
  SemanticShapeTool | 'sequence-flow' | 'message-flow' | 'association';
interface NotationRow {
  kind: NotationKind;
  label: string;
  meaning: string;
  support: string;
}
export const NOTATION_COPY: Record<
  Locale,
  { caption: string; source: string; headers: string[]; rows: NotationRow[] }
> = {
  en: {
    caption: 'BPMN symbols and what Flowculus supports',
    source: 'Source: OMG BPMN 2.0.2, sections 7.3, 8.4, 9.3, 10.3, 10.5 and 10.6.',
    headers: ['Symbol', 'Meaning in BPMN', 'In Flowculus'],
    rows: [
      {
        kind: 'start',
        label: 'None Start Event',
        meaning: 'One thin solid circle; marks process entry.',
        support: 'Supported entry point; no specific trigger is modelled.',
      },
      {
        kind: 'task',
        label: 'Task',
        meaning: 'A rounded rectangle representing work.',
        support: 'Elapsed time, processing, waiting and cost.',
      },
      {
        kind: 'xor',
        label: 'Exclusive Gateway (XOR)',
        meaning:
          'A diamond, optionally marked X. A split chooses one path; a merge does not wait for all incoming paths.',
        support:
          'Branch probabilities describe expected routing, rather than evaluating business conditions.',
      },
      {
        kind: 'and',
        label: 'Parallel Gateway (AND)',
        meaning:
          'A diamond marked +. A split activates every outgoing flow; a join synchronizes incoming flows.',
        support:
          'Structured split/join blocks; elapsed completion uses the slowest branch under stated assumptions.',
      },
      {
        kind: 'or',
        label: 'Inclusive Gateway (OR)',
        meaning:
          'A diamond with an open circle. A split selects one or more eligible paths.',
        support:
          'Independent branch selection is a Flowculus assumption, not general BPMN semantics.',
      },
      {
        kind: 'eventBased',
        label: 'Event-Based Gateway',
        meaning:
          'A diamond containing two rings and an unfilled pentagon for the non-instantiating exclusive variant.',
        support:
          'Notation and file preservation only. Event races are not calculated analytically.',
      },
      {
        kind: 'complex',
        label: 'Complex Gateway',
        meaning:
          'A diamond with an asterisk for a specialized activation/synchronization rule.',
        support:
          'Notation and file preservation only. The activation rule is not executed.',
      },
      {
        kind: 'end',
        label: 'None End Event',
        meaning: 'One thick solid circle; ends a flow path.',
        support: 'An ordinary end event, not a terminate event.',
      },
      {
        kind: 'event',
        label: 'None Intermediate Event',
        meaning: 'Two thin solid circles, with no trigger/result marker.',
        support:
          'An intermediate flow point; timer, message, boundary and other trigger semantics are not modelled.',
      },
      {
        kind: 'subprocess',
        label: 'Collapsed Sub-Process',
        meaning: 'A rounded rectangle with a boxed + at its bottom centre.',
        support:
          'One aggregate activity. There is no nested-process editor or execution of internal flow.',
      },
      {
        kind: 'data',
        label: 'Data Object',
        meaning: 'A document shape with a folded corner.',
        support: 'Supporting information; excluded from sequence-flow calculations.',
      },
      {
        kind: 'annotation',
        label: 'Text Annotation',
        meaning: 'Text beside an open bracket.',
        support: 'Explanatory text, with no token-flow effect.',
      },
      {
        kind: 'sequence-flow',
        label: 'Sequence Flow',
        meaning: 'A solid line with a filled arrowhead inside one process.',
        support: 'Carries control flow. Highlighting never changes its line style.',
      },
      {
        kind: 'message-flow',
        label: 'Message Flow',
        meaning:
          'A dashed line, open circle at the source and open arrowhead; connects separate participants.',
        support:
          'Appearance and data are preserved. Pools and participant boundaries are not modelled or checked.',
      },
      {
        kind: 'association',
        label: 'Association',
        meaning: 'A dotted connector between supporting information and model elements.',
        support: 'Undirected association only; excluded from control-flow calculations.',
      },
      {
        kind: 'rework',
        label: 'Flowculus rework preset',
        meaning:
          'A task preset, not an additional BPMN element type. The r label denotes an analysis parameter.',
        support:
          'Pre-fills r = 10% for repeated attempts. A standard loop marker does not by itself specify this probability.',
      },
    ],
  },
  vi: {
    caption: 'Ký hiệu BPMN và phạm vi hỗ trợ của Flowculus',
    source: 'Nguồn: OMG BPMN 2.0.2, mục 7.3, 8.4, 9.3, 10.3, 10.5 và 10.6.',
    headers: ['Ký hiệu', 'Ý nghĩa trong BPMN', 'Trong Flowculus'],
    rows: [
      {
        kind: 'start',
        label: 'Sự kiện bắt đầu không chỉ định trigger',
        meaning: 'Một vòng tròn nét liền mảnh, đánh dấu điểm vào quy trình.',
        support: 'Hỗ trợ điểm vào; không mô hình hóa trigger cụ thể.',
      },
      {
        kind: 'task',
        label: 'Tác vụ (Task)',
        meaning: 'Hình chữ nhật bo góc biểu diễn công việc.',
        support: 'Thời gian trôi qua, xử lý, chờ và chi phí.',
      },
      {
        kind: 'xor',
        label: 'Gateway loại trừ (XOR)',
        meaning:
          'Hình thoi, có thể có dấu X. Khi tách chỉ chọn một nhánh; khi gộp không đợi tất cả nhánh đến.',
        support:
          'Xác suất nhánh dùng để tính kỳ vọng, không thực thi biểu thức điều kiện nghiệp vụ.',
      },
      {
        kind: 'and',
        label: 'Gateway song song (AND)',
        meaning:
          'Hình thoi có dấu +. Khi tách kích hoạt tất cả luồng đi ra; khi gộp đồng bộ các luồng đi vào.',
        support:
          'Khối tách/gộp có cấu trúc; thời gian hoàn tất theo nhánh chậm nhất với điều kiện đã nêu.',
      },
      {
        kind: 'or',
        label: 'Gateway bao hàm (OR)',
        meaning:
          'Hình thoi có vòng tròn rỗng. Khi tách chọn một hoặc nhiều nhánh thỏa điều kiện.',
        support:
          'Chọn nhánh độc lập là giả định của Flowculus, không đại diện toàn bộ ngữ nghĩa BPMN.',
      },
      {
        kind: 'eventBased',
        label: 'Gateway theo sự kiện',
        meaning:
          'Hình thoi chứa hai vòng tròn và ngũ giác rỗng, cho biến thể loại trừ không khởi tạo quy trình.',
        support:
          'Hỗ trợ ký hiệu và giữ dữ liệu tệp; chưa tính giải tích cuộc đua giữa các sự kiện.',
      },
      {
        kind: 'complex',
        label: 'Gateway phức tạp',
        meaning: 'Hình thoi có dấu sao, dùng quy tắc kích hoạt/đồng bộ chuyên biệt.',
        support: 'Hỗ trợ ký hiệu và giữ dữ liệu tệp; chưa thực thi quy tắc kích hoạt.',
      },
      {
        kind: 'end',
        label: 'Sự kiện kết thúc thông thường',
        meaning: 'Một vòng tròn nét liền đậm, kết thúc một nhánh luồng.',
        support: 'Không phải sự kiện chấm dứt toàn bộ quy trình (terminate).',
      },
      {
        kind: 'event',
        label: 'Sự kiện trung gian không marker',
        meaning:
          'Hai vòng tròn nét liền mảnh, không có ký hiệu trigger/kết quả bên trong.',
        support:
          'Điểm trung gian trên luồng; chưa mô hình hóa timer, message, boundary hay trigger khác.',
      },
      {
        kind: 'subprocess',
        label: 'Tiểu quy trình thu gọn',
        meaning: 'Hình chữ nhật bo góc với dấu + trong ô vuông ở giữa cạnh dưới.',
        support:
          'Xem như một hoạt động tổng hợp; chưa có trình sửa quy trình lồng hay thực thi luồng bên trong.',
      },
      {
        kind: 'data',
        label: 'Đối tượng dữ liệu',
        meaning: 'Hình tài liệu có góc gấp.',
        support: 'Thông tin hỗ trợ, không tham gia tính luồng tuần tự.',
      },
      {
        kind: 'annotation',
        label: 'Chú thích văn bản',
        meaning: 'Văn bản cạnh dấu ngoặc mở.',
        support: 'Giải thích mô hình, không điều khiển token.',
      },
      {
        kind: 'sequence-flow',
        label: 'Luồng tuần tự',
        meaning: 'Đường liền với đầu mũi tên đặc, nằm trong cùng một quy trình.',
        support: 'Truyền luồng điều khiển; phần tô sáng không đổi kiểu nét.',
      },
      {
        kind: 'message-flow',
        label: 'Luồng thông điệp',
        meaning:
          'Đường đứt, đầu nguồn là vòng tròn rỗng, đầu đích là mũi tên rỗng; nối các bên tham gia khác nhau.',
        support:
          'Giữ hình thức và dữ liệu; chưa mô hình hóa hay kiểm tra ranh giới pool/bên tham gia.',
      },
      {
        kind: 'association',
        label: 'Liên kết chú thích',
        meaning: 'Đường chấm nối thông tin hỗ trợ với phần tử mô hình.',
        support: 'Chỉ hỗ trợ liên kết không hướng, không tham gia tính luồng điều khiển.',
      },
      {
        kind: 'rework',
        label: 'Preset làm lại của Flowculus',
        meaning:
          'Preset của tác vụ, không phải loại phần tử BPMN mới. Nhãn r là tham số phân tích.',
        support:
          'Điền sẵn r = 10% cho các lượt lặp. Marker vòng lặp chuẩn không tự quy định xác suất này.',
      },
    ],
  },
};
