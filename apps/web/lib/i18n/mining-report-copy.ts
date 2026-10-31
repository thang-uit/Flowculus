import type { Locale } from './types';

const EN = {
  stepLimit:
    'Only the first 100 steps are shown. Use the event table to inspect the remaining sequence.',
  title: 'Results and recommendations',
  expand: 'Open full report',
  close: 'Close report',
  source: (name: string) => `Report for ${name}`,
  summary: 'At a glance',
  meaning: 'What it means',
  action: 'Recommended action',
  evidence: 'Recorded evidence',
  scope: 'Based on all accepted events in this file, before diagram filters.',
  mean: 'Mean case duration',
  longest: 'Longest activity',
  wait: 'Longest handover wait',
  gap: 'Longest recorded interval',
  broker: 'Key coordination bridge',
  caseEvents: (cases: string, events: string) =>
    `${cases} ${cases === '1' ? 'case' : 'cases'} · ${events} ${events === '1' ? 'event' : 'events'}`,
  measured: (duration: string, count: string) =>
    `${duration} on average · ${count} measured ${count === '1' ? 'execution' : 'executions'}`,
  average: (duration: string, count: string) =>
    `${duration} on average · ${count} ${count === '1' ? 'transfer' : 'transfers'}`,
  score: (value: string) => `Normalized bridge score: ${value}`,
  unavailable: 'Not enough data',
  noBridge: 'No bridge identified',
  route: 'Most frequent route',
  routeCount: (count: string, share: string) =>
    `${count} ${count === '1' ? 'case' : 'cases'} · ${share} of this log`,
  routeMeaning:
    'This is the route recorded most often. Use the approved BPMN process to check whether it is allowed.',
  routeMore: 'View the complete route',
  times: 'Where time is spent',
  activities: 'Longest measured activities',
  handovers: 'Handover intervals to investigate',
  activity: 'Activity',
  duration: 'Mean duration',
  person: 'Most frequent performer',
  sample: 'Measured executions',
  waitBody: (source: string, target: string, mean: string, max: string, count: string) =>
    `Work waits ${mean} on average between “${source}” finishing and “${target}” starting. The longest observed gap is ${max}, across ${count} ${count === '1' ? 'transfer' : 'transfers'}.`,
  gapBody: (source: string, target: string, mean: string, count: string) =>
    `The recorded interval from “${source}” to “${target}” averages ${mean} across ${count} ${count === '1' ? 'transfer' : 'transfers'}. Missing start times prevent a clean separation of waiting and work.`,
  waitMeaning:
    'This handover has one of the longest observed delays. Check what the receiving step needs before it can start.',
  waitAction: (source: string, target: string) =>
    `Review the handover from “${source}” to “${target}”. Agree on ready-to-start criteria and how pending work is assigned.`,
  serviceBody: (name: string, duration: string, count: string) =>
    `“${name}” takes ${duration} on average across ${count} ${count === '1' ? 'execution' : 'executions'} with a recorded start and finish.`,
  owner: (name: string, share: string) =>
    `${name} is recorded for ${share} of this activity’s executions.`,
  serviceMeaning:
    'A long activity deserves review, but is only above target when a service standard has been supplied.',
  serviceAction:
    'Compare with the activity’s agreed standard, inspect its substeps and identify work that can be prepared earlier.',
  repeats: 'Repeated activities',
  repeatsBody: (count: string) =>
    `${count} cases revisit an activity with the same name.`,
  repeatsMeaning:
    'This can be planned repetition or rework. Check the case history and reference process before labelling it a deviation.',
  repeatsAction:
    'Open the repeated route in Variants, then compare it with the approved BPMN process.',
  people: 'People and coordination',
  table: 'Personnel handover metrics',
  bridgeBadge: 'Bridge',
  senderReceiver: 'Senders / receivers',
  transfers: 'Handoffs received / sent',
  events: 'Recorded executions',
  degree: 'Direct connections',
  between: 'Coordination bridge',
  closeness: 'Network reach',
  eigenvector: 'Connected to key colleagues',
  pageRank: 'Incoming network prominence',
  ranking: 'Rank people by',
  advanced: 'All network metrics',
  peopleScope:
    'These scores describe recorded handovers. They help investigate coordination, not measure productivity.',
  peopleLimit: (count: string) =>
    `${count} named resources fall outside the displayed network. Rankings refer to the displayed group only.`,
  degreeBody: (names: string, value: string) =>
    `The highest connection count is ${value}, recorded for ${names}. Distinct senders and receivers are counted separately.`,
  degreeMeaning:
    'More direct connections means coordinating with more points in the process. This is different from the number of executions or transfers.',
  degreeAction: 'Clarify handover responsibilities and make shared inputs easy to find.',
  betweenBody: (names: string, value: string) =>
    `The highest normalized bridge score is ${value}, recorded for ${names}. Many shortest handover paths pass through this person or tied group.`,
  betweenMeaning:
    'This position is prominent in the recorded coordination network. The score alone does not establish a single point of failure or who caused a delay.',
  betweenAction:
    'Check backup ownership, shared documentation and alternative handover paths when a key coordinator is unavailable.',
  closenessBody: (names: string, value: string) =>
    `The highest outward reach score is ${value}, recorded for ${names} in the directed handover network.`,
  closenessMeaning:
    'Other reachable colleagues can be reached through fewer handover links. This describes network distance, not communication speed.',
  closenessAction:
    'Use this position to coordinate updates, while keeping responsibilities shared and documented.',
  eigenBody: (names: string, value: string) =>
    `The highest connection influence score is ${value}, recorded for ${names}.`,
  eigenMeaning:
    'This position connects to others who are themselves well connected. It identifies coordination structure, not formal authority.',
  eigenAction: 'Keep this group aligned on handover rules and changes to the process.',
  rankBody: (names: string, value: string) =>
    `The highest incoming prominence score is ${value}, recorded for ${names}, based on the structure and weight of handovers.`,
  rankMeaning:
    'Work reaches this position from influential senders. A high score does not establish a queue or excessive workload.',
  rankAction:
    'Compare incoming transfers with observed waiting times and actual capacity before deciding whether to redistribute work.',
  noResources:
    'No performer names were supplied. Map a performer column to analyse personnel handovers.',
  noRelations:
    'The named resources have no recorded handovers between them. Network rankings do not provide a useful coordination finding here.',
  data: 'How to read this report',
  working:
    'Time is counted only inside the selected work calendar. Unlisted public holidays remain working days.',
  elapsed:
    'Time includes nights and weekends. Select Working time to measure your organisation’s business hours.',
  missing: (count: string) =>
    `${count} events lack a usable start time. Their processing duration is unavailable, and handover intervals can include the next activity’s work.`,
  observed:
    'Activity spans describe start-to-finish duration. They do not measure continuous hands-on labour. Personnel links follow completion order, which can simplify parallel work.',
  comparison: 'Check for missing or unexpected steps',
  comparisonHint:
    'Choose the approved BPMN process and compare the recorded cases against it.',
  chooseReference: 'Open BPMN comparison',
  interpretation: 'Meaning of the indicators',
  technical: 'Method and calculation details',
  fitnessMeaning:
    'Higher matching means fewer edits are needed to fit the recorded sequence to the reference. It is different from the share of fully matching cases.',
  precisionMeaning:
    'How closely the next steps allowed by the model match those observed. Calculated only from fully matching cases.',
  generalizationMeaning:
    'How broadly observed executions cover the model’s activities. Calculated only from fully matching cases.',
  simplicityMeaning:
    'A structural simplicity score based on connections in the Petri net. It does not rate business process quality.',
  compatible: 'Fully matching cases',
  deviations: 'Cases with differences',
  examined: 'Cases checked',
  omitted: 'Cases not checked',
  fitness: 'Sequence matching',
  allMatch: (count: string) =>
    `All ${count} checked cases follow a complete route allowed by the reference.`,
  differences: (count: string) =>
    `${count} checked cases differ from the reference. Review the missing or unexpected steps below.`,
  partial:
    'The comparison could not cover the complete log. Counts below apply to checked cases only. No overall matching score is available.',
  noChecked:
    'No case could be checked. Verify the reference process, activity mapping and supported model structure.',
  missingSteps: 'Required steps not recorded',
  extraSteps: 'Events that do not match here',
  actual: 'Recorded route',
  alignmentPath: 'Step-by-step comparison',
  deviationHint:
    'Verify these cases in the source history. A difference can indicate a skipped step, missing logging, different naming or a different order.',
  exampleLimit: (shown: string, total: string) =>
    `${shown} example cases shown out of ${total} cases with differences.`,
  noDeviation: 'No differences were found in the checked cases.',
  noPrecision:
    'No fully matching cases are available, so precision and generalization are not reported.',
  quality: 'Additional model indicators',
  coverage: (matched: string, checked: string) =>
    `Based on ${matched} fully matching cases out of ${checked} checked cases.`,
  alphaWhat: 'What Alpha Miner tells you',
  alphaMeaning:
    'Alpha Miner uses recorded activity order to propose a process structure. The Petri net shows how steps can proceed, branch and join.',
  alphaNext:
    'Use this candidate to understand the log. To detect skipped steps, compare the log with an independently approved BPMN process.',
  petriLegend:
    'Circles are places, rectangles are transitions and the number inside a circle is its token count. A token marks where a case can proceed.',
  verified: 'What the Petri check establishes',
  safeMeaning: 'At most one token per place in the states explored.',
  soundMeaning:
    'Every reachable state can reach completion, completion leaves no stray tokens and every transition can occur.',
  petriCaution:
    'These conclusions concern this Petri model. They do not establish whether staff followed the approved business process.',
  verifiedStates: (count: string) => `${count} reachable states examined.`,
  suggestions: 'What to improve first',
  bottleneckScope:
    'Red highlights long observed times. Upload service standards to establish whether activity times exceed an agreed target.',
};
const VI: typeof EN = {
  stepLimit: 'Chỉ hiển thị 100 bước đầu. Mở bảng dữ liệu sự kiện để xem phần còn lại.',
  title: 'Kết quả đo lường và nhận xét',
  expand: 'Mở rộng báo cáo',
  close: 'Đóng báo cáo',
  source: (name) => `Báo cáo từ ${name}`,
  summary: 'Kết quả nổi bật',
  meaning: 'Ý nghĩa',
  action: 'Đề xuất cải tiến',
  evidence: 'Số liệu ghi nhận',
  scope: 'Phân tích toàn bộ sự kiện hợp lệ trong tệp, trước khi áp dụng bộ lọc đồ thị.',
  mean: 'Thời gian chu trình trung bình',
  longest: 'Hoạt động kéo dài nhất',
  wait: 'Chặng chờ bàn giao lâu nhất',
  gap: 'Chặng gián cách lâu nhất',
  broker: 'Nhân sự cầu nối then chốt',
  caseEvents: (cases, events) => `${cases} ca quy trình · ${events} sự kiện`,
  measured: (duration, count) =>
    `Trung bình ${duration} · ${count} lần thực hiện đo được`,
  average: (duration, count) => `Trung bình ${duration} · ${count} lượt chuyển`,
  score: (value) => `Điểm cầu nối chuẩn hóa: ${value}`,
  unavailable: 'Chưa đủ dữ liệu',
  noBridge: 'Chưa xác định cầu nối',
  route: 'Luồng công việc xuất hiện nhiều nhất',
  routeCount: (count, share) => `${count} ca · chiếm ${share} nhật ký`,
  routeMeaning:
    'Đây là thứ tự công việc được ghi nhận nhiều nhất. Cần đối chiếu với quy trình BPMN chuẩn để biết luồng này có hợp lệ hay không.',
  routeMore: 'Xem toàn bộ luồng',
  times: 'Thời gian tập trung ở đâu',
  activities: 'Các hoạt động kéo dài',
  handovers: 'Các chặng bàn giao cần xem lại',
  activity: 'Hoạt động',
  duration: 'Thời gian trung bình',
  person: 'Người thực hiện nhiều nhất',
  sample: 'Số lần đo được',
  waitBody: (source, target, mean, max, count) =>
    `Sau khi “${source}” hoàn tất, công việc chờ trung bình ${mean} mới bắt đầu “${target}”. Lần chờ lâu nhất là ${max}, ghi nhận qua ${count} lượt chuyển.`,
  gapBody: (source, target, mean, count) =>
    `Từ “${source}” sang “${target}”, khoảng thời gian ghi nhận trung bình là ${mean} qua ${count} lượt chuyển. Do còn thiếu giờ bắt đầu, chưa tách riêng được thời gian chờ và thời gian xử lý.`,
  waitMeaning:
    'Đây là một trong những chặng bàn giao có độ trễ lớn nhất trong nhật ký. Cần xem bước nhận việc đang chờ đầu vào hoặc điều kiện gì.',
  waitAction: (source, target) =>
    `Rà lại cách bàn giao từ “${source}” sang “${target}”. Thống nhất đầu vào cần có, người nhận việc và thời điểm có thể bắt đầu.`,
  serviceBody: (name, duration, count) =>
    `“${name}” mất trung bình ${duration}, tính từ ${count} lần thực hiện có đủ giờ bắt đầu và kết thúc.`,
  owner: (name, share) =>
    `${name} được ghi nhận trong ${share} số lần thực hiện hoạt động này.`,
  serviceMeaning:
    'Hoạt động này cần được xem xét vì kéo dài. Để kết luận vượt mức cho phép, cần đối chiếu với định mức thời gian đã thống nhất.',
  serviceAction:
    'So với định mức của hoạt động, xem lại các việc bên trong và xác định phần nào có thể chuẩn bị sớm hơn.',
  repeats: 'Công việc được thực hiện lặp lại',
  repeatsBody: (count) => `Có ${count} ca quay lại hoạt động mang cùng tên.`,
  repeatsMeaning:
    'Đây có thể là vòng lặp hợp lệ hoặc công việc phải làm lại. Cần xem lịch sử từng ca và quy trình chuẩn để phân biệt.',
  repeatsAction:
    'Mở luồng có bước lặp trong tab Biến thể, sau đó đối chiếu với quy trình BPMN chuẩn.',
  people: 'Nhân sự và cách phối hợp',
  table: 'Bảng chỉ số bàn giao của nhân sự',
  bridgeBadge: 'Cầu nối',
  senderReceiver: 'Người gửi / người nhận',
  transfers: 'Lượt nhận / lượt giao',
  events: 'Lần thực hiện',
  degree: 'Kết nối trực tiếp',
  between: 'Vai trò cầu nối',
  closeness: 'Khả năng tiếp cận',
  eigenvector: 'Liên kết với người chủ chốt',
  pageRank: 'Mức tập trung bàn giao đến',
  ranking: 'Sắp xếp nhân sự theo',
  advanced: 'Xem đầy đủ chỉ số mạng',
  peopleScope:
    'Các chỉ số phản ánh việc bàn giao đã ghi nhận, giúp xem cách phối hợp giữa nhân sự. Đây không phải bảng đánh giá năng suất.',
  peopleLimit: (count) =>
    `Có ${count} người chưa nằm trong mạng đang hiển thị. Thứ hạng chỉ áp dụng cho nhóm được đưa vào mạng này.`,
  degreeBody: (names, value) =>
    `${names} có số kết nối trực tiếp cao nhất (${value}), tính riêng số người gửi việc và số người nhận việc.`,
  degreeMeaning:
    'Nhiều kết nối đồng nghĩa với việc phải phối hợp qua nhiều đầu mối. Chỉ số này khác với số lần thực hiện công việc hoặc số lượt bàn giao.',
  degreeAction:
    'Làm rõ trách nhiệm ở từng đầu mối và tập trung tài liệu đầu vào để việc phối hợp thuận tiện hơn.',
  betweenBody: (names, value) =>
    `${names} có điểm cầu nối chuẩn hóa cao nhất (${value}). Nhiều đường bàn giao ngắn nhất đi qua người này hoặc nhóm đồng hạng.`,
  betweenMeaning:
    'Vị trí này giữ vai trò kết nối đáng chú ý. Chỉ riêng điểm số chưa đủ để kết luận quy trình sẽ đình trệ khi người đó vắng mặt, hoặc họ là người gây chậm.',
  betweenAction:
    'Kiểm tra người thay thế, tài liệu bàn giao và đường chuyển việc dự phòng khi đầu mối chính vắng mặt.',
  closenessBody: (names, value) =>
    `${names} có điểm tiếp cận cao nhất (${value}) theo chiều chuyển việc trong mạng.`,
  closenessMeaning:
    'Từ vị trí này có thể đi đến các đồng nghiệp liên quan qua ít chặng bàn giao hơn. Điểm số nói về khoảng cách trong mạng, chưa đo tốc độ trao đổi thực tế.',
  closenessAction:
    'Có thể tận dụng vị trí này để điều phối thông tin, đồng thời ghi rõ trách nhiệm để tránh phụ thuộc vào một người.',
  eigenBody: (names, value) =>
    `${names} có điểm liên kết với các đầu mối chủ chốt cao nhất (${value}).`,
  eigenMeaning:
    'Người ở vị trí này kết nối với những người cũng có nhiều liên kết. Điều đó phản ánh vai trò phối hợp, không thể hiện chức vụ hay quyền hạn.',
  eigenAction:
    'Thống nhất quy tắc bàn giao và cập nhật thay đổi quy trình cho nhóm đầu mối này.',
  rankBody: (names, value) =>
    `${names} có điểm tập trung bàn giao đến cao nhất (${value}), dựa trên cấu trúc và số lượt chuyển việc.`,
  rankMeaning:
    'Vị trí này nhận việc từ những đầu mối có ảnh hưởng trong mạng. Điểm cao chưa đồng nghĩa với tồn đọng hồ sơ hay quá tải.',
  rankAction:
    'Đối chiếu thêm số lượt nhận, thời gian chờ và năng lực thực tế trước khi quyết định chia lại công việc.',
  noResources:
    'Nhật ký chưa có tên người thực hiện. Hãy chọn cột nhân sự khi nhập để phân tích việc bàn giao giữa người với người.',
  noRelations:
    'Chưa ghi nhận lượt chuyển việc giữa các nhân sự có tên. Các chỉ số mạng hiện chưa đủ để đưa ra nhận xét hữu ích về phối hợp.',
  data: 'Cách đọc số liệu',
  working:
    'Thời gian chỉ tính trong lịch làm việc đang chọn. Ngày lễ chưa khai báo vẫn được tính là ngày làm việc.',
  elapsed:
    'Thời gian tính cả ban đêm và cuối tuần. Chọn Giờ làm việc nếu muốn đo theo khung giờ hoạt động của công ty.',
  missing: (count) =>
    `Có ${count} sự kiện thiếu giờ bắt đầu hợp lệ nên chưa đo được thời gian xử lý. Khoảng bàn giao đến các sự kiện này có thể gồm cả công việc của bước sau.`,
  observed:
    'Khoảng bắt đầu đến kết thúc là thời lượng ghi nhận, chưa phải toàn bộ giờ công thao tác. Mạng nhân sự dựa trên thứ tự hoàn thành nên có thể giản lược các việc chạy song song.',
  comparison: 'Kiểm tra bước bị bỏ qua hoặc thực hiện khác chuẩn',
  comparisonHint:
    'Chọn quy trình BPMN đã được thống nhất làm chuẩn rồi đối chiếu các ca trong nhật ký.',
  chooseReference: 'Mở tab Đối chiếu BPMN',
  interpretation: 'Ý nghĩa các chỉ số',
  technical: 'Xem phương pháp và cách tính',
  fitnessMeaning:
    'Điểm khớp càng cao thì càng ít bước cần thêm hoặc bỏ để khớp với quy trình chuẩn. Điểm này khác với tỷ lệ ca khớp hoàn toàn.',
  precisionMeaning:
    'Cho biết các bước tiếp theo mà mô hình cho phép gần với dữ liệu thực tế đến đâu. Chỉ tính từ các ca khớp hoàn toàn.',
  generalizationMeaning:
    'Phản ánh mức độ các hoạt động của mô hình đã xuất hiện trong dữ liệu. Chỉ tính từ các ca khớp hoàn toàn.',
  simplicityMeaning:
    'Đánh giá độ gọn về cấu trúc dựa trên các kết nối trong mạng Petri. Chỉ số này không chấm chất lượng nghiệp vụ.',
  compatible: 'Ca khớp hoàn toàn',
  deviations: 'Ca có sai khác',
  examined: 'Ca đã kiểm tra',
  omitted: 'Ca chưa kiểm tra',
  fitness: 'Mức khớp trình tự',
  allMatch: (count) =>
    `Toàn bộ ${count} ca đã kiểm tra đều đi theo một luồng hoàn chỉnh được quy trình chuẩn cho phép.`,
  differences: (count) =>
    `Có ${count} ca đã kiểm tra khác với quy trình chuẩn. Hãy xem các bước chưa ghi nhận hoặc xuất hiện không đúng vị trí bên dưới.`,
  partial:
    'Chưa kiểm tra được toàn bộ nhật ký. Các số đếm bên dưới chỉ áp dụng cho những ca đã xét. Chưa có điểm khớp tổng thể.',
  noChecked:
    'Chưa kiểm tra được ca nào. Hãy xem lại quy trình chuẩn, cách ghép tên hoạt động và cấu trúc mô hình được hỗ trợ.',
  missingSteps: 'Bước chuẩn chưa được ghi nhận',
  extraSteps: 'Hoạt động không khớp tại vị trí này',
  actual: 'Luồng thực tế ghi nhận',
  alignmentPath: 'Xem đối chiếu từng bước',
  deviationHint:
    'Cần xác minh trong lịch sử gốc của từng ca. Sai khác có thể do bỏ bước, thiếu ghi nhận, khác tên hoạt động hoặc khác thứ tự thực hiện.',
  exampleLimit: (shown, total) =>
    `Đang hiển thị ${shown} ca minh họa trong ${total} ca có sai khác.`,
  noDeviation: 'Không phát hiện sai khác trong các ca đã kiểm tra.',
  noPrecision:
    'Chưa có ca khớp hoàn toàn nên chưa đưa ra hai chỉ số về độ sát thực tế và mức bao quát.',
  quality: 'Các chỉ số bổ sung của mô hình',
  coverage: (matched, checked) =>
    `Dựa trên ${matched} ca khớp hoàn toàn trong ${checked} ca đã kiểm tra.`,
  alphaWhat: 'Alpha Miner cho biết điều gì',
  alphaMeaning:
    'Alpha Miner dùng thứ tự hoạt động đã ghi nhận để đề xuất cấu trúc quy trình. Mạng Petri thể hiện cách các bước tiếp diễn, rẽ nhánh và đồng bộ.',
  alphaNext:
    'Dùng mô hình này để hiểu dữ liệu thực tế. Muốn phát hiện bước bị bỏ qua, hãy đối chiếu nhật ký với một quy trình BPMN chuẩn độc lập.',
  petriLegend:
    'Vòng tròn là vị trí, hình chữ nhật là chuyển tiếp, số trong vòng tròn là số dấu trạng thái. Dấu trạng thái cho biết ca có thể đi tiếp ở đâu.',
  verified: 'Kiểm chứng mạng Petri cho biết gì',
  safeMeaning:
    'Mỗi vị trí có nhiều nhất một dấu trạng thái trong các trạng thái đã kiểm tra.',
  soundMeaning:
    'Từ mỗi trạng thái có thể đi đến kết thúc, khi kết thúc không còn dấu thừa và mọi chuyển tiếp đều có khả năng được thực hiện.',
  petriCaution:
    'Kết quả này nói về mô hình Petri đang xét. Để biết nhân sự có làm đúng quy trình nghiệp vụ hay không, cần đối chiếu nhật ký với quy trình chuẩn.',
  verifiedStates: (count) => `Đã kiểm tra ${count} trạng thái có thể đạt tới.`,
  suggestions: 'Ưu tiên cải tiến',
  bottleneckScope:
    'Màu đỏ làm nổi bật thời gian quan sát dài. Cần tải định mức để xác định hoạt động có vượt mức thời gian đã thống nhất hay không.',
};
export const getMiningReportCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
