import type { MiningPresetId } from '@flowculus/process-mining';

import type { SemanticShapeTool } from '@/lib/shape-tools';

export type Locale = 'en' | 'vi';

export interface WorkspaceCopy {
  brandTooltip: string;
  nextLanguageName: string;
  workspace: string;
  modelName: string;
  subtitle: string;
  openFile: string;
  dropFiles: string;
  dropFilesHint: string;
  saveFile: string;
  shareFile: string;
  exportFile: string;
  importHint: string;
  localDraft: string;
  draftSaveError: string;
  draftSaving: string;
  localCopyExported: string;
  shareSheetOpened: string;
  workspaceLinkCopied: string;
  shareCancelled: string;
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
  select: string;
  panCanvas: string;
  tools: string;
  fitToCanvas: string;
  zoomOut: string;
  zoomIn: string;
  toggleInspector: string;
  canvasLabel: string;
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
  resetPathQuery: string;
  analysisSummary: string;
  cycleTime: string;
  theoreticalTime: string;
  cte: string;
  cost: string;
  analysisQualityHint: string;
  gatewayCount: (count: number) => string;
  method: string;
  bookFlowAnalysis: string;
  inspector: string;
  inspectorDescription: string;
  closeInspector: string;
  label: string;
  semanticType: string;
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
  exactlyOnePath: string;
  addProbabilities: string;
  nothingSelected: string;
  nothingSelectedHint: string;
  engineNotice: string;
  canvasReady: string;
  workerReady: string;
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
  noWarnings: string;
  noAssumptions: string;
  exportPng: string;
  exportPngReport: string;
  exportSvg: string;
  exportJpeg: string;
  exportJpegReport: string;
  exportPdf: string;
  exportCsv: string;
  exportFlowculus: string;
  exportDrawio: string;
  shareText: string;
  fileReady: string;
  fileError: string;
  fileTooLarge: string;
  emptyValue: string;
  clearScenarioInputs: string;
  invalidNumber: string;
  invalidReworkProbability: string;
  invalidPositiveNumber: string;
  invalidInteger: string;
  ready: string;
  error: string;
  capacityLoad: string;
  capacityPerDay: string;
  bottleneck: string;
  criticalPath: string;
  criticalPathNeedsProcessing: string;
  scenario: string;
  scenarioDescription: string;
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
  removeImage: string;
  close: string;
  imageTooLarge: string;
  imageInvalid: string;
  pages: string;
  formulaBreakdown: string;
  assumptionsAndContext: string;
  cycleTimeFormulaDesc: string;
  theoreticalTimeFormulaDesc: string;
  costFormulaDesc: string;
  cteFormulaDesc: string;
  associationFlow: string;
  cancel: string;
  condition: string;
  confirmType: string;
  criticalChainDominant: string;
  criticalChainExact: string;
  defaultNodeLabels: Record<SemanticShapeTool, string>;
  deleteElement: string;
  deleteSelection: string;
  exportSectionData: string;
  exportSectionDiagram: string;
  exportSectionReport: string;
  flowKind: string;
  inferredBadge: string;
  inferredTypeHint: string;
  invalidProbability: string;
  littleLawForecast: string;
  liveKpiHint: string;
  mappingActivity: string;
  mappingCaseId: string;
  mappingChoose: string;
  mappingConfirm: string;
  mappingCost: string;
  mappingDescription: (fileName: string, format: string, rows: number) => string;
  mappingIncomplete: string;
  mappingLifecycle: string;
  mappingNone: string;
  mappingPreview: string;
  mappingResource: string;
  mappingStartTimestamp: string;
  mappingTimestamp: string;
  mappingTitle: string;
  messageFlow: string;
  minedModelTitle: string;
  minimap: string;
  miningActivities: string;
  miningActivityThreshold: string;
  miningBottlenecks: string;
  miningBottlenecksHint: string;
  miningCases: string;
  miningCasesShort: string;
  miningDownloadCsv: string;
  miningDuration: string;
  miningDurationThreshold: string;
  miningEdgeMetric: string;
  miningEdgeThreshold: string;
  miningEmpty: string;
  miningEnd: string;
  miningEvents: string;
  miningFilters: string;
  miningFrequency: string;
  miningHandoverDelay: string;
  miningHappyPath: string;
  miningHappyPathBadge: string;
  miningHappyPathHint: string;
  miningHidden: (activities: number, edges: number) => string;
  miningInsights: string;
  miningLeadTime: string;
  miningLegendBottleneck: string;
  miningLegendFast: string;
  miningLegendSlow: string;
  miningLoading: string;
  miningLoopBadge: string;
  miningMap: string;
  miningMedian: string;
  miningMoreVariants: (count: number) => string;
  miningNoBottlenecks: string;
  miningNoStartTimes: string;
  miningOfTotal: string;
  miningPeriod: string;
  miningPresets: Record<MiningPresetId, { name: string; description: string }>;
  miningResetFilters: string;
  miningSendToCanvas: string;
  miningSendToCanvasHint: string;
  miningServiceTime: string;
  miningSkipped: (rows: number, timestamps: number) => string;
  miningSource: string;
  miningSourceHint: string;
  miningStart: string;
  miningSteps: string;
  miningSummary: string;
  miningUpload: string;
  miningUploadHint: string;
  miningVariants: string;
  miningVariantsHint: string;
  minutesShort: string;
  modeMining: string;
  modeModel: string;
  modelNeedsAttention: string;
  multipleSelected: (count: number) => string;
  noSelectionOption: string;
  nodeQuickActions: string;
  paletteDragHint: string;
  probabilityOnlyForDecisions: string;
  quickAddEnd: string;
  quickAddGateway: string;
  quickAddTask: string;
  quickEnd: string;
  quickGateway: string;
  quickTask: string;
  redo: string;
  resetZoom: string;
  resourcePools: string;
  sequenceFlow: string;
  timeInputsHint: string;
  undo: string;
  workspaceMode: string;
}

const EN: WorkspaceCopy = {
  brandTooltip: 'Flowculus: draw the flow, let the math do the sweating',
  nextLanguageName: 'Tiếng Việt',
  workspace: 'Workspace',
  modelName: 'Request handling flow',
  subtitle: 'Cycle-time analysis studio',
  openFile: 'Open file',
  dropFiles: 'Drop files to open',
  dropFilesHint:
    'Flowculus, draw.io, process CSV and CSV/JSON/XES event logs are supported.',
  saveFile: 'Save as .drawio',
  shareFile: 'Share file',
  exportFile: 'Export',
  importHint: 'Open a Flowculus, draw.io, CSV or event-log file',
  localDraft: 'Local draft',
  draftSaveError: 'Draft could not be saved',
  draftSaving: 'Saving locally',
  localCopyExported: 'Local copy exported',
  shareSheetOpened: 'Share sheet opened',
  workspaceLinkCopied: 'Workspace link copied',
  shareCancelled: 'Share cancelled',
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
  shapes: 'Shapes',
  shapesDescription: 'Drag BPMN 2.0 elements onto the canvas.',
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
  subprocessHint: 'Collapsed subprocess',
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
  select: 'Select',
  panCanvas: 'Pan canvas',
  tools: 'Tools',
  fitToCanvas: 'Fit to canvas',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  toggleInspector: 'Toggle inspector',
  canvasLabel: 'Process model canvas',
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
  resetPathQuery: 'Reset path query',
  analysisSummary: 'Analysis summary',
  cycleTime: 'Cycle time',
  theoreticalTime: 'Theoretical time',
  cte: 'Cycle-time efficiency',
  cost: 'Cost / execution',
  analysisQualityHint:
    'Result quality reflects the graph structure and the assumptions declared in Inspector.',
  gatewayCount: (count) => `${count} decision gateway${count === 1 ? '' : 's'}`,
  method: 'Method',
  bookFlowAnalysis: 'Book flow analysis',
  inspector: 'Inspector',
  inspectorDescription: 'Properties for the selected shape or connector.',
  closeInspector: 'Close inspector',
  label: 'Label',
  semanticType: 'Semantic type',
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
  exactlyOnePath: 'Exactly one outgoing path is selected.',
  addProbabilities: 'Add probabilities to outgoing connectors before analysis.',
  nothingSelected: 'Nothing selected',
  nothingSelectedHint:
    'Select a shape or connector on the canvas to edit its label, timing and metadata.',
  engineNotice:
    'Results update automatically as you edit the model. Formulas run in a background worker.',
  canvasReady: 'Canvas ready',
  workerReady: 'Worker-ready analysis',
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
  noWarnings: 'No warnings',
  noAssumptions: 'No extra assumptions',
  exportPng: 'PNG image (high-res)',
  exportPngReport: 'PNG report with analysis',
  exportSvg: 'SVG vector image',
  exportJpeg: 'JPEG image',
  exportJpegReport: 'JPEG report with analysis',
  exportPdf: 'PDF analysis report',
  exportCsv: 'CSV (nodes + edges)',
  exportFlowculus: 'Flowculus JSON',
  exportDrawio: 'draw.io file (.drawio)',
  shareText: 'Flowculus process model',
  fileReady: 'File loaded',
  fileError: 'Could not read this file',
  fileTooLarge: 'This file is larger than 50 MB.',
  emptyValue: 'N/A',
  clearScenarioInputs: 'Clear scenario inputs',
  invalidNumber: 'Enter a number greater than or equal to zero.',
  invalidReworkProbability:
    'Enter a rework probability from 0% up to (but not including) 100%.',
  invalidPositiveNumber: 'Enter a number greater than zero.',
  invalidInteger: 'Enter a whole number greater than or equal to one.',
  ready: 'Ready',
  error: 'Error',
  capacityLoad: 'load',
  capacityPerDay: 'capacity / day',
  bottleneck: 'bottleneck',
  criticalPath: 'Critical path',
  criticalPathNeedsProcessing: 'Enter processing time for every task to calculate CPM.',
  scenario: 'Scenario inputs',
  scenarioDescription:
    'Add operating assumptions to explain capacity and queue behavior.',
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
  removeImage: 'Remove image',
  close: 'Close',
  imageTooLarge: 'This image is larger than 15 MB.',
  imageInvalid: 'Choose a PNG, JPG or JPEG image.',
  pages: 'Pages',
  formulaBreakdown: 'Mathematical breakdown',
  assumptionsAndContext: 'Assumptions & context',
  cycleTimeFormulaDesc: 'CT = Processing + Waiting',
  theoreticalTimeFormulaDesc: 'TCT = Processing Time Only',
  costFormulaDesc: 'Cost = Labor + Resource fees',
  cteFormulaDesc: 'CTE = (TCT / CT) × 100%',
  associationFlow: 'Association',
  cancel: 'Cancel',
  condition: 'Condition / label',
  confirmType: 'Confirm type',
  criticalChainDominant: 'Dominant expected path (assumption)',
  criticalChainExact: 'Critical path (exact)',
  defaultNodeLabels: {
    start: 'Start',
    task: 'New task',
    xor: 'Decision?',
    and: 'Parallel split',
    or: 'Inclusive split',
    eventBased: 'Wait for event',
    complex: 'Complex rule',
    end: 'End',
    event: 'Intermediate event',
    subprocess: 'Subprocess',
    data: 'Document',
    annotation: 'Note',
    rework: 'Rework task',
  },
  deleteElement: 'Delete',
  deleteSelection: 'Delete selection',
  exportSectionData: 'Data',
  exportSectionDiagram: 'Diagram',
  exportSectionReport: 'Report',
  flowKind: 'Flow type',
  inferredBadge: 'Type inferred from the imported shape; confirm it in Inspector',
  inferredTypeHint:
    'This type was inferred from the imported shape or mined from a log. Confirm it so the analysis can be reported as exact.',
  invalidProbability: 'Enter a probability from 0% to 100%.',
  littleLawForecast: 'Little’s Law forecast from the model',
  liveKpiHint: 'Live result, recalculated on every change. Click to open the analysis.',
  mappingActivity: 'Activity',
  mappingCaseId: 'Case ID',
  mappingChoose: 'Choose a column',
  mappingConfirm: 'Mine this log',
  mappingCost: 'Cost',
  mappingDescription: (fileName, format, rows) =>
    `${fileName} · ${format} · ${rows} rows. Tell Flowculus which columns identify the case, the activity and the time.`,
  mappingIncomplete:
    'Choose three different columns for Case ID, Activity and Timestamp.',
  mappingLifecycle: 'Lifecycle (start/complete)',
  mappingNone: 'Not in this log',
  mappingPreview: 'First rows of the uploaded log',
  mappingResource: 'Resource',
  mappingStartTimestamp: 'Start timestamp',
  mappingTimestamp: 'Timestamp (complete)',
  mappingTitle: 'Map event-log columns',
  messageFlow: 'Message flow',
  minedModelTitle: 'Model mined from the event log — review before sharing',
  minimap: 'Canvas overview',
  miningActivities: 'Activities',
  miningActivityThreshold: 'Activity frequency',
  miningBottlenecks: 'Bottlenecks',
  miningBottlenecksHint: 'Slowest hand-overs between consecutive steps, by mean delay.',
  miningCases: 'Cases',
  miningCasesShort: 'cases',
  miningDownloadCsv: 'Log as CSV',
  miningDuration: 'Mean time',
  miningDurationThreshold: 'Transition time',
  miningEdgeMetric: 'Edge label',
  miningEdgeThreshold: 'Path frequency',
  miningEmpty: 'Choose a sample log or upload one to discover the process.',
  miningEnd: 'End',
  miningEvents: 'Events',
  miningFilters: 'Filters',
  miningFrequency: 'Frequency',
  miningHandoverDelay: 'Hand-over delay',
  miningHappyPath: 'Happy path',
  miningHappyPathBadge: 'Happy path',
  miningHappyPathHint: 'Most frequent loop-free variant',
  miningHidden: (activities, edges) =>
    `${activities} activities and ${edges} paths hidden by the filters.`,
  miningInsights: 'Variants and bottlenecks',
  miningLeadTime: 'Mean lead time',
  miningLegendBottleneck: 'Bottleneck',
  miningLegendFast: 'Fast',
  miningLegendSlow: 'Slow',
  miningLoading: 'Discovering…',
  miningLoopBadge: 'Loop',
  miningMap: 'Directly-follows graph',
  miningMedian: 'median',
  miningMoreVariants: (count) => `${count} more variants are not listed.`,
  miningNoBottlenecks: 'No delays were measured in this log.',
  miningNoStartTimes: 'Without start times, delays include the work itself.',
  miningOfTotal: 'of all delay',
  miningPeriod: 'Log period',
  miningPresets: {
    'order-to-cash': {
      name: 'Order-to-Cash',
      description: 'Sales orders from credit check to payment',
    },
    'procure-to-pay': {
      name: 'Procure-to-Pay',
      description: 'Requisitions, purchase orders and invoice matching',
    },
    'it-service-desk': {
      name: 'IT Service Desk',
      description: 'Tickets with escalation and reopen loops',
    },
    'is6003-delivery': {
      name: 'IS6003 delivery log',
      description: 'FEAT_301/302 from the course report (Jira + Git)',
    },
  },
  miningResetFilters: 'Reset filters',
  miningSendToCanvas: 'Send to BPMN canvas',
  miningSendToCanvasHint:
    'Converts the filtered map into a BPMN model (XOR gateways from frequencies, rework from repeats) to calculate CT, TCT and CTE.',
  miningServiceTime: 'Service time',
  miningSkipped: (rows, timestamps) =>
    `${rows} rows without case/activity and ${timestamps} rows with unreadable timestamps were skipped.`,
  miningSource: 'Event log',
  miningSourceHint:
    'Start from a sample log or upload an ERP, CRM or service-desk export.',
  miningStart: 'Start',
  miningSteps: 'steps',
  miningSummary: 'Event-log summary',
  miningUpload: 'Upload log',
  miningUploadHint: 'CSV, JSON or XES. Columns are mapped in the next step.',
  miningVariants: 'Variants',
  miningVariantsHint:
    'Each variant is one distinct order of activities. Select one to trace it on the map.',
  minutesShort: 'min',
  modeMining: 'Mining',
  modeModel: 'Model',
  modelNeedsAttention: 'Model needs attention',
  multipleSelected: (count) => `${count} elements selected`,
  noSelectionOption: '— Nothing selected —',
  nodeQuickActions: 'Quick actions',
  paletteDragHint:
    'Drag a shape onto the canvas or click to add it in the centre. Double-click a shape to rename it.',
  probabilityOnlyForDecisions: 'Probabilities are used on XOR/OR gateway branches.',
  quickAddEnd: 'Add an end event after this step',
  quickAddGateway: 'Add a decision gateway after this step',
  quickAddTask: 'Add a task after this step',
  quickEnd: 'End',
  quickGateway: 'Gateway',
  quickTask: 'Task',
  redo: 'Redo',
  resetZoom: 'Reset zoom to 100%',
  resourcePools: 'Resource pools (capacity and M/M/c queue)',
  sequenceFlow: 'Sequence flow',
  timeInputsHint:
    'CT = T + Wq. Leave cycle time empty to derive it from processing and waiting.',
  undo: 'Undo',
  workspaceMode: 'Workspace mode',
};

const VI: WorkspaceCopy = {
  brandTooltip: 'Flowculus: vẽ luồng, để toán lo phần còn lại',
  nextLanguageName: 'English',
  workspace: 'Không gian làm việc',
  modelName: 'Quy trình xử lý yêu cầu',
  subtitle: 'Phân tích thời gian chu trình',
  openFile: 'Mở tệp',
  dropFiles: 'Thả tệp để mở',
  dropFilesHint:
    'Hỗ trợ tệp Flowculus, draw.io, CSV mô hình và nhật ký sự kiện CSV/JSON/XES.',
  saveFile: 'Lưu thành .drawio',
  shareFile: 'Chia sẻ tệp',
  exportFile: 'Xuất tệp',
  importHint: 'Mở tệp Flowculus, draw.io, CSV hoặc nhật ký sự kiện',
  localDraft: 'Bản nháp cục bộ',
  draftSaveError: 'Không thể lưu bản nháp',
  draftSaving: 'Đang lưu cục bộ',
  localCopyExported: 'Đã xuất bản sao cục bộ',
  shareSheetOpened: 'Đã mở bảng chia sẻ',
  workspaceLinkCopied: 'Đã sao chép liên kết',
  shareCancelled: 'Đã hủy chia sẻ',
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
  shapes: 'Hình',
  shapesDescription: 'Kéo phần tử BPMN 2.0 vào canvas.',
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
  subprocessHint: 'Quy trình con thu gọn',
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
  select: 'Chọn',
  panCanvas: 'Di chuyển canvas',
  tools: 'Công cụ',
  fitToCanvas: 'Vừa canvas',
  zoomOut: 'Thu nhỏ',
  zoomIn: 'Phóng to',
  toggleInspector: 'Bật/tắt thuộc tính',
  canvasLabel: 'Canvas mô hình quy trình',
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
  resetPathQuery: 'Đặt lại truy vấn đường đi',
  analysisSummary: 'Tóm tắt phân tích',
  cycleTime: 'Thời gian chu trình',
  theoreticalTime: 'Thời gian lý thuyết',
  cte: 'Hiệu suất chu trình',
  cost: 'Chi phí / lần chạy',
  analysisQualityHint:
    'Độ tin cậy phản ánh cấu trúc đồ thị và các giả định đã khai báo trong Thuộc tính.',
  gatewayCount: (count) => `${count} điểm quyết định`,
  method: 'Phương pháp',
  bookFlowAnalysis: 'Phân tích luồng theo sách',
  inspector: 'Thuộc tính',
  inspectorDescription: 'Thuộc tính của hình hoặc đường nối đang chọn.',
  closeInspector: 'Đóng bảng thuộc tính',
  label: 'Nhãn',
  semanticType: 'Loại ngữ nghĩa',
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
  exactlyOnePath: 'Chỉ một luồng ra được chọn.',
  addProbabilities: 'Thêm xác suất cho connector trước khi phân tích.',
  nothingSelected: 'Chưa chọn hình',
  nothingSelectedHint:
    'Chọn một hình hoặc đường nối trên canvas để sửa nhãn, thời gian và metadata.',
  engineNotice:
    'Kết quả tự cập nhật khi bạn sửa mô hình. Công thức chạy trong worker nền.',
  canvasReady: 'Canvas sẵn sàng',
  workerReady: 'Phân tích sẵn sàng chạy worker',
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
  noWarnings: 'Không có cảnh báo',
  noAssumptions: 'Không có giả định bổ sung',
  exportPng: 'Ảnh PNG (độ nét cao)',
  exportPngReport: 'Báo cáo phân tích PNG',
  exportSvg: 'Ảnh vector SVG',
  exportJpeg: 'Ảnh JPEG',
  exportJpegReport: 'Báo cáo phân tích JPEG',
  exportPdf: 'Báo cáo phân tích PDF',
  exportCsv: 'CSV (nút + cạnh)',
  exportFlowculus: 'JSON Flowculus',
  exportDrawio: 'Tệp draw.io (.drawio)',
  shareText: 'Mô hình quy trình Flowculus',
  fileReady: 'Đã tải tệp',
  fileError: 'Không thể đọc tệp này',
  fileTooLarge: 'Tệp lớn hơn 50 MB.',
  emptyValue: 'N/A',
  clearScenarioInputs: 'Xóa thiết lập kịch bản',
  invalidNumber: 'Nhập số lớn hơn hoặc bằng 0.',
  invalidReworkProbability: 'Nhập xác suất làm lại từ 0% đến dưới 100%.',
  invalidPositiveNumber: 'Nhập số lớn hơn 0.',
  invalidInteger: 'Nhập số nguyên lớn hơn hoặc bằng 1.',
  ready: 'Sẵn sàng',
  error: 'Lỗi',
  capacityLoad: 'tải',
  capacityPerDay: 'năng lực / ngày',
  bottleneck: 'nút thắt',
  criticalPath: 'Đường găng',
  criticalPathNeedsProcessing:
    'Nhập thời gian xử lý cho mọi hoạt động để tính đường găng.',
  scenario: 'Thiết lập kịch bản',
  scenarioDescription:
    'Thêm giả định vận hành để giải thích năng lực và hành vi hàng đợi.',
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
  removeImage: 'Xóa ảnh',
  close: 'Đóng',
  imageTooLarge: 'Ảnh lớn hơn 15 MB.',
  imageInvalid: 'Hãy chọn ảnh PNG, JPG hoặc JPEG.',
  pages: 'Trang',
  formulaBreakdown: 'Chi tiết công thức tính toán',
  assumptionsAndContext: 'Giả định & bối cảnh',
  cycleTimeFormulaDesc: 'CT = Thời gian xử lý + Thời gian chờ',
  theoreticalTimeFormulaDesc: 'TCT = Chỉ tính thời gian xử lý thực',
  costFormulaDesc: 'Chi phí = Nhân công + Tài nguyên',
  cteFormulaDesc: 'CTE = (TCT / CT) × 100%',
  associationFlow: 'Liên kết (association)',
  cancel: 'Hủy',
  condition: 'Điều kiện / nhãn',
  confirmType: 'Xác nhận loại',
  criticalChainDominant: 'Nhánh kỳ vọng chi phối (giả định)',
  criticalChainExact: 'Đường găng (chính xác)',
  defaultNodeLabels: {
    start: 'Bắt đầu',
    task: 'Tác vụ mới',
    xor: 'Quyết định?',
    and: 'Tách song song',
    or: 'Tách bao hàm',
    eventBased: 'Chờ sự kiện',
    complex: 'Quy tắc phức tạp',
    end: 'Kết thúc',
    event: 'Sự kiện trung gian',
    subprocess: 'Quy trình con',
    data: 'Tài liệu',
    annotation: 'Ghi chú',
    rework: 'Tác vụ làm lại',
  },
  deleteElement: 'Xóa',
  deleteSelection: 'Xóa các phần tử đã chọn',
  exportSectionData: 'Dữ liệu',
  exportSectionDiagram: 'Sơ đồ',
  exportSectionReport: 'Báo cáo',
  flowKind: 'Loại luồng',
  inferredBadge: 'Loại được suy ra từ hình nhập vào; hãy xác nhận trong Thuộc tính',
  inferredTypeHint:
    'Loại này được suy ra từ hình nhập vào hoặc khai phá từ nhật ký. Hãy xác nhận để kết quả phân tích được coi là chính xác.',
  invalidProbability: 'Nhập xác suất từ 0% đến 100%.',
  littleLawForecast: 'Dự báo theo Định luật Little từ mô hình',
  liveKpiHint: 'Kết quả trực tiếp, tính lại sau mỗi thay đổi. Nhấn để mở phân tích.',
  mappingActivity: 'Hoạt động',
  mappingCaseId: 'Mã ca (Case ID)',
  mappingChoose: 'Chọn cột',
  mappingConfirm: 'Khai phá nhật ký',
  mappingCost: 'Chi phí',
  mappingDescription: (fileName, format, rows) =>
    `${fileName} · ${format} · ${rows} dòng. Chọn cột xác định ca, hoạt động và thời gian.`,
  mappingIncomplete: 'Hãy chọn ba cột khác nhau cho Mã ca, Hoạt động và Thời điểm.',
  mappingLifecycle: 'Vòng đời (start/complete)',
  mappingNone: 'Không có trong nhật ký',
  mappingPreview: 'Các dòng đầu của nhật ký đã tải lên',
  mappingResource: 'Nguồn lực',
  mappingStartTimestamp: 'Thời điểm bắt đầu',
  mappingTimestamp: 'Thời điểm (hoàn thành)',
  mappingTitle: 'Ánh xạ cột nhật ký sự kiện',
  messageFlow: 'Luồng thông điệp',
  minedModelTitle: 'Mô hình khai phá từ nhật ký — hãy rà soát trước khi chia sẻ',
  minimap: 'Bản đồ tổng quan canvas',
  miningActivities: 'Hoạt động',
  miningActivityThreshold: 'Tần suất hoạt động',
  miningBottlenecks: 'Điểm nghẽn',
  miningBottlenecksHint:
    'Các chặng bàn giao chậm nhất giữa hai bước liên tiếp, theo độ trễ trung bình.',
  miningCases: 'Số ca',
  miningCasesShort: 'ca',
  miningDownloadCsv: 'Tải nhật ký CSV',
  miningDuration: 'Thời gian TB',
  miningDurationThreshold: 'Thời gian chuyển bước',
  miningEdgeMetric: 'Nhãn cạnh',
  miningEdgeThreshold: 'Tần suất đường đi',
  miningEmpty: 'Chọn nhật ký mẫu hoặc tải lên để khám phá quy trình.',
  miningEnd: 'Kết thúc',
  miningEvents: 'Sự kiện',
  miningFilters: 'Bộ lọc',
  miningFrequency: 'Tần suất',
  miningHandoverDelay: 'Độ trễ bàn giao',
  miningHappyPath: 'Luồng chuẩn',
  miningHappyPathBadge: 'Luồng chuẩn',
  miningHappyPathHint: 'Biến thể phổ biến nhất không lặp',
  miningHidden: (activities, edges) =>
    `Bộ lọc đang ẩn ${activities} hoạt động và ${edges} đường đi.`,
  miningInsights: 'Biến thể và điểm nghẽn',
  miningLeadTime: 'Thời gian hoàn thành TB',
  miningLegendBottleneck: 'Điểm nghẽn',
  miningLegendFast: 'Nhanh',
  miningLegendSlow: 'Chậm',
  miningLoading: 'Đang khám phá…',
  miningLoopBadge: 'Lặp',
  miningMap: 'Đồ thị luồng trực tiếp (DFG)',
  miningMedian: 'trung vị',
  miningMoreVariants: (count) => `Còn ${count} biến thể khác chưa hiển thị.`,
  miningNoBottlenecks: 'Không đo được độ trễ nào trong nhật ký này.',
  miningNoStartTimes:
    'Khi không có thời điểm bắt đầu, độ trễ bao gồm cả thời gian xử lý.',
  miningOfTotal: 'tổng độ trễ',
  miningPeriod: 'Khoảng thời gian nhật ký',
  miningPresets: {
    'order-to-cash': {
      name: 'Order-to-Cash',
      description: 'Đơn bán hàng từ kiểm tra tín dụng đến thanh toán',
    },
    'procure-to-pay': {
      name: 'Procure-to-Pay',
      description: 'Đề nghị mua, đơn mua hàng và đối chiếu hóa đơn',
    },
    'it-service-desk': {
      name: 'IT Service Desk',
      description: 'Phiếu hỗ trợ có leo thang và mở lại',
    },
    'is6003-delivery': {
      name: 'Nhật ký đồ án IS6003',
      description: 'FEAT_301/302 trong báo cáo môn học (Jira + Git)',
    },
  },
  miningResetFilters: 'Đặt lại bộ lọc',
  miningSendToCanvas: 'Chuyển sang canvas BPMN',
  miningSendToCanvasHint:
    'Chuyển bản đồ đã lọc thành mô hình BPMN (gateway XOR theo tần suất, làm lại theo lặp) để tính CT, TCT và CTE.',
  miningServiceTime: 'Thời gian xử lý',
  miningSkipped: (rows, timestamps) =>
    `Đã bỏ qua ${rows} dòng thiếu mã ca/hoạt động và ${timestamps} dòng có thời điểm không đọc được.`,
  miningSource: 'Nhật ký sự kiện',
  miningSourceHint:
    'Bắt đầu từ nhật ký mẫu hoặc tải lên dữ liệu xuất từ ERP, CRM, Service Desk.',
  miningStart: 'Bắt đầu',
  miningSteps: 'bước',
  miningSummary: 'Tóm tắt nhật ký sự kiện',
  miningUpload: 'Tải nhật ký lên',
  miningUploadHint: 'CSV, JSON hoặc XES. Bạn sẽ ánh xạ cột ở bước tiếp theo.',
  miningVariants: 'Biến thể',
  miningVariantsHint:
    'Mỗi biến thể là một thứ tự hoạt động riêng. Chọn để làm nổi bật trên bản đồ.',
  minutesShort: 'phút',
  modeMining: 'Khai phá',
  modeModel: 'Mô hình',
  modelNeedsAttention: 'Mô hình cần kiểm tra',
  multipleSelected: (count) => `Đã chọn ${count} phần tử`,
  noSelectionOption: '— Chưa chọn —',
  nodeQuickActions: 'Thao tác nhanh',
  paletteDragHint:
    'Kéo hình vào canvas hoặc nhấn để thêm vào giữa. Nhấn đúp vào hình để đổi tên.',
  probabilityOnlyForDecisions: 'Xác suất được dùng trên các nhánh của gateway XOR/OR.',
  quickAddEnd: 'Thêm sự kiện kết thúc sau bước này',
  quickAddGateway: 'Thêm gateway quyết định sau bước này',
  quickAddTask: 'Thêm tác vụ sau bước này',
  quickEnd: 'Kết thúc',
  quickGateway: 'Gateway',
  quickTask: 'Tác vụ',
  redo: 'Làm lại thao tác',
  resetZoom: 'Đặt thu phóng về 100%',
  resourcePools: 'Nhóm nguồn lực (năng lực và hàng đợi M/M/c)',
  sequenceFlow: 'Luồng tuần tự',
  timeInputsHint:
    'CT = T + Wq. Để trống thời gian chu trình để tính từ thời gian xử lý và chờ.',
  undo: 'Hoàn tác',
  workspaceMode: 'Chế độ làm việc',
};

export const getWorkspaceCopy = (locale: Locale): WorkspaceCopy =>
  locale === 'vi' ? VI : EN;
