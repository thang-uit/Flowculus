import type { Locale } from './types';

const EN = {
  title: 'Process mining report',
  overview: 'Scope and main findings',
  source: 'Source',
  generated: 'Report generated',
  period: 'Observed period (UTC)',
  clock: 'Duration basis',
  working: 'Working hours',
  elapsed: 'Elapsed calendar time',
  calendar: 'Work calendar',
  holidays: 'Excluded dates',
  metadata: 'Report context',
  caseCount: 'Cases',
  eventCount: 'Events',
  activityCount: 'Activities',
  variantCount: 'Routes',
  resourceCount: 'Named performers',
  dataQuality: 'Data quality',
  rowsRejected: 'Rows excluded',
  invalidTimes: 'Invalid completion times',
  invalidStarts: 'Invalid start times',
  duplicateRows: 'Duplicate rows',
  unpairedStarts: 'Unpaired starts',
  missingStarts: 'Missing start times',
  sequence: 'Recorded activity sequence',
  ready: 'The report is ready to download.',
  printReady: 'Print preview is ready. Use your browser’s Print command to save as PDF.',
  tooLarge:
    'The report exceeds the readable export limit. Use technical JSON or narrow the source file.',
  logFindings: 'Process behaviour and data quality',
  routes: 'Observed routes',
  cases: 'Cases',
  share: 'Share of cases',
  mean: 'Mean duration',
  median: 'Median case duration',
  minimum: 'Shortest recorded case',
  maximum: 'Longest recorded case',
  activities: 'Distinct activities',
  people: 'Named performers',
  variants: 'Observed routes',
  unknown: 'Not available',
  findings: 'Findings and recommendations',
  methods: 'Method and interpretation limits',
  html: 'Download report (.html)',
  pdf: 'Print / save as PDF',
  json: 'Download technical evidence (.json)',
  export: 'Export report',
  exporting: 'Preparing report…',
  failed:
    'The report could not be prepared. Allow pop-ups for PDF preview and try again.',
  popup: 'Allow pop-ups to open the print preview, or download the HTML report.',
  printHint: 'Use your browser’s Print command to save this report as PDF.',
  sample: 'Synthetic example selected by the user',
  uploaded: 'User-selected event log',
  scope: (name: string, cases: string, events: string, activities: string) =>
    `This report analyses “${name}”, containing ${cases} recorded ${cases === '1' ? 'case' : 'cases'}, ${events} accepted ${events === '1' ? 'event' : 'events'} and ${activities} distinct ${activities === '1' ? 'activity' : 'activities'}. A case groups events belonging to one process instance, such as an order, request or ticket.`,
  periodText: (start: string, end: string) =>
    `The accepted events span ${start} to ${end} (UTC). This is the data window, not the duration of a single case.`,
  timing: (mean: string, median: string, min: string, max: string) =>
    `The mean recorded case duration is ${mean}, with a median of ${median}. Case durations range from ${min} to ${max}. Durations follow the selected clock and the available start/end events.`,
  windowLimit:
    'These are recorded spans. The file does not independently prove that every case is complete, that the sample represents all business activity or that recorded time is continuous hands-on effort.',
  distribution: 'Variation between cases',
  distributionBody: (mean: string, median: string, min: string, max: string) =>
    `Mean ${mean}, median ${median}, shortest ${min} and longest ${max} describe the case-duration distribution in this file.`,
  distributionMeaning:
    'A few long cases can affect the mean. Compare cases with similar scope before setting a target or judging the effect of a process change.',
  distributionAction:
    'Open the long cases in the event table and inspect their handovers, repeated steps and available start times.',
  routeBody: (variants: string, count: string, share: string) =>
    `The log contains ${variants} distinct recorded ${variants === '1' ? 'route' : 'routes'}. The most frequent route appears in ${count} ${count === '1' ? 'case' : 'cases'} (${share}).`,
  routeMeaning:
    'Different routes can represent valid choices, repeated work, partial cases or inconsistent activity names. Their frequency alone does not establish a violation.',
  routeAction:
    'Review the main routes with the process owner, then compare them with an independently approved BPMN reference.',
  starts: 'Coverage of activity start times',
  startsBody: (missing: string, total: string) =>
    `${missing} of ${total} accepted events lack a usable start time. Processing durations are available only for events with both endpoints.`,
  startsMeaning:
    'Intervals into events without a start can include the receiving activity’s work. They must not be presented as proven queue time.',
  startsAction:
    'Map or collect the actual start timestamp. Keep completion-only data for sequence analysis and qualify its time conclusions.',
  duplicates: 'Repeated source rows',
  duplicatesBody: (count: string) =>
    `${count} duplicate rows were retained during import.`,
  duplicatesMeaning:
    'Repeated rows may be a duplicate export or distinct executions with identical fields. They can affect route frequencies, repetition counts and timing statistics.',
  duplicatesAction:
    'Check the source history or event identifiers before removing rows, then import the corrected file if needed.',
  rejected: 'Records excluded from the analysis',
  rejectedBody: (rows: string, invalid: string, starts: string) =>
    `The import excluded ${rows} unusable records, including ${invalid} invalid completion timestamps. ${starts} invalid start timestamps were discarded while their valid completion events were retained.`,
  rejectedMeaning:
    'The report covers accepted events. Rejected records can change the reconstructed route and make a step appear absent.',
  rejectedAction:
    'Review the import diagnostics and source rows before interpreting deviations.',
  unfinished: 'Unpaired lifecycle starts',
  unfinishedBody: (count: string) =>
    `${count} lifecycle start records have no matching completion.`,
  unfinishedMeaning:
    'The observed history may include unfinished activities or incomplete logging. The reported case duration is not proof of end-to-end completion.',
  unfinishedAction:
    'Check the export window and collect the missing completions or analyse unfinished work separately.',
  personnel: 'Performer coverage',
  personnelBody: (named: string, total: string) =>
    `${named} of ${total} accepted events have a named performer.`,
  personnelMeaning:
    'Missing performers leave gaps in the handover network. Team names, accounts and people may also represent different levels of responsibility.',
  personnelAction:
    'Confirm what the performer column identifies and use consistent names before making staffing decisions.',
  status: 'Status-change history',
  statusBody:
    'Each event records entry into a status. The report describes status order and intervals between changes, rather than completed tasks.',
  statusMeaning:
    'A status editor is not necessarily the person doing the work. Status changes do not establish processing time, queue time or individual responsibility.',
  statusAction:
    'Use this view to investigate status paths. Add actual execution timestamps and performers when activity-time or personnel analysis is required.',
  single: 'A single recorded case',
  singleBody:
    'The file contains one case, so the mean, median, shortest and longest durations describe that same observation.',
  singleMeaning:
    'One case can illustrate a path or a specific deviation. It does not establish typical performance or the frequency of an organisational problem.',
  singleAction: 'Collect more comparable cases before drawing process-wide conclusions.',
  limits:
    'The directly-follows graph shows observed adjacency, not approved BPMN semantics. Alpha Miner proposes a candidate from the log. Missing-step claims require a separate reference comparison. Long times and centrality scores do not identify who caused a delay.',
  exportLimit: (routes: string) =>
    `The report lists up to ${routes} routes and 100 steps per route. Technical JSON and the source event table retain the supporting context.`,
};

const VI: typeof EN = {
  title: 'Báo cáo phân tích nhật ký quy trình',
  overview: 'Phạm vi và kết quả chính',
  source: 'Nguồn dữ liệu',
  generated: 'Thời điểm lập báo cáo',
  period: 'Kỳ dữ liệu (UTC)',
  caseCount: 'Ca',
  eventCount: 'Sự kiện',
  activityCount: 'Hoạt động',
  variantCount: 'Luồng thực hiện',
  resourceCount: 'Nhân sự có tên',
  dataQuality: 'Chất lượng dữ liệu',
  rowsRejected: 'Dòng bị loại',
  invalidTimes: 'Giờ hoàn thành không hợp lệ',
  invalidStarts: 'Giờ bắt đầu không hợp lệ',
  duplicateRows: 'Dòng trùng',
  unpairedStarts: 'Lần bắt đầu chưa ghép',
  missingStarts: 'Sự kiện thiếu giờ bắt đầu',
  sequence: 'Trình tự hoạt động ghi nhận',
  ready: 'Báo cáo đã sẵn sàng để tải xuống.',
  printReady: 'Đã mở bản xem trước. Dùng lệnh In của trình duyệt để lưu PDF.',
  tooLarge:
    'Báo cáo vượt giới hạn xuất để đọc rõ. Hãy dùng JSON kỹ thuật hoặc thu gọn tệp nguồn.',
  clock: 'Cơ sở đo thời gian',
  working: 'Giờ làm việc',
  elapsed: 'Thời gian lịch liên tục',
  calendar: 'Lịch làm việc',
  holidays: 'Ngày nghỉ đã loại trừ',
  metadata: 'Thông tin báo cáo',
  logFindings: 'Hành vi quy trình và chất lượng dữ liệu',
  routes: 'Các luồng công việc ghi nhận',
  cases: 'Số ca',
  share: 'Tỷ lệ ca',
  mean: 'Thời gian trung bình',
  median: 'Thời gian chu trình trung vị',
  minimum: 'Ca có thời gian ngắn nhất',
  maximum: 'Ca có thời gian dài nhất',
  activities: 'Số hoạt động khác nhau',
  people: 'Nhân sự có tên trong dữ liệu',
  variants: 'Số luồng thực hiện',
  unknown: 'Chưa có dữ liệu',
  findings: 'Nhận xét và đề xuất',
  methods: 'Phương pháp và giới hạn diễn giải',
  html: 'Tải báo cáo (.html)',
  pdf: 'In / lưu PDF',
  json: 'Tải bằng chứng kỹ thuật (.json)',
  export: 'Xuất báo cáo',
  exporting: 'Đang chuẩn bị báo cáo…',
  failed: 'Chưa chuẩn bị được báo cáo. Hãy cho phép cửa sổ xem trước PDF và thử lại.',
  popup: 'Cho phép cửa sổ bật lên để xem trước bản in, hoặc tải báo cáo HTML.',
  printHint: 'Dùng lệnh In của trình duyệt để lưu báo cáo này thành PDF.',
  sample: 'Dữ liệu tổng hợp do người dùng chủ động chọn',
  uploaded: 'Nhật ký do người dùng mở',
  scope: (name, cases, events, activities) =>
    `Báo cáo phân tích nhật ký “${name}”, gồm ${cases} ca, ${events} sự kiện hợp lệ và ${activities} hoạt động khác nhau. Mỗi ca gom các sự kiện của một lần thực hiện quy trình, chẳng hạn một đơn hàng, yêu cầu hoặc phiếu hỗ trợ.`,
  periodText: (start, end) =>
    `Các sự kiện hợp lệ nằm trong khoảng từ ${start} đến ${end} (UTC). Đây là kỳ dữ liệu của toàn bộ tệp, không phải thời gian xử lý một ca.`,
  timing: (mean, median, min, max) =>
    `Thời gian chu trình ghi nhận trung bình là ${mean}, trung vị là ${median}. Ca ngắn nhất có thời gian ${min}, ca dài nhất là ${max}. Các giá trị dùng lịch đo đang chọn và những mốc bắt đầu, kết thúc có trong dữ liệu.`,
  windowLimit:
    'Đây là khoảng thời gian được ghi nhận. Chỉ từ tệp này chưa thể xác nhận mọi ca đều đã hoàn tất, mẫu dữ liệu đại diện toàn bộ hoạt động của doanh nghiệp hoặc toàn bộ thời lượng là giờ công thao tác liên tục.',
  distribution: 'Mức khác biệt về thời gian giữa các ca',
  distributionBody: (mean, median, min, max) =>
    `Thời gian trung bình ${mean}, trung vị ${median}, ngắn nhất ${min} và dài nhất ${max} cho thấy phân bố thời gian của các ca trong tệp.`,
  distributionMeaning:
    'Một số ca kéo dài có thể làm tăng giá trị trung bình. Cần so sánh những ca có phạm vi tương đương trước khi đặt mục tiêu hoặc đánh giá tác động của cải tiến.',
  distributionAction:
    'Mở những ca kéo dài trong bảng sự kiện, xem các chặng bàn giao, bước lặp và mức đầy đủ của giờ bắt đầu.',
  routeBody: (variants, count, share) =>
    `Nhật ký có ${variants} luồng thực hiện khác nhau. Luồng xuất hiện nhiều nhất có ${count} ca, chiếm ${share} dữ liệu.`,
  routeMeaning:
    'Các luồng khác nhau có thể do lựa chọn hợp lệ, công việc làm lại, ca chưa đủ lịch sử hoặc tên hoạt động chưa thống nhất. Tần suất riêng lẻ chưa xác định được sai phạm.',
  routeAction:
    'Rà các luồng chính với người phụ trách quy trình, sau đó đối chiếu với mô hình BPMN chuẩn đã được xác nhận độc lập.',
  starts: 'Mức đầy đủ của thời điểm bắt đầu',
  startsBody: (missing, total) =>
    `Có ${missing} trong ${total} sự kiện hợp lệ thiếu giờ bắt đầu sử dụng được. Thời lượng hoạt động chỉ tính từ các sự kiện có đủ hai mốc thời gian.`,
  startsMeaning:
    'Khoảng trước những sự kiện thiếu giờ bắt đầu có thể gồm cả thời gian thực hiện bước nhận việc. Không nên xem toàn bộ khoảng đó là thời gian xếp hàng.',
  startsAction:
    'Chọn đúng cột giờ bắt đầu hoặc bổ sung mốc thực tế. Dữ liệu chỉ có giờ hoàn thành vẫn dùng để đọc trình tự, nhưng kết luận thời gian cần nêu rõ giới hạn.',
  duplicates: 'Các dòng dữ liệu trùng',
  duplicatesBody: (count) => `Có ${count} dòng trùng được giữ nguyên khi nhập.`,
  duplicatesMeaning:
    'Đây có thể là bản xuất bị trùng hoặc những lần thực hiện khác nhau có cùng giá trị. Chúng có thể ảnh hưởng tần suất luồng, số bước lặp và thống kê thời gian.',
  duplicatesAction:
    'Đối chiếu lịch sử gốc hoặc mã sự kiện trước khi xóa dòng, rồi nhập lại tệp đã rà nếu cần.',
  rejected: 'Dữ liệu không được đưa vào phân tích',
  rejectedBody: (rows, invalid, starts) =>
    `Đã loại ${rows} bản ghi không sử dụng được, trong đó có ${invalid} thời điểm hoàn thành không hợp lệ. Có ${starts} giờ bắt đầu không hợp lệ bị bỏ, còn sự kiện có giờ hoàn thành hợp lệ vẫn được giữ.`,
  rejectedMeaning:
    'Báo cáo dựa trên những sự kiện đã được chấp nhận. Bản ghi bị loại có thể thay đổi luồng tái dựng hoặc khiến một bước có vẻ chưa xuất hiện.',
  rejectedAction:
    'Kiểm tra cảnh báo khi nhập và các dòng gốc trước khi diễn giải sai khác quy trình.',
  unfinished: 'Sự kiện bắt đầu chưa có kết thúc tương ứng',
  unfinishedBody: (count) =>
    `Có ${count} bản ghi bắt đầu chưa ghép được với lần hoàn thành tương ứng.`,
  unfinishedMeaning:
    'Lịch sử có thể chứa công việc đang thực hiện hoặc thiếu ghi nhận. Thời gian chu trình đang hiển thị chưa chứng minh ca đã hoàn tất toàn bộ nghiệp vụ.',
  unfinishedAction:
    'Kiểm tra kỳ xuất dữ liệu, bổ sung lần hoàn thành hoặc theo dõi công việc chưa xong thành nhóm riêng.',
  personnel: 'Mức đầy đủ của thông tin người thực hiện',
  personnelBody: (named, total) =>
    `Có ${named} trong ${total} sự kiện hợp lệ ghi tên bên thực hiện.`,
  personnelMeaning:
    'Thiếu người thực hiện sẽ tạo khoảng trống trong mạng bàn giao. Tên đội, tài khoản và tên cá nhân cũng có thể thể hiện những cấp trách nhiệm khác nhau.',
  personnelAction:
    'Xác nhận ý nghĩa cột nhân sự và thống nhất cách đặt tên trước khi đưa ra quyết định phân bổ công việc.',
  status: 'Nhật ký thay đổi trạng thái',
  statusBody:
    'Mỗi sự kiện ghi nhận thời điểm chuyển vào một trạng thái. Báo cáo mô tả thứ tự trạng thái và khoảng giữa các lần thay đổi, chưa phải các tác vụ đã hoàn thành.',
  statusMeaning:
    'Người sửa trạng thái chưa chắc là người thực hiện công việc. Các lần đổi trạng thái chưa chứng minh thời gian xử lý, thời gian chờ hoặc trách nhiệm của từng người.',
  statusAction:
    'Dùng kết quả để kiểm tra các tuyến trạng thái. Bổ sung thời điểm thực hiện và nhân sự thực tế khi cần phân tích thời lượng tác vụ hoặc phối hợp.',
  single: 'Dữ liệu chỉ có một ca',
  singleBody:
    'Tệp chỉ chứa một ca nên các giá trị trung bình, trung vị, ngắn nhất và dài nhất cùng mô tả một quan sát.',
  singleMeaning:
    'Một ca có thể minh họa luồng hoặc một sai khác cụ thể. Chưa thể dùng ca đó để kết luận hiệu suất điển hình hay tần suất vấn đề của cả doanh nghiệp.',
  singleAction:
    'Thu thêm các ca có phạm vi tương đương trước khi kết luận cho toàn quy trình.',
  limits:
    'Đồ thị luồng trực tiếp cho biết các hoạt động xuất hiện kề nhau, chưa phải ngữ nghĩa BPMN chuẩn. Alpha Miner đề xuất mô hình từ nhật ký. Muốn kết luận bước chưa được ghi nhận cần đối chiếu với quy trình chuẩn độc lập. Thời gian dài và điểm mạng nhân sự chưa xác định ai gây chậm.',
  exportLimit: (routes) =>
    `Báo cáo trình bày tối đa ${routes} luồng và 100 bước mỗi luồng. JSON kỹ thuật và bảng sự kiện nguồn cung cấp ngữ cảnh để đối soát.`,
};
export const getMiningDocumentCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
