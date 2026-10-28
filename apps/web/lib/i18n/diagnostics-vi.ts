import type { DiagnosticCode, DiagnosticParams } from '@flowculus/validation';

type Formatter = (params: DiagnosticParams) => string;

const label = (params: DiagnosticParams): string =>
  String(params.label ?? params.nodeId ?? params.edgeId ?? '');
const flow = (params: DiagnosticParams): string =>
  params.source != null
    ? `${String(params.source)} → ${String(params.target)}`
    : label(params);
const kind = (params: DiagnosticParams): string =>
  String(params.gatewayKind ?? '').toUpperCase();

export const DIAGNOSTICS_VI: Record<DiagnosticCode, Formatter> = {
  'invalid-container': () =>
    'Pool hoặc lane có khung cha không hợp lệ hoặc trùng định danh.',
  'invalid-membership': () => 'Bước quy trình phải thuộc pool và lane hợp lệ.',
  'cross-pool-sequence': () =>
    'Sequence flow không được đi qua hai pool. Dùng message flow giữa các bên tham gia.',
  'invalid-message-flow': () =>
    'Message flow phải nối các phần tử phù hợp thuộc hai pool khác nhau.',
  'process-scope-required': () =>
    'Chọn một pool quy trình để phân tích. Không suy ra thời gian phối hợp từ message flow.',

  'schema-invalid': (p) =>
    `Mô hình có giá trị không hợp lệ tại ${String(p.path || 'gốc')}.`,
  'edge-missing-source': (p) =>
    `Luồng ${String(p.edgeId)} bắt đầu từ một nút không còn tồn tại.`,
  'edge-missing-target': (p) =>
    `Luồng ${String(p.edgeId)} kết thúc ở một nút không còn tồn tại.`,
  'processing-exceeds-cycle-time': (p) =>
    `${label(p)}: thời gian xử lý T dài hơn thời gian chu trình quan sát D.`,
  'waiting-exceeds-cycle-time': (p) =>
    `${label(p)}: thời gian chờ Wq dài hơn thời gian chu trình quan sát D.`,
  'time-components-exceed-cycle-time': (p) =>
    `${label(p)}: T + Wq dài hơn thời gian chu trình quan sát D.`,
  'invalid-analysis-options': () => 'Thông số kịch bản có giá trị không hợp lệ.',
  'empty-model': () => 'Thêm các bước quy trình và nối chúng để bắt đầu phân tích.',
  'missing-start': () =>
    'Không có sự kiện bắt đầu và không có một bước khởi đầu duy nhất.',
  'implicit-start': (p) =>
    `Không có sự kiện bắt đầu: dùng ${label(p)} làm bước khởi đầu.`,
  'multiple-start-events': (p) =>
    `Có ${String(p.count)} sự kiện bắt đầu: chưa biết tỉ lệ kích hoạt nên cần mô phỏng.`,
  'multiple-end-events': (p) =>
    `Có ${String(p.count)} sự kiện kết thúc; quy trình kết thúc tại bất kỳ sự kiện nào.`,
  'implicit-end': (p) => `${label(p)} không có luồng ra nên được coi là điểm kết thúc.`,
  'sequence-flow-into-start': (p) => `Luồng ${flow(p)} đi vào sự kiện bắt đầu.`,
  'sequence-flow-from-end': (p) => `Luồng ${flow(p)} đi ra từ sự kiện kết thúc.`,
  'sequence-flow-artifact-endpoint': (p) =>
    `Luồng tuần tự ${flow(p)} nối với dữ liệu/ghi chú; hãy dùng association.`,
  'self-loop-sequence-flow': (p) =>
    `${flow(p)} tự lặp về chính nó; hãy dùng xác suất làm lại thay thế.`,
  'message-flow-artifact-endpoint': (p) =>
    `Luồng thông điệp ${flow(p)} nối với artifact.`,
  'association-without-artifact': (p) =>
    `Association ${flow(p)} nối hai nút luồng; phân tích bỏ qua liên kết này.`,
  'unknown-edge-kind': (p) => `Luồng ${flow(p)} có loại không xác định và bị bỏ qua.`,
  'gateway-kind-on-non-gateway': (p) =>
    `${label(p)} có loại gateway nhưng không phải gateway.`,
  'unknown-node-kind': (p) => `${label(p)} chưa rõ loại; hãy chọn loại trong Inspector.`,
  'unreachable-node': (p) => `Không thể đi tới ${label(p)} từ điểm bắt đầu.`,
  'orphan-node': (p) => `${label(p)} không được nối với phần tử nào.`,
  'disconnected-components': (p) => `Sơ đồ có ${String(p.count)} phần tách rời.`,
  'no-path-to-end': (p) =>
    `${label(p)} không bao giờ tới được điểm kết thúc; quy trình có thể không hoàn tất.`,
  'branch-probability-missing': (p) =>
    `Gateway ${kind(p)} ${label(p)} cần xác suất trên mọi luồng ra.`,
  'branch-probability-sum': (p) =>
    `Gateway XOR ${label(p)}: tổng xác suất là ${String(p.sum)} thay vì 1.`,
  'probability-ignored': (p) =>
    `Xác suất sau ${label(p)} không có tác dụng và bị bỏ qua.`,
  'implicit-split': (p) =>
    `${label(p)} có nhiều luồng ra nhưng không có gateway; hãy thêm gateway rõ ràng.`,
  'implicit-join': (p) => `${label(p)} gộp nhiều luồng mà không có gateway (gộp XOR).`,
  'mixed-gateway': (p) =>
    `${label(p)} vừa gộp vừa tách luồng; nên tách thành hai gateway.`,
  'gateway-pass-through': (p) =>
    `${label(p)} chỉ có một vào một ra nên không có tác dụng.`,
  'unsupported-gateway-kind': (p) =>
    `Gateway ${kind(p)} ${label(p)} không thể giải bằng công thức; cần mô phỏng.`,
  'edge-rework-unsupported': (p) =>
    `Luồng ${flow(p)} mang xác suất làm lại; hãy đặt xác suất này trên tác vụ bị lặp.`,
  'rework-ignored': (p) =>
    `${label(p)} không phải hoạt động; xác suất làm lại bị bỏ qua.`,
  'unsupported-element': (p) =>
    `${label(p)} là ${String(p.shape)}: Flowculus giữ nguyên trong file nhưng không mô hình hoá.`,
  'containers-not-modelled': (p) =>
    `${String(p.count)} pool/lane được giữ trong file nhưng không đưa vào phân tích.`,
  'unconfirmed-semantics': (p) =>
    `${String(p.count)} ngữ nghĩa được suy luận cần xác nhận trong Inspector.`,
  'join-not-found': (p) =>
    `Nhánh tách ${kind(p)} ${label(p)}: các nhánh gộp lại mà không có điểm hội tụ tương ứng.`,
  'join-kind-mismatch': (p) =>
    `Nhánh tách ${kind(p)} ${label(p)} được đóng bởi ${String(p.joinLabel)} (${String(p.joinKind).toUpperCase()}); hai loại phải giống nhau.`,
  'unstructured-block': (p) =>
    `Khối ${kind(p)} tại ${label(p)} không phải một-vào-một-ra; cần mô phỏng.`,
  'explicit-join-invalid': (p) =>
    `${label(p)} được ghép với điểm hội tụ ${String(p.joinId)} nhưng điểm này không đóng khối.`,
  'shared-join': (p) => `${label(p)} đóng nhiều khối lồng nhau cùng loại.`,
  'unmatched-join': (p) =>
    `Điểm hội tụ ${kind(p)} ${label(p)} không có nhánh tách tương ứng; có thể chờ vô hạn.`,
  'implicit-join-at-end': (p) =>
    `Các nhánh của ${label(p)} kết thúc tại sự kiện kết thúc mà không cần điểm hội tụ.`,
  'parallel-branch-decision': (p) =>
    `Khối song song ${label(p)} chứa rẽ nhánh hoặc vòng lặp: dùng max của các giá trị kỳ vọng.`,
  'or-independence-assumption': (p) =>
    `Gateway OR ${label(p)}: giả định các nhánh độc lập và loại trừ trường hợp không chọn nhánh nào.`,
  'or-too-many-branches': (p) =>
    `Gateway OR ${label(p)} có ${String(p.count)} nhánh (giới hạn ${String(p.limit)}).`,
  'cycle-detected': (p) => `Vòng lặp tại ${label(p)}: giải theo số lần lặp kỳ vọng.`,
  'missing-activity-time': (p) => `${label(p)} chưa có thời gian; đang dùng 0 phút.`,
  'unexplained-wait': (p) =>
    `${label(p)}: T + Wq ngắn hơn thời gian chu trình quan sát ${String(p.minutes)} phút.`,
  'processing-estimated-from-cycle-time': (p) =>
    `${label(p)}: thời gian xử lý được ước tính từ thời gian chu trình.`,
  'missing-processing-time': (p) =>
    `${label(p)} có thời gian chờ nhưng chưa có thời gian xử lý.`,
  'missing-cost': (p) => `${label(p)} chưa có dữ liệu chi phí; chi phí được tính là 0.`,
  'did-not-converge': () => 'Phép tính không hội tụ; cần mô phỏng.',
  'cycle-time-zero': () => 'Thời gian chu trình bằng 0 nên hiệu suất chưa xác định.',
  'cte-out-of-range': (p) =>
    `Thời gian lý thuyết vượt thời gian chu trình (tỉ lệ ${String(p.ratio)}); hãy kiểm tra dữ liệu.`,
  'capacity-default-pool-size': (p) =>
    `Nhóm ${String(p.poolId)}: đang giả định 1 nguồn lực.`,
  'capacity-over-utilized': (p) =>
    `Nhóm ${String(p.poolId)} vượt năng lực (mức sử dụng ${String(p.utilization)}).`,
  'pool-queue-approximation': (p) =>
    `Nhóm ${String(p.poolId)}: khối lượng việc mỗi ca được coi là một dịch vụ M/M/c.`,
  'little-law-zero-arrival': () => 'Định luật Little cần tốc độ đến lớn hơn 0.',
  'queue-unstable': () => 'Mức sử dụng từ 100 % trở lên; hàng đợi tăng không giới hạn.',
  'queue-invalid-input': () => 'Tốc độ đến, tốc độ phục vụ và số máy chủ phải hợp lệ.',
  'cpm-duration-estimate': (p) =>
    `CPM dùng thời gian chu trình để ước tính thời gian xử lý cho: ${String(p.labels)}.`,
};
