import type {
  CriticalChainUnavailableReason,
  CriticalPathUnavailableReason,
  CycleTimeSource,
  PathCountWarningCode,
  ProcessingTimeSource,
} from '@flowculus/analysis-engine';
import type { MiningConversionWarningCode } from '@flowculus/process-mining';
import type { SemanticOrigin, UnconfirmedSemanticCode } from '@flowculus/validation';

type Params = Record<string, string | number>;

/** Semantic confirmation gate and Inspector review. */
export interface SemanticCopy {
  gateTitle: string;
  gateDescription: (count: number) => string;
  blockedStatus: (count: number) => string;
  reviewInInspector: string;
  reviewTitle: (count: number) => string;
  reviewDescription: string;
  allConfirmed: string;
  confirmItem: string;
  confirmElement: string;
  confirmAll: string;
  confirmAllTitle: string;
  confirmAllWarning: (count: number) => string;
  confirmAllAction: string;
  cancel: string;
  chooseTypeFirst: string;
  confirmedBadge: string;
  showElement: string;
  codes: Record<UnconfirmedSemanticCode, string>;
  origins: Record<SemanticOrigin, string>;
}

/** Quality, cycle-time contract, CPM/chain naming and locale-neutral warnings. */
export interface QualityCopy {
  metricQualityHint: string;
  cycleTimeSource: Record<CycleTimeSource, string>;
  processingSource: Record<ProcessingTimeSource, string>;
  cycleTimeSourceLabel: string;
  effectiveCycleTime: string;
  unexplainedWait: (minutes: string) => string;
  criticalPathTitle: string;
  criticalPathHint: string;
  criticalChainTitle: string;
  criticalChainExact: string;
  criticalChainHeuristic: string;
  criticalChainHint: string;
  legendExact: string;
  legendEstimate: string;
  cpmReasons: Record<CriticalPathUnavailableReason, string>;
  chainReasons: Record<CriticalChainUnavailableReason, string>;
  issueGroups: { error: string; warning: string; info: string };
  assumptionTag: string;
  simulationTag: string;
  noIssues: string;
  simulationNoNumber: string;
  pathWarnings: Record<PathCountWarningCode, (params: Params) => string>;
  miningWarnings: Record<MiningConversionWarningCode, (params: Params) => string>;
  activityTable: {
    title: string;
    activity: string;
    cycleTime: string;
    source: string;
    processing: string;
    waiting: string;
  };
  joinPairing: string;
  joinPairingAuto: string;
  joinPairingHint: string;
}

/** Error boundaries, offline and worker states. */
export interface ResilienceCopy {
  offline: string;
  offlineHint: string;
  sectionErrorTitle: (section: string) => string;
  sectionErrorBody: string;
  retry: string;
  errorDetails: string;
  sections: { canvas: string; mining: string; analysis: string; inspector: string };
  workerRestarting: string;
  workerUnavailable: string;
  analysisTimeout: string;
  analysisFailed: string;
  miningTimeout: string;
  miningCancelled: string;
  cancel: string;
  menuHint: string;
}

export const SEMANTIC_COPY_EN: SemanticCopy = {
  gateTitle: 'Confirm inferred semantics first',
  gateDescription: (count) =>
    `${count} ${count === 1 ? 'element was' : 'elements were'} guessed from shapes, labels or the event log. Export and share stay blocked until a person confirms them, so a guess is never shared as a fact.`,
  blockedStatus: (count) =>
    `Blocked: ${count} inferred item${count === 1 ? '' : 's'} need confirmation.`,
  reviewInInspector: 'Review in Inspector',
  reviewTitle: (count) => `${count} item${count === 1 ? '' : 's'} to confirm`,
  reviewDescription:
    'Check each guessed type, gateway, rework rate, flow type or probability, then confirm it.',
  allConfirmed: 'All semantics are confirmed.',
  confirmItem: 'Confirm',
  confirmElement: 'Confirm this element',
  confirmAll: 'Confirm all remaining…',
  confirmAllTitle: 'Confirm every remaining item?',
  confirmAllWarning: (count) =>
    `You are about to confirm ${count} guessed item${count === 1 ? '' : 's'} without reviewing them one by one. Results will treat them as facts.`,
  confirmAllAction: 'Yes, confirm all',
  cancel: 'Cancel',
  chooseTypeFirst: 'Choose a type for this element before it can be confirmed.',
  confirmedBadge: 'Confirmed',
  showElement: 'Show',
  codes: {
    'inferred-node-kind': 'Element type guessed from its shape',
    'inferred-gateway-kind': 'Gateway type guessed',
    'inferred-rework': 'Rework rate mined from repeated events',
    'inferred-edge-kind': 'Flow type guessed from the arrow style',
    'inferred-edge-probability': 'Branch probability read from a label or the log',
    'unknown-node-kind': 'Unknown element type',
  },
  origins: {
    drawio: 'draw.io',
    'process-mining': 'Event log',
    csv: 'CSV',
    unknown: 'Model',
  },
};

export const SEMANTIC_COPY_VI: SemanticCopy = {
  gateTitle: 'Cần xác nhận ngữ nghĩa được suy luận',
  gateDescription: (count) =>
    `${count} phần tử được đoán từ hình vẽ, nhãn hoặc nhật ký sự kiện. Xuất và chia sẻ bị chặn cho tới khi có người xác nhận, để một phỏng đoán không bị chia sẻ như dữ kiện.`,
  blockedStatus: (count) => `Đã chặn: ${count} mục suy luận cần xác nhận.`,
  reviewInInspector: 'Xem lại trong Inspector',
  reviewTitle: (count) => `${count} mục cần xác nhận`,
  reviewDescription:
    'Kiểm tra từng loại phần tử, loại gateway, tỉ lệ làm lại, loại luồng hoặc xác suất được đoán rồi xác nhận.',
  allConfirmed: 'Tất cả ngữ nghĩa đã được xác nhận.',
  confirmItem: 'Xác nhận',
  confirmElement: 'Xác nhận phần tử này',
  confirmAll: 'Xác nhận tất cả còn lại…',
  confirmAllTitle: 'Xác nhận toàn bộ các mục còn lại?',
  confirmAllWarning: (count) =>
    `Bạn sắp xác nhận ${count} mục được đoán mà không xem từng mục. Kết quả sẽ coi chúng là dữ kiện.`,
  confirmAllAction: 'Đồng ý, xác nhận tất cả',
  cancel: 'Huỷ',
  chooseTypeFirst: 'Hãy chọn loại cho phần tử này trước khi xác nhận.',
  confirmedBadge: 'Đã xác nhận',
  showElement: 'Xem',
  codes: {
    'inferred-node-kind': 'Loại phần tử được đoán từ hình vẽ',
    'inferred-gateway-kind': 'Loại gateway được đoán',
    'inferred-rework': 'Tỉ lệ làm lại khai phá từ sự kiện lặp',
    'inferred-edge-kind': 'Loại luồng được đoán từ kiểu mũi tên',
    'inferred-edge-probability': 'Xác suất nhánh đọc từ nhãn hoặc nhật ký',
    'unknown-node-kind': 'Chưa rõ loại phần tử',
  },
  origins: {
    drawio: 'draw.io',
    'process-mining': 'Nhật ký sự kiện',
    csv: 'CSV',
    unknown: 'Mô hình',
  },
};

export const QUALITY_COPY_EN: QualityCopy = {
  metricQualityHint:
    'Exact: every input is explicit and the structure is proven. Assumption: the number relies on a stated assumption. Simulation required: no analytic number is shown.',
  cycleTimeSource: {
    observed: 'Observed duration D',
    derived: 'Derived T + Wq',
    missing: 'No time entered',
  },
  processingSource: {
    explicit: 'Entered T',
    derived: 'Derived D − Wq',
    'cycle-time-estimate': 'Estimated from D',
    missing: 'Missing',
  },
  cycleTimeSourceLabel: 'CT source',
  effectiveCycleTime: 'Cycle time used',
  unexplainedWait: (minutes) => `${minutes} min of D is not explained by T + Wq.`,
  criticalPathTitle: 'Critical path (CPM)',
  criticalPathHint:
    'Longest path over processing time T on a decision-free, loop-free graph (book CPM).',
  criticalChainTitle: 'Critical chain (cycle time)',
  criticalChainExact: 'Critical chain — exact',
  criticalChainHeuristic: 'Critical chain — expected-time heuristic',
  criticalChainHint:
    'Follows the branch with the largest probability × remaining expected time. It explains the expectation; it is not the most likely route.',
  legendExact: 'Exact chain',
  legendEstimate: 'Estimated chain (assumption)',
  cpmReasons: {
    'missing-start': 'CPM needs one start event.',
    'decision-gateway':
      'CPM is not defined across XOR/OR decisions; see the critical chain.',
    'rework-or-cycle': 'CPM is not defined with rework or loops; see the critical chain.',
    'unsupported-structure': 'The model needs simulation, so CPM is not shown.',
  },
  chainReasons: {
    'missing-start': 'The chain needs one start event.',
    'no-analytic-result': 'No analytic cycle time exists, so no chain is highlighted.',
  },
  issueGroups: { error: 'Errors', warning: 'Warnings', info: 'Notes' },
  assumptionTag: 'assumption',
  simulationTag: 'simulation',
  noIssues: 'No findings.',
  simulationNoNumber: 'Simulation required: no analytic value.',
  pathWarnings: {
    'start-not-found': (p) => `Start node ${String(p.nodeId)} was not found.`,
    'no-unique-start': () => 'There is no single start node.',
    'end-not-found': () => 'No selected end node was found.',
    'requested-ends-missing': (p) => `End node(s) not found: ${String(p.nodeIds)}.`,
    cycle: () => 'The graph has a loop, so the number of paths is not finite.',
    limit: (p) => `More than ${String(p.limit)} paths; counting stopped.`,
  },
  miningWarnings: {
    'no-complete-case': () => 'The event log has no complete case to start from.',
    'possible-parallelism': (p) =>
      `${String(p.first)} and ${String(p.second)} occur in both orders; they may run in parallel (AND) rather than loop.`,
    'missing-start-times': () =>
      'The log has no start timestamps: task times are elapsed time between completions and processing time is unknown.',
  },
  activityTable: {
    title: 'Activity times',
    activity: 'Activity',
    cycleTime: 'CT (min)',
    source: 'Source',
    processing: 'T (min)',
    waiting: 'Wq (min)',
  },
  joinPairing: 'Join gateway',
  joinPairingAuto: 'Automatic (post-dominator)',
  joinPairingHint:
    'Pair this split with the gateway that closes its block. Automatic pairing proves the join from the graph.',
};

export const QUALITY_COPY_VI: QualityCopy = {
  metricQualityHint:
    'Chính xác: mọi đầu vào rõ ràng và cấu trúc đã được chứng minh. Giả định: con số dựa trên một giả định đã nêu. Cần mô phỏng: không hiển thị con số giải tích.',
  cycleTimeSource: {
    observed: 'Thời lượng quan sát D',
    derived: 'Suy ra T + Wq',
    missing: 'Chưa nhập thời gian',
  },
  processingSource: {
    explicit: 'T đã nhập',
    derived: 'Suy ra D − Wq',
    'cycle-time-estimate': 'Ước tính từ D',
    missing: 'Thiếu',
  },
  cycleTimeSourceLabel: 'Nguồn CT',
  effectiveCycleTime: 'Thời gian chu trình được dùng',
  unexplainedWait: (minutes) => `${minutes} phút của D chưa được giải thích bởi T + Wq.`,
  criticalPathTitle: 'Đường găng (CPM)',
  criticalPathHint:
    'Đường dài nhất theo thời gian xử lý T trên đồ thị không rẽ nhánh, không vòng lặp (CPM theo giáo trình).',
  criticalChainTitle: 'Chuỗi găng (thời gian chu trình)',
  criticalChainExact: 'Chuỗi găng — chính xác',
  criticalChainHeuristic: 'Chuỗi găng — ước lượng theo thời gian kỳ vọng',
  criticalChainHint:
    'Đi theo nhánh có xác suất × thời gian kỳ vọng còn lại lớn nhất. Chuỗi này giải thích giá trị kỳ vọng; không phải đường có khả năng xảy ra cao nhất.',
  legendExact: 'Chuỗi chính xác',
  legendEstimate: 'Chuỗi ước lượng (giả định)',
  cpmReasons: {
    'missing-start': 'CPM cần đúng một sự kiện bắt đầu.',
    'decision-gateway': 'CPM không xác định khi có rẽ nhánh XOR/OR; xem chuỗi găng.',
    'rework-or-cycle': 'CPM không xác định khi có làm lại hoặc vòng lặp; xem chuỗi găng.',
    'unsupported-structure': 'Mô hình cần mô phỏng nên không hiển thị CPM.',
  },
  chainReasons: {
    'missing-start': 'Chuỗi găng cần đúng một sự kiện bắt đầu.',
    'no-analytic-result':
      'Không có thời gian chu trình giải tích nên không tô chuỗi găng.',
  },
  issueGroups: { error: 'Lỗi', warning: 'Cảnh báo', info: 'Ghi chú' },
  assumptionTag: 'giả định',
  simulationTag: 'mô phỏng',
  noIssues: 'Không có phát hiện nào.',
  simulationNoNumber: 'Cần mô phỏng: không có giá trị giải tích.',
  pathWarnings: {
    'start-not-found': (p) => `Không tìm thấy nút bắt đầu ${String(p.nodeId)}.`,
    'no-unique-start': () => 'Không có một nút bắt đầu duy nhất.',
    'end-not-found': () => 'Không tìm thấy nút kết thúc đã chọn.',
    'requested-ends-missing': (p) => `Không tìm thấy nút kết thúc: ${String(p.nodeIds)}.`,
    cycle: () => 'Đồ thị có vòng lặp nên số đường đi không hữu hạn.',
    limit: (p) => `Có hơn ${String(p.limit)} đường đi; đã dừng đếm.`,
  },
  miningWarnings: {
    'no-complete-case': () => 'Nhật ký sự kiện không có ca hoàn chỉnh để bắt đầu.',
    'possible-parallelism': (p) =>
      `${String(p.first)} và ${String(p.second)} xuất hiện theo cả hai thứ tự; có thể chúng chạy song song (AND) thay vì lặp.`,
    'missing-start-times': () =>
      'Nhật ký không có thời điểm bắt đầu: thời gian tác vụ là khoảng giữa các lần hoàn thành và chưa biết thời gian xử lý.',
  },
  activityTable: {
    title: 'Thời gian hoạt động',
    activity: 'Hoạt động',
    cycleTime: 'CT (phút)',
    source: 'Nguồn',
    processing: 'T (phút)',
    waiting: 'Wq (phút)',
  },
  joinPairing: 'Gateway hội tụ',
  joinPairingAuto: 'Tự động (post-dominator)',
  joinPairingHint:
    'Ghép nhánh tách này với gateway đóng khối. Chế độ tự động chứng minh điểm hội tụ từ đồ thị.',
};

export const RESILIENCE_COPY_EN: ResilienceCopy = {
  offline: 'Offline',
  offlineHint: 'You are offline. Editing, analysis and local drafts keep working.',
  sectionErrorTitle: (section) => `${section} stopped working`,
  sectionErrorBody:
    'This part of the workspace hit an unexpected error. Your model is safe in the local draft.',
  retry: 'Try again',
  errorDetails: 'Technical details',
  sections: {
    canvas: 'The canvas',
    mining: 'Process mining',
    analysis: 'The analysis panel',
    inspector: 'The Inspector',
  },
  workerRestarting: 'Restarting the analysis worker…',
  workerUnavailable:
    'Background analysis is unavailable; calculating on the main thread.',
  analysisTimeout:
    'The analysis took too long and was stopped. Simplify the model or edit it to try again.',
  analysisFailed: 'The analysis failed. Edit the model to try again.',
  miningTimeout:
    'Process mining took too long and was stopped. Try a smaller log or filter.',
  miningCancelled: 'Process mining was cancelled.',
  cancel: 'Cancel',
  menuHint: 'Use the arrow keys to move, Enter to choose and Escape to close.',
};

export const RESILIENCE_COPY_VI: ResilienceCopy = {
  offline: 'Ngoại tuyến',
  offlineHint:
    'Bạn đang ngoại tuyến. Chỉnh sửa, phân tích và bản nháp cục bộ vẫn hoạt động.',
  sectionErrorTitle: (section) => `${section} đã gặp sự cố`,
  sectionErrorBody:
    'Phần này của không gian làm việc gặp lỗi ngoài dự kiến. Mô hình của bạn vẫn an toàn trong bản nháp cục bộ.',
  retry: 'Thử lại',
  errorDetails: 'Chi tiết kỹ thuật',
  sections: {
    canvas: 'Canvas',
    mining: 'Khai phá quy trình',
    analysis: 'Bảng phân tích',
    inspector: 'Inspector',
  },
  workerRestarting: 'Đang khởi động lại worker phân tích…',
  workerUnavailable: 'Không chạy được phân tích nền; đang tính trên luồng chính.',
  analysisTimeout:
    'Phân tích chạy quá lâu nên đã dừng. Hãy đơn giản hoá mô hình hoặc chỉnh sửa để thử lại.',
  analysisFailed: 'Phân tích thất bại. Hãy chỉnh sửa mô hình để thử lại.',
  miningTimeout:
    'Khai phá quy trình chạy quá lâu nên đã dừng. Hãy thử nhật ký nhỏ hơn hoặc lọc bớt.',
  miningCancelled: 'Đã huỷ khai phá quy trình.',
  cancel: 'Huỷ',
  menuHint: 'Dùng phím mũi tên để di chuyển, Enter để chọn và Escape để đóng.',
};
