export type Locale = 'en' | 'vi';

export interface WorkspaceCopy {
  brandTooltip: string;
  brandSubtitle: string;
  brandBadge: string;
  languageName: string;
  languageShort: string;
  nextLanguageName: string;
  workspace: string;
  modelName: string;
  subtitle: string;
  openFile: string;
  dropFiles: string;
  dropFilesHint: string;
  saveFile: string;
  shareFile: string;
  moreActions: string;
  moreTools: string;
  exportFile: string;
  importHint: string;
  localDraft: string;
  draftRestored: string;
  draftSaveError: string;
  draftSaving: string;
  localCopyExported: string;
  selectedFile: (name: string) => string;
  shareSheetOpened: string;
  workspaceLinkCopied: string;
  shareCancelled: string;
  preparingAnalysis: string;
  analysisPreviewReady: string;
  analyze: string;
  analyzing: string;
  useLightTheme: string;
  useDarkTheme: string;
  switchLanguage: string;
  collapsePalette: string;
  expandPalette: string;
  expandResults: string;
  collapseResults: string;
  resizeResults: string;
  resizeResultsHint: string;
  analysisAutoUpdate: string;
  analysisUpdated: string;
  addShape: string;
  dropShape: string;
  shapes: string;
  shapesDescription: string;
  processShapes: string;
  chooseShape: string;
  startEventHint: string;
  taskActivityHint: string;
  xorGateway: string;
  andGateway: string;
  orGateway: string;
  eventBasedGateway: string;
  complexGateway: string;
  endEventHint: string;
  intermediateEventHint: string;
  subprocessHint: string;
  dataObjectHint: string;
  annotationHint: string;
  reworkHint: string;
  entryPoint: string;
  workActivity: string;
  onePath: string;
  parallelPaths: string;
  inclusivePaths: string;
  eventChoice: string;
  complexChoice: string;
  exitPoint: string;
  repeatBlock: string;
  intermediateEvent: string;
  subprocess: string;
  dataObject: string;
  annotation: string;
  canvasLibraryReady: string;
  select: string;
  panCanvas: string;
  tools: string;
  shapeLibrary: string;
  fitToCanvas: string;
  zoomOut: string;
  zoomIn: string;
  toggleInspector: string;
  fullscreenWorkspace: string;
  canvasLabel: string;
  drawioEditor: string;
  fixtureCanvas: string;
  exampleModel: string;
  nodesAndFlows: (nodes: number, flows: number) => string;
  pathCount: (count: number | null) => string;
  pathCountUnavailable: string;
  pathQuery: string;
  pathQueryDescription: string;
  pathQueryStart: string;
  pathQueryEnd: string;
  pathQueryAllEnds: string;
  pathQueryFormula: string;
  pathQueryNoRoute: string;
  pathQueryCycle: string;
  pathQueryLimit: string;
  pathQueryMissingStart: string;
  pathQueryMissingEnd: string;
  resetPathQuery: string;
  clickShape: string;
  selectionBridgeHint: string;
  dragToPan: string;
  refreshModel: string;
  nativeDrawio: string;
  analysisSummary: string;
  cycleTime: string;
  theoreticalTime: string;
  cte: string;
  cost: string;
  awaitingAnalysis: string;
  analysisQualityHint: string;
  decisionPoints: string;
  gatewayCount: (count: number) => string;
  method: string;
  bookFlowAnalysis: string;
  sampleValuesShown: string;
  inspector: string;
  inspectorDescription: string;
  closeInspector: string;
  label: string;
  semanticType: string;
  semanticHelp: string;
  timeInputs: string;
  minutes: string;
  processing: string;
  waiting: string;
  cycleMinutes: string;
  costInputs: string;
  hourlyRate: string;
  fixedCost: string;
  currency: string;
  resourcePool: string;
  resourceCount: string;
  branchBehavior: string;
  gatewayKind: string;
  probability: string;
  rework: string;
  percent: string;
  sampleValuesHint: string;
  exactlyOnePath: string;
  addProbabilities: string;
  sampleProbabilities: string;
  semanticReady: string;
  semanticReadyHint: string;
  nothingSelected: string;
  nothingSelectedHint: string;
  engineNotice: string;
  canvasReady: string;
  workerReady: string;
  fallbackCanvas: string;
  fallbackCanvasDescription: string;
  fallbackReadOnly: string;
  analysisCalculating: string;
  analysisFallback: string;
  schema: string;
  shapeTypes: Record<string, string>;
  exact: string;
  assumption: string;
  simulationRequired: string;
  formula: string;
  cycleFormulaLabel: string;
  theoreticalFormulaLabel: string;
  costFormulaLabel: string;
  assumptions: string;
  warnings: string;
  diagnostics: string;
  noWarnings: string;
  noAssumptions: string;
  exportPng: string;
  exportPngReport: string;
  exportSvg: string;
  exportJpg: string;
  exportJpeg: string;
  exportJpegReport: string;
  exportPdf: string;
  exportCsv: string;
  exportJson: string;
  exportFlowculus: string;
  exportDrawio: string;
  shareText: string;
  fileReady: string;
  fileError: string;
  fileTooLarge: string;
  emptyValue: string;
  noActivities: string;
  clearScenarioInputs: string;
  invalidNumber: string;
  invalidReworkProbability: string;
  invalidPositiveNumber: string;
  invalidInteger: string;
  saved: string;
  ready: string;
  error: string;
  capacityLoad: string;
  capacityPerDay: string;
  bottleneck: string;
  criticalPath: string;
  criticalPathUnavailable: string;
  criticalPathNeedsProcessing: string;
  utilization: string;
  scenario: string;
  scenarioDescription: string;
  scenarioInputs: string;
  arrivalRate: string;
  arrivalRateHint: string;
  workInProcess: string;
  workInProcessHint: string;
  workingHours: string;
  workingHoursHint: string;
  serviceRate: string;
  serviceRateHint: string;
  servers: string;
  serversHint: string;
  optional: string;
  scenarioFormula: string;
  scenarioSaved: string;
  queueModel: string;
  queueUtilization: string;
  averageQueue: string;
  averageWait: string;
  averageSystem: string;
  openImage: string;
  imageReference: string;
  imageReferenceDescription: string;
  imageFileHint: string;
  imageRecognitionUnavailable: string;
  drawioLoadError: string;
  retryEditor: string;
  removeImage: string;
  close: string;
  imageTooLarge: string;
  imageInvalid: string;
  /** Label for the page/tab navigation bar */
  pages: string;
  /** Tooltip for the "add page" button */
  addPage: string;
  formulaBreakdown: string;
  assumptionsAndContext: string;
  cycleTimeFormulaDesc: string;
  theoreticalTimeFormulaDesc: string;
  costFormulaDesc: string;
  cteFormulaDesc: string;
}

const EN: WorkspaceCopy = {
  brandTooltip: 'Flowculus: draw the flow, let the math do the sweating',
  brandSubtitle: 'Flow first. Math second.',
  brandBadge: 'ERP',
  languageName: 'English',
  languageShort: 'EN',
  nextLanguageName: 'Tiếng Việt',
  workspace: 'Workspace',
  modelName: 'Request handling flow',
  subtitle: 'Cycle-time analysis studio',
  openFile: 'Open file',
  dropFiles: 'Drop files to open',
  dropFilesHint: 'Flowculus, draw.io, JSON or CSV files are supported.',
  saveFile: 'Save file',
  shareFile: 'Share file',
  moreActions: 'More actions',
  moreTools: 'More canvas tools',
  exportFile: 'Export',
  importHint: 'Open a Flowculus, draw.io or CSV file',
  localDraft: 'Local draft',
  draftRestored: 'Local draft restored',
  draftSaveError: 'Draft could not be saved',
  draftSaving: 'Saving locally',
  localCopyExported: 'Local copy exported',
  selectedFile: (name) => `Selected ${name}`,
  shareSheetOpened: 'Share sheet opened',
  workspaceLinkCopied: 'Workspace link copied',
  shareCancelled: 'Share cancelled',
  preparingAnalysis: 'Preparing analysis',
  analysisPreviewReady: 'Analysis preview ready',
  analyze: 'Analyze',
  analyzing: 'Analyzing',
  useLightTheme: 'Use light theme',
  useDarkTheme: 'Use dark theme',
  switchLanguage: 'Switch language',
  collapsePalette: 'Collapse shape palette',
  expandPalette: 'Expand shape palette',
  expandResults: 'Show analysis results',
  collapseResults: 'Hide analysis results',
  resizeResults: 'Resize analysis results',
  resizeResultsHint: 'Drag the handle up or down to choose a comfortable results height.',
  analysisAutoUpdate: 'Results recalculate automatically after a model or input change.',
  analysisUpdated: 'Results updated just now',
  addShape: 'Add this shape to the canvas',
  dropShape: 'Drop to add the shape near the next open canvas slot',
  shapes: 'Shapes',
  shapesDescription: 'Choose semantic shapes for the canvas.',
  processShapes: 'Process shapes',
  chooseShape: 'Choose a shape',
  startEventHint: 'Start event',
  taskActivityHint: 'Task / activity',
  xorGateway: 'XOR gateway',
  andGateway: 'AND gateway',
  orGateway: 'OR gateway',
  eventBasedGateway: 'Event-based gateway',
  complexGateway: 'Complex gateway',
  endEventHint: 'End event',
  intermediateEventHint: 'Intermediate event',
  subprocessHint: 'Collapsed activity',
  dataObjectHint: 'Data input / output',
  annotationHint: 'Documentation',
  reworkHint: 'Loop / rework',
  entryPoint: 'Entry point',
  workActivity: 'Work activity',
  onePath: 'One path',
  parallelPaths: 'Parallel paths',
  inclusivePaths: 'Inclusive paths',
  eventChoice: 'Event-based choice',
  complexChoice: 'Complex gateway',
  exitPoint: 'Exit point',
  repeatBlock: 'Repeat a block',
  intermediateEvent: 'Intermediate event',
  subprocess: 'Subprocess',
  dataObject: 'Data object',
  annotation: 'Annotation',
  canvasLibraryReady: 'More shapes',
  select: 'Select',
  panCanvas: 'Pan canvas',
  tools: 'Tools',
  shapeLibrary: 'Shape library',
  fitToCanvas: 'Fit to canvas',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  toggleInspector: 'Toggle inspector',
  fullscreenWorkspace: 'Fullscreen workspace',
  canvasLabel: 'Process model canvas',
  drawioEditor: 'Canvas editor',
  fixtureCanvas: 'Preview canvas',
  exampleModel: 'Example model',
  nodesAndFlows: (nodes, flows) => `${nodes} nodes, ${flows} flows`,
  pathCount: (count) => `${count == null ? 'N/A' : count} paths`,
  pathCountUnavailable: 'Path count unavailable',
  pathQuery: 'Path query',
  pathQueryDescription: 'Count edge-distinct routes between two selected nodes.',
  pathQueryStart: 'Start node',
  pathQueryEnd: 'End node',
  pathQueryAllEnds: 'All terminal nodes',
  pathQueryFormula: 'Path-count formula',
  pathQueryNoRoute: 'No route reaches the selected end node.',
  pathQueryCycle: 'A cycle was detected; a finite path count is undefined.',
  pathQueryLimit: 'The path limit was reached; refine the segment or simplify the graph.',
  pathQueryMissingStart: 'The selected start node is no longer in this model.',
  pathQueryMissingEnd: 'The selected end node is no longer in this model.',
  resetPathQuery: 'Reset path query',
  clickShape: 'Click a shape to inspect it',
  selectionBridgeHint: 'Choose a semantic shape in Inspector to edit its inputs.',
  dragToPan: 'Drag to pan',
  refreshModel: 'Refresh semantic model',
  nativeDrawio: 'Canvas engine',
  analysisSummary: 'Analysis summary',
  cycleTime: 'Cycle time',
  theoreticalTime: 'Theoretical time',
  cte: 'Cycle-time efficiency',
  cost: 'Cost / execution',
  awaitingAnalysis: 'Awaiting analysis',
  analysisQualityHint:
    'Result quality reflects the graph structure and the assumptions declared in Inspector.',
  decisionPoints: 'Decision points',
  gatewayCount: (count) => `${count} decision gateway${count === 1 ? '' : 's'}`,
  method: 'Method',
  bookFlowAnalysis: 'Book flow analysis',
  sampleValuesShown: 'Sample values shown',
  inspector: 'Inspector',
  inspectorDescription: 'Properties for the selected shape.',
  closeInspector: 'Close inspector',
  label: 'Label',
  semanticType: 'Semantic type',
  semanticHelp: 'Semantic metadata is separate from visual styling',
  timeInputs: 'Time inputs',
  minutes: 'minutes',
  processing: 'Processing',
  waiting: 'Waiting',
  cycleMinutes: 'Cycle time',
  costInputs: 'Cost & capacity',
  hourlyRate: 'Hourly resource rate',
  fixedCost: 'Fixed cost / execution',
  currency: 'Currency',
  resourcePool: 'Resource pool',
  resourceCount: 'Pool size',
  branchBehavior: 'Branch behavior',
  gatewayKind: 'Gateway kind',
  probability: 'Branch probability',
  rework: 'Rework probability',
  percent: '%',
  sampleValuesHint: 'Replace sample values with observed averages.',
  exactlyOnePath: 'Exactly one outgoing path is selected.',
  addProbabilities: 'Add probabilities to outgoing connectors before analysis.',
  sampleProbabilities: 'Sample probabilities for the example model.',
  semanticReady: 'Semantic metadata ready',
  semanticReadyHint: 'This shape is ready to be mapped into the analysis model.',
  nothingSelected: 'Nothing selected',
  nothingSelectedHint:
    'Select a shape on the canvas to edit its label, timing and metadata.',
  engineNotice:
    'The calculation engine is connected. Results update as semantic data changes.',
  canvasReady: 'Canvas ready',
  workerReady: 'Worker-ready analysis',
  fallbackCanvas: 'Offline diagram preview',
  fallbackCanvasDescription:
    'The native editor is unavailable. This read-only preview keeps the model visible while you reconnect.',
  fallbackReadOnly: 'Read-only preview',
  analysisCalculating: 'Calculating in worker',
  analysisFallback: 'Browser fallback analysis',
  schema: 'schema',
  shapeTypes: {
    start: 'Start event',
    task: 'Task',
    gateway: 'Gateway',
    end: 'End event',
    event: 'Intermediate event',
    subprocess: 'Subprocess',
    data: 'Data object',
    annotation: 'Annotation',
    unknown: 'Unknown shape',
  },
  exact: 'Exact under assumptions',
  assumption: 'Assumption-based',
  simulationRequired: 'Simulation recommended',
  formula: 'Formula',
  cycleFormulaLabel: 'CT',
  theoreticalFormulaLabel: 'TCT',
  costFormulaLabel: 'Cost',
  assumptions: 'Assumptions',
  warnings: 'Warnings',
  diagnostics: 'Diagnostics',
  noWarnings: 'No warnings',
  noAssumptions: 'No extra assumptions',
  exportPng: 'PNG image',
  exportPngReport: 'PNG report with analysis',
  exportSvg: 'SVG image',
  exportJpg: 'JPG image',
  exportJpeg: 'JPEG image',
  exportJpegReport: 'JPEG report with analysis',
  exportPdf: 'PDF / print',
  exportCsv: 'CSV data',
  exportJson: 'Draw.io JSON',
  exportFlowculus: 'Flowculus JSON',
  exportDrawio: 'Draw.io XML',
  shareText: 'Flowculus process model',
  fileReady: 'File loaded',
  fileError: 'Could not read this file',
  fileTooLarge: 'This file is larger than 50 MB.',
  emptyValue: 'N/A',
  noActivities: 'No activities',
  clearScenarioInputs: 'Clear scenario inputs',
  invalidNumber: 'Enter a number greater than or equal to zero.',
  invalidReworkProbability:
    'Enter a rework probability from 0% up to (but not including) 100%.',
  invalidPositiveNumber: 'Enter a number greater than zero.',
  invalidInteger: 'Enter a whole number greater than or equal to one.',
  saved: 'Saved locally',
  ready: 'Ready',
  error: 'Error',
  capacityLoad: 'load',
  capacityPerDay: 'capacity / day',
  bottleneck: 'bottleneck',
  criticalPath: 'Critical path',
  criticalPathUnavailable: 'Critical Path Method is available for decision-free graphs.',
  criticalPathNeedsProcessing: 'Enter processing time for every task to calculate CPM.',
  utilization: 'utilization',
  scenario: 'Scenario inputs',
  scenarioDescription:
    'Add operating assumptions to explain capacity and queue behavior.',
  scenarioInputs: 'Operating assumptions',
  arrivalRate: 'Arrival rate',
  arrivalRateHint: 'Cases entering the process per hour',
  workInProcess: 'Work in process (WIP)',
  workInProcessHint: 'Average cases currently inside the process',
  workingHours: 'Working hours / day',
  workingHoursHint: 'Used for theoretical daily capacity',
  serviceRate: 'Service rate / server / hour',
  serviceRateHint: 'Optional queue model input',
  servers: 'Servers',
  serversHint: 'Optional M/M/c server count',
  optional: 'optional',
  scenarioFormula: 'Little’s Law: WIP = λ × CT',
  scenarioSaved: 'Scenario saved locally',
  queueModel: 'Queue model',
  queueUtilization: 'Queue utilization',
  averageQueue: 'Average queue length',
  averageWait: 'Average waiting time',
  averageSystem: 'Average time in system',
  openImage: 'Open diagram image',
  imageReference: 'Diagram image reference',
  imageReferenceDescription:
    'Keep a photo or screenshot beside the canvas while you map its shapes to semantic nodes.',
  imageFileHint: 'PNG, JPG or JPEG up to 15 MB',
  imageRecognitionUnavailable:
    'Automatic handwritten-shape recognition is not enabled yet. Review every gateway and connector before using it for analysis.',
  drawioLoadError:
    'The canvas editor could not be reached. Check the network connection and try again.',
  retryEditor: 'Reload canvas editor',
  removeImage: 'Remove image',
  close: 'Close',
  imageTooLarge: 'This image is larger than 15 MB.',
  imageInvalid: 'Choose a PNG, JPG or JPEG image.',
  pages: 'Pages',
  addPage: 'Add page',
  formulaBreakdown: 'Mathematical breakdown',
  assumptionsAndContext: 'Assumptions & context',
  cycleTimeFormulaDesc: 'CT = Processing + Waiting',
  theoreticalTimeFormulaDesc: 'TCT = Processing Time Only',
  costFormulaDesc: 'Cost = Labor + Resource fees',
  cteFormulaDesc: 'CTE = (TCT / CT) × 100%',
};

const VI: WorkspaceCopy = {
  ...EN,
  brandTooltip: 'Flowculus: vẽ luồng, để toán lo phần còn lại',
  brandSubtitle: 'Vẽ luồng. Để toán lo.',
  brandBadge: 'ERP',
  languageName: 'Tiếng Việt',
  languageShort: 'VI',
  nextLanguageName: 'English',
  workspace: 'Không gian làm việc',
  subtitle: 'Phân tích thời gian chu trình',
  openFile: 'Mở tệp',
  dropFiles: 'Thả tệp để mở',
  dropFilesHint: 'Hỗ trợ tệp Flowculus, draw.io, JSON hoặc CSV.',
  saveFile: 'Lưu tệp',
  shareFile: 'Chia sẻ tệp',
  moreActions: 'Thao tác khác',
  moreTools: 'Thêm công cụ canvas',
  exportFile: 'Xuất tệp',
  importHint: 'Mở tệp Flowculus, draw.io hoặc CSV',
  localDraft: 'Bản nháp cục bộ',
  draftRestored: 'Đã khôi phục bản nháp cục bộ',
  draftSaveError: 'Không thể lưu bản nháp',
  draftSaving: 'Đang lưu cục bộ',
  localCopyExported: 'Đã xuất bản sao cục bộ',
  selectedFile: (name) => `Đã chọn ${name}`,
  shareSheetOpened: 'Đã mở bảng chia sẻ',
  workspaceLinkCopied: 'Đã sao chép liên kết',
  shareCancelled: 'Đã hủy chia sẻ',
  preparingAnalysis: 'Đang chuẩn bị phân tích',
  analysisPreviewReady: 'Đã sẵn sàng xem trước phân tích',
  analyze: 'Phân tích',
  analyzing: 'Đang phân tích',
  useLightTheme: 'Dùng giao diện sáng',
  useDarkTheme: 'Dùng giao diện tối',
  switchLanguage: 'Đổi ngôn ngữ',
  collapsePalette: 'Thu gọn bảng hình',
  expandPalette: 'Mở rộng bảng hình',
  expandResults: 'Mở kết quả phân tích',
  collapseResults: 'Thu gọn kết quả phân tích',
  resizeResults: 'Điều chỉnh chiều cao kết quả phân tích',
  resizeResultsHint: 'Kéo tay nắm lên hoặc xuống để chọn chiều cao kết quả dễ xem.',
  analysisAutoUpdate: 'Kết quả tự tính lại sau khi đổi mô hình hoặc số liệu.',
  analysisUpdated: 'Kết quả vừa cập nhật',
  addShape: 'Thêm hình này vào canvas',
  dropShape: 'Thả để thêm hình vào vị trí trống tiếp theo trên canvas',
  shapes: 'Hình',
  shapesDescription: 'Chọn hình có ngữ nghĩa cho canvas.',
  processShapes: 'Hình quy trình',
  chooseShape: 'Chọn một hình',
  startEventHint: 'Sự kiện bắt đầu',
  taskActivityHint: 'Hoạt động / tác vụ',
  xorGateway: 'Gateway XOR',
  andGateway: 'Gateway AND',
  orGateway: 'Gateway OR',
  eventBasedGateway: 'Gateway theo sự kiện',
  complexGateway: 'Gateway phức tạp',
  endEventHint: 'Sự kiện kết thúc',
  intermediateEventHint: 'Sự kiện trung gian',
  subprocessHint: 'Hoạt động thu gọn',
  dataObjectHint: 'Dữ liệu vào / ra',
  annotationHint: 'Tài liệu mô tả',
  reworkHint: 'Vòng lặp / làm lại',
  entryPoint: 'Điểm bắt đầu',
  workActivity: 'Hoạt động',
  onePath: 'Một nhánh',
  parallelPaths: 'Nhánh song song',
  inclusivePaths: 'Nhánh OR bao hàm',
  eventChoice: 'Rẽ theo sự kiện',
  complexChoice: 'Gateway phức tạp',
  exitPoint: 'Điểm kết thúc',
  repeatBlock: 'Lặp lại một khối',
  intermediateEvent: 'Sự kiện trung gian',
  subprocess: 'Tiểu quy trình',
  dataObject: 'Đối tượng dữ liệu',
  annotation: 'Chú thích',
  canvasLibraryReady: 'Thêm hình',
  select: 'Chọn',
  panCanvas: 'Di chuyển canvas',
  tools: 'Công cụ',
  shapeLibrary: 'Thư viện hình',
  fitToCanvas: 'Vừa canvas',
  zoomOut: 'Thu nhỏ',
  zoomIn: 'Phóng to',
  toggleInspector: 'Bật/tắt thuộc tính',
  fullscreenWorkspace: 'Toàn màn hình',
  canvasLabel: 'Canvas mô hình quy trình',
  drawioEditor: 'Trình vẽ canvas',
  fixtureCanvas: 'Canvas xem trước',
  exampleModel: 'Mô hình ví dụ',
  nodesAndFlows: (nodes, flows) => `${nodes} nút, ${flows} luồng`,
  pathCount: (count) => `${count == null ? 'N/A' : count} đường đi`,
  pathCountUnavailable: 'Không thể đếm đường đi',
  pathQuery: 'Truy vấn đường đi',
  pathQueryDescription:
    'Đếm các tuyến đường phân biệt theo connector giữa hai nút đã chọn.',
  pathQueryStart: 'Nút bắt đầu',
  pathQueryEnd: 'Nút kết thúc',
  pathQueryAllEnds: 'Tất cả nút kết thúc',
  pathQueryFormula: 'Công thức đếm đường đi',
  pathQueryNoRoute: 'Không có tuyến nào đi tới nút kết thúc đã chọn.',
  pathQueryCycle: 'Phát hiện vòng lặp; số đường đi hữu hạn không xác định.',
  pathQueryLimit: 'Đã chạm giới hạn đếm; hãy thu hẹp đoạn hoặc đơn giản hóa đồ thị.',
  pathQueryMissingStart: 'Nút bắt đầu đã chọn không còn trong mô hình.',
  pathQueryMissingEnd: 'Nút kết thúc đã chọn không còn trong mô hình.',
  resetPathQuery: 'Đặt lại truy vấn đường đi',
  clickShape: 'Nhấn vào hình để xem thuộc tính',
  selectionBridgeHint: 'Chọn hình ngữ nghĩa trong Thuộc tính để sửa thông tin.',
  dragToPan: 'Kéo để di chuyển',
  refreshModel: 'Làm mới mô hình ngữ nghĩa',
  nativeDrawio: 'Engine canvas',
  analysisSummary: 'Tóm tắt phân tích',
  cycleTime: 'Thời gian chu trình',
  theoreticalTime: 'Thời gian lý thuyết',
  cte: 'Hiệu suất chu trình',
  cost: 'Chi phí / lần chạy',
  awaitingAnalysis: 'Chờ phân tích',
  analysisQualityHint:
    'Độ tin cậy phản ánh cấu trúc đồ thị và các giả định đã khai báo trong Thuộc tính.',
  decisionPoints: 'Điểm quyết định',
  gatewayCount: (count) => `${count} điểm quyết định`,
  method: 'Phương pháp',
  bookFlowAnalysis: 'Phân tích luồng theo sách',
  sampleValuesShown: 'Đang hiển thị số mẫu',
  inspector: 'Thuộc tính',
  inspectorDescription: 'Thuộc tính của hình đang chọn.',
  closeInspector: 'Đóng bảng thuộc tính',
  label: 'Nhãn',
  semanticType: 'Loại ngữ nghĩa',
  semanticHelp: 'Metadata ngữ nghĩa độc lập với kiểu trình bày',
  timeInputs: 'Thông tin thời gian',
  minutes: 'phút',
  processing: 'Xử lý',
  waiting: 'Chờ',
  cycleMinutes: 'Thời gian chu trình',
  costInputs: 'Chi phí & năng lực',
  hourlyRate: 'Đơn giá nguồn lực / giờ',
  fixedCost: 'Chi phí cố định / lần chạy',
  currency: 'Tiền tệ',
  resourcePool: 'Nhóm nguồn lực',
  resourceCount: 'Số lượng nguồn lực',
  branchBehavior: 'Cách rẽ nhánh',
  gatewayKind: 'Loại gateway',
  probability: 'Xác suất nhánh',
  rework: 'Xác suất làm lại',
  percent: '%',
  sampleValuesHint: 'Thay số mẫu bằng trung bình quan sát được.',
  exactlyOnePath: 'Chỉ một luồng ra được chọn.',
  addProbabilities: 'Thêm xác suất cho connector trước khi phân tích.',
  sampleProbabilities: 'Xác suất mẫu của mô hình ví dụ.',
  semanticReady: 'Metadata ngữ nghĩa sẵn sàng',
  semanticReadyHint: 'Hình này đã sẵn sàng ánh xạ vào mô hình phân tích.',
  nothingSelected: 'Chưa chọn hình',
  nothingSelectedHint: 'Chọn một hình trên canvas để sửa nhãn, thời gian và metadata.',
  engineNotice: 'Engine tính toán đã kết nối. Kết quả cập nhật theo dữ liệu ngữ nghĩa.',
  canvasReady: 'Canvas sẵn sàng',
  workerReady: 'Phân tích sẵn sàng chạy worker',
  fallbackCanvas: 'Bản xem trước sơ đồ ngoại tuyến',
  fallbackCanvasDescription:
    'Trình vẽ gốc hiện không khả dụng. Bản xem trước chỉ đọc vẫn giữ mô hình hiển thị trong lúc kết nối lại.',
  fallbackReadOnly: 'Bản xem trước chỉ đọc',
  analysisCalculating: 'Đang tính trong worker',
  analysisFallback: 'Phân tích dự phòng trên trình duyệt',
  schema: 'schema',
  shapeTypes: {
    start: 'Sự kiện bắt đầu',
    task: 'Hoạt động',
    gateway: 'Gateway',
    end: 'Sự kiện kết thúc',
    event: 'Sự kiện trung gian',
    subprocess: 'Tiểu quy trình',
    data: 'Đối tượng dữ liệu',
    annotation: 'Chú thích',
    unknown: 'Hình chưa nhận dạng',
  },
  exact: 'Chính xác theo giả định',
  assumption: 'Dựa trên giả định',
  simulationRequired: 'Nên mô phỏng',
  formula: 'Công thức',
  cycleFormulaLabel: 'CT',
  theoreticalFormulaLabel: 'TCT',
  costFormulaLabel: 'Chi phí',
  assumptions: 'Giả định',
  warnings: 'Cảnh báo',
  diagnostics: 'Chẩn đoán',
  noWarnings: 'Không có cảnh báo',
  noAssumptions: 'Không có giả định bổ sung',
  exportPng: 'Ảnh PNG',
  exportPngReport: 'Báo cáo phân tích PNG',
  exportSvg: 'Ảnh SVG',
  exportJpg: 'Ảnh JPG',
  exportJpeg: 'Ảnh JPEG',
  exportJpegReport: 'Báo cáo phân tích JPEG',
  exportPdf: 'PDF / in',
  exportCsv: 'Dữ liệu CSV',
  exportJson: 'JSON draw.io',
  exportFlowculus: 'JSON Flowculus',
  exportDrawio: 'XML draw.io',
  shareText: 'Mô hình quy trình Flowculus',
  fileReady: 'Đã tải tệp',
  fileError: 'Không thể đọc tệp này',
  fileTooLarge: 'Tệp lớn hơn 50 MB.',
  emptyValue: 'N/A',
  noActivities: 'Chưa có hoạt động',
  clearScenarioInputs: 'Xóa thiết lập kịch bản',
  invalidNumber: 'Nhập số lớn hơn hoặc bằng 0.',
  invalidReworkProbability: 'Nhập xác suất làm lại từ 0% đến dưới 100%.',
  invalidPositiveNumber: 'Nhập số lớn hơn 0.',
  invalidInteger: 'Nhập số nguyên lớn hơn hoặc bằng 1.',
  saved: 'Đã lưu cục bộ',
  ready: 'Sẵn sàng',
  error: 'Lỗi',
  capacityLoad: 'tải',
  capacityPerDay: 'năng lực / ngày',
  bottleneck: 'nút thắt',
  criticalPath: 'Đường găng',
  criticalPathUnavailable:
    'Phương pháp đường găng áp dụng cho đồ thị không có điểm quyết định.',
  criticalPathNeedsProcessing:
    'Nhập thời gian xử lý cho mọi hoạt động để tính đường găng.',
  utilization: 'mức sử dụng',
  scenario: 'Thiết lập kịch bản',
  scenarioDescription:
    'Thêm giả định vận hành để giải thích năng lực và hành vi hàng đợi.',
  scenarioInputs: 'Giả định vận hành',
  arrivalRate: 'Tốc độ đến',
  arrivalRateHint: 'Số trường hợp vào quy trình mỗi giờ',
  workInProcess: 'Công việc đang xử lý (WIP)',
  workInProcessHint: 'Số trường hợp trung bình đang ở trong quy trình',
  workingHours: 'Giờ làm việc / ngày',
  workingHoursHint: 'Dùng để tính năng lực lý thuyết mỗi ngày',
  serviceRate: 'Tốc độ phục vụ / nguồn lực / giờ',
  serviceRateHint: 'Tuỳ chọn cho mô hình hàng đợi',
  servers: 'Số nguồn phục vụ',
  serversHint: 'Tuỳ chọn cho mô hình M/M/c',
  optional: 'tuỳ chọn',
  scenarioFormula: 'Định luật Little: WIP = λ × CT',
  scenarioSaved: 'Đã lưu kịch bản cục bộ',
  queueModel: 'Mô hình hàng đợi',
  queueUtilization: 'Mức sử dụng hàng đợi',
  averageQueue: 'Độ dài hàng đợi trung bình',
  averageWait: 'Thời gian chờ trung bình',
  averageSystem: 'Thời gian trong hệ thống',
  openImage: 'Mở ảnh sơ đồ',
  imageReference: 'Ảnh tham chiếu sơ đồ',
  imageReferenceDescription:
    'Giữ ảnh chụp hoặc ảnh màn hình cạnh canvas khi ánh xạ hình thành nút ngữ nghĩa.',
  imageFileHint: 'PNG, JPG hoặc JPEG tối đa 15 MB',
  imageRecognitionUnavailable:
    'Tính năng nhận dạng hình viết tay tự động chưa bật. Hãy kiểm tra từng gateway và connector trước khi phân tích.',
  drawioLoadError: 'Không thể kết nối trình vẽ canvas. Hãy kiểm tra mạng rồi thử lại.',
  retryEditor: 'Tải lại trình vẽ canvas',
  removeImage: 'Xóa ảnh',
  close: 'Đóng',
  imageTooLarge: 'Ảnh lớn hơn 15 MB.',
  imageInvalid: 'Hãy chọn ảnh PNG, JPG hoặc JPEG.',
  pages: 'Trang',
  addPage: 'Thêm trang',
  formulaBreakdown: 'Chi tiết công thức tính toán',
  assumptionsAndContext: 'Giả định & bối cảnh',
  cycleTimeFormulaDesc: 'CT = Thời gian xử lý + Thời gian chờ',
  theoreticalTimeFormulaDesc: 'TCT = Chỉ tính thời gian xử lý thực',
  costFormulaDesc: 'Chi phí = Nhân công + Tài nguyên',
  cteFormulaDesc: 'CTE = (TCT / CT) × 100%',
};

export const getWorkspaceCopy = (locale: Locale): WorkspaceCopy =>
  locale === 'vi' ? VI : EN;
