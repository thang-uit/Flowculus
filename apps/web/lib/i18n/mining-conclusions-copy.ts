import type { Locale } from './types';

const plural = (value: string, singular: string, pluralForm = `${singular}s`) =>
  `${value} ${value === '1' ? singular : pluralForm}`;

const EN = {
  title: 'Conclusions',
  summary: 'What the log records',
  times: 'Duration and handovers',
  people: 'People and coordination',
  compliance: 'Structure and deviations',
  next: 'What to investigate next',
  fitness: (value: string) =>
    `Alignment fitness is ${value}. This measures move-based similarity, not the percentage of fully compliant cases.`,
  petri: (states: string) =>
    `The discovered Petri candidate was explored across ${plural(states, 'reachable marking')}. Its structural properties apply to this candidate and do not prove the business process has no violations.`,
  petriLimit:
    'The discovered Petri candidate has no completed reachability result. No complete safety, boundedness or soundness conclusion is available.',
  scope:
    'These observations use all accepted events, before graph filters. They describe this file, not proven causes or individual performance.',
  empty:
    'Upload an event log and confirm its columns to see evidence and conclusions here.',
  loading: 'Analysing the event log… Conclusions appear when processing finishes.',
  failed: 'The analysis could not finish. Check the source panel and retry the upload.',
  source: (name: string) => `Evidence from ${name}`,
  overview: (cases: string, events: string, activities: string, resources: string) =>
    `The log contains ${plural(cases, 'case')}, ${plural(events, 'event')}, ${plural(activities, 'activity', 'activities')} and ${plural(resources, 'named resource')}. A case is one process instance, not one employee.`,
  lead: (mean: string, median: string, min: string, max: string) =>
    `Mean case duration is ${mean}, with a median of ${median}. Observed cases range from ${min} to ${max}. These are durations within the recorded case boundaries.`,
  working:
    'Durations follow the selected working calendar. Nights, breaks and days outside that calendar are excluded. Missing public holidays remain included.',
  elapsed:
    'Durations use continuous elapsed time, including nights and weekends. Choose working time to analyse time inside your working calendar.',
  variant: (count: string, cases: string, share: string, path: string) =>
    `There ${count === '1' ? 'is' : 'are'} ${plural(count, 'observed variant')}. The most frequent path occurs in ${plural(cases, 'case')} (${share}): ${path}. Frequent does not mean compliant.`,
  repeats: (cases: string) =>
    `Repeated activities occur in ${plural(cases, 'case')}. They may represent rework, loops or legitimate repetition. Compare with the reference BPMN before calling them violations.`,
  noRepeats:
    'No case repeats an activity label. Repair work recorded under another label may still exist.',
  wait: (
    source: string,
    target: string,
    mean: string,
    median: string,
    max: string,
    frequency: string,
  ) =>
    `Between “${source}” and “${target}”, the observed mean gap is ${mean}, median ${median}, maximum ${max}, across ${plural(frequency, 'direct succession')}. Inspect this handover first. Start times distinguish a waiting gap from processing time, but the log alone does not identify its cause.`,
  gap: (source: string, target: string, mean: string, frequency: string) =>
    `“${source}” → “${target}” has a mean recorded interval of ${mean} across ${plural(frequency, 'direct succession')}. Some start times are missing, so this interval can contain both processing and waiting. It is not a pure waiting-time estimate.`,
  service: (name: string, duration: string, count: string, resource: string) =>
    `“${name}” has a measured mean execution duration of ${duration} across ${plural(count, 'event')} with start and completion times.${resource} This is elapsed execution duration, not measured hands-on effort or proof of insufficient capacity.`,
  owner: (name: string, share: string) =>
    ` The most frequent recorded resource is ${name} (${share} of this activity’s events).`,
  incoming: (names: string, weight: string, degree: string) =>
    `Highest incoming handover count: ${names}, with ${plural(weight, 'recorded handover')}. The first listed resource receives work from ${plural(degree, 'distinct collaborator')}. Counts and distinct people measure different things.`,
  broker: (names: string, value: string) =>
    `Highest normalized betweenness in the displayed directed network: ${names}, at ${value}. Many shortest handover paths pass through this resource or tied group, suggesting coordination dependence, not proof of who causes delays.`,
  rank: (names: string, value: string) =>
    `Highest PageRank: ${names}, at ${value}. This indicates handovers from structurally important senders. It is network prominence, not a speed or productivity score.`,
  handoff: (source: string, target: string, count: string) =>
    `The most frequent personnel handover is ${source} → ${target}, recorded ${count} ${count === '1' ? 'time' : 'times'}. Use it to discuss coordination and interface clarity. It does not establish causality.`,
  networkLimit: (count: string) =>
    `${plural(count, 'resource')} ${count === '1' ? 'is' : 'are'} outside the bounded displayed network. Rankings apply only to the displayed network. Completion order can serialize concurrent work into apparent handovers.`,
  networkComplete:
    'All named resources are included in the displayed network. Completion order can still serialize concurrent work into apparent handovers.',
  noResources:
    'The log has no named resources. Personnel attribution and network centrality cannot be interpreted.',
  missing: (count: string) =>
    `${plural(count, 'accepted event')} ${count === '1' ? 'has' : 'have'} no usable start time. Waiting and service measurements therefore have incomplete coverage.`,
  skipped: (rows: string, timestamps: string, starts: string) =>
    `${plural(rows, 'row')} ${rows === '1' ? 'was' : 'were'} omitted. There ${timestamps === '1' ? 'is' : 'are'} ${plural(timestamps, 'invalid completion timestamp')} and ${plural(starts, 'invalid start timestamp')}. Check the source data before generalising.`,
  alpha:
    'Alpha Miner infers a candidate structure from observed order. A missing observation is not proof of an illegal skip. Short loops, noise and incomplete evidence may limit the result.',
  reference:
    'To identify skipped steps, open the intended BPMN model, select it under BPMN comparison and run alignment. Discovering a model from this same log cannot establish the normative process.',
  compared: (name: string, matched: string, examined: string, omitted: string) =>
    `Compared with “${name}”: ${matched}/${examined} examined ${examined === '1' ? 'case follows' : 'cases follow'} a complete valid route. ${plural(omitted, 'case')} ${omitted === '1' ? 'was' : 'were'} not examined.`,
  unsupported:
    'The reference or replay exceeded the supported semantics or search budget. A complete conformance conclusion is unavailable.',
  deviation: (id: string, missing: string, extra: string) =>
    `Case ${id}: ${missing ? `the model requires recorded evidence for “${missing}” that is absent from this alignment` : 'no missing model activity in this alignment'}${extra ? `. The log also contains unmatched activity “${extra}”` : ''}. This may be a skipped step, missing logging or label/order mismatch. Verify the original case history.`,
  current:
    'Comparison conclusions apply only to the selected model version. Re-run after editing the model or changing activity mapping.',
  action:
    'Investigate the largest handover intervals, clarify entry criteria and ownership, then compare a new log using the same calendar and case boundaries. A before/after measurement is needed to confirm improvement.',
};

const VI: typeof EN = {
  title: 'Kết luận',
  summary: 'Nhật ký ghi nhận gì',
  times: 'Thời lượng và bàn giao',
  people: 'Nhân sự và phối hợp',
  compliance: 'Cấu trúc và sai lệch',
  next: 'Nên kiểm tra tiếp điều gì',
  fitness: (value) =>
    `Alignment fitness là ${value}, đo mức tương đồng dựa trên các bước khớp hoặc cần chỉnh. Đây không phải tỷ lệ ca hoàn toàn tuân thủ.`,
  petri: (states) =>
    `Đã duyệt ${states} trạng thái token của mạng Petri ứng viên khai phá. Tính chất cấu trúc chỉ áp dụng cho mạng ứng viên này, chưa chứng minh quy trình nghiệp vụ không có sai phạm.`,
  petriLimit:
    'Mạng Petri khai phá chưa có kết quả duyệt trạng thái hoàn tất. Chưa thể kết luận đầy đủ về an toàn, giới hạn token hay tính đúng đắn của mạng.',
  scope:
    'Các nhận xét dùng toàn bộ sự kiện hợp lệ, trước khi lọc đồ thị. Đây là bằng chứng trong tệp, chưa phải kết luận về nguyên nhân hay năng lực cá nhân.',
  empty:
    'Tải nhật ký sự kiện lên và xác nhận các cột để xem số liệu và kết luận tại đây.',
  loading: 'Đang phân tích nhật ký… Kết luận sẽ hiện khi xử lý hoàn tất.',
  failed: 'Chưa hoàn tất phân tích. Kiểm tra vùng nhật ký và thử tải lại tệp.',
  source: (name) => `Bằng chứng từ ${name}`,
  overview: (cases, events, activities, resources) =>
    `Nhật ký có ${cases} ca, ${events} sự kiện, ${activities} hoạt động và ${resources} người hoặc nguồn lực có tên. Một ca là một lần thực hiện quy trình, không phải một nhân viên.`,
  lead: (mean, median, min, max) =>
    `Thời gian chu trình trung bình là ${mean}, trung vị ${median}. Các ca quan sát được kéo dài từ ${min} đến ${max}. Số liệu chỉ tính trong ranh giới bắt đầu và kết thúc đã ghi nhận.`,
  working:
    'Thời lượng tính theo lịch làm việc đang chọn, loại trừ ban đêm, giờ nghỉ và ngày không làm. Ngày lễ chưa cấu hình vẫn được tính.',
  elapsed:
    'Thời lượng tính liên tục theo lịch, gồm cả ban đêm và cuối tuần. Chọn giờ làm việc nếu muốn phân tích thời gian trong khung giờ của công ty.',
  variant: (count, cases, share, path) =>
    `Có ${count} biến thể được quan sát. Luồng phổ biến nhất xuất hiện ở ${cases} ca (${share}): ${path}. Phổ biến chưa có nghĩa là đúng quy trình chuẩn.`,
  repeats: (cases) =>
    `Có ${cases} ca lặp lại tên hoạt động. Đây có thể là làm lại, vòng lặp hoặc lặp hợp lệ. Cần đối chiếu BPMN chuẩn trước khi gọi là sai lệch.`,
  noRepeats:
    'Không ca nào lặp lại cùng tên hoạt động. Công việc sửa lỗi ghi bằng tên khác vẫn có thể tồn tại.',
  wait: (source, target, mean, median, max, frequency) =>
    `Từ “${source}” sang “${target}”, khoảng cách trung bình là ${mean}, trung vị ${median}, lớn nhất ${max}, qua ${frequency} lần chuyển trực tiếp. Đây là điểm nên kiểm tra bàn giao trước. Có giờ bắt đầu nên tách được khoảng chờ khỏi xử lý, nhưng nhật ký chưa cho biết nguyên nhân chờ.`,
  gap: (source, target, mean, frequency) =>
    `“${source}” → “${target}” có khoảng cách trung bình ${mean} qua ${frequency} lần chuyển trực tiếp. Một số sự kiện thiếu giờ bắt đầu nên khoảng này có thể gồm cả xử lý và chờ, chưa thể gọi là thời gian chờ thuần túy.`,
  service: (name, duration, count, resource) =>
    `“${name}” có thời lượng thực hiện trung bình ${duration}, từ ${count} sự kiện có đủ giờ bắt đầu và hoàn thành.${resource} Đây là khoảng thời gian thực hiện ghi nhận, chưa phải giờ công thao tác thực tế hay bằng chứng thiếu năng lực.`,
  owner: (name, share) =>
    ` Người được ghi nhận nhiều nhất là ${name} (${share} số sự kiện của hoạt động).`,
  incoming: (names, weight, degree) =>
    `${names} nhận nhiều lượt bàn giao nhất (${weight} lượt). Người đầu tiên trong danh sách nhận từ ${degree} đối tác khác nhau. Số lượt và số người là hai độ đo khác nhau.`,
  broker: (names, value) =>
    `${names} có độ trung gian chuẩn hóa cao nhất (${value}) trong mạng có hướng đang hiển thị. Nhiều đường bàn giao ngắn nhất đi qua họ, cho thấy sự phụ thuộc phối hợp, chưa chứng minh họ gây chậm.`,
  rank: (names, value) =>
    `${names} có PageRank cao nhất (${value}), tức nhận bàn giao từ những người có vị trí đáng kể trong mạng. Chỉ số nói về vị trí trong mạng, không chấm tốc độ hay năng suất.`,
  handoff: (source, target, count) =>
    `Cặp bàn giao nhân sự xuất hiện nhiều nhất là ${source} → ${target}, với ${count} lượt. Có thể dùng để thảo luận cách phối hợp và độ rõ ràng của đầu vào, chưa dùng để quy nguyên nhân chậm.`,
  networkLimit: (count) =>
    `Có ${count} nguồn lực ngoài mạng hiển thị có giới hạn. Thứ hạng chỉ áp dụng cho mạng này. Thứ tự hoàn thành có thể biến các việc đồng thời thành bàn giao biểu kiến.`,
  networkComplete:
    'Mạng đang hiển thị đã gồm toàn bộ nguồn lực có tên. Tuy vậy, thứ tự hoàn thành vẫn có thể biến các việc đồng thời thành bàn giao biểu kiến.',
  noResources:
    'Nhật ký không có người thực hiện có tên nên chưa thể diễn giải trách nhiệm hay các độ đo mạng nhân sự.',
  missing: (count) =>
    `Có ${count} sự kiện hợp lệ thiếu giờ bắt đầu sử dụng được. Độ bao phủ của thời gian chờ và xử lý vì vậy chưa đầy đủ.`,
  skipped: (rows, timestamps, starts) =>
    `Đã bỏ ${rows} dòng. Có ${timestamps} thời điểm hoàn thành và ${starts} thời điểm bắt đầu không hợp lệ. Cần kiểm tra dữ liệu gốc trước khi khái quát kết quả.`,
  alpha:
    'Alpha Miner suy ra cấu trúc ứng viên từ thứ tự quan sát. Không thấy một bước trong log chưa chứng minh bước đó bị bỏ trái phép. Vòng lặp ngắn, nhiễu và log chưa đủ có thể làm kết quả thiếu chính xác.',
  reference:
    'Để tìm bước bị bỏ qua, mở mô hình BPMN chuẩn, chọn nó trong Đối chiếu BPMN rồi chạy alignment. Mô hình khai phá từ chính log này không thay thế được quy trình chuẩn.',
  compared: (name, matched, examined, omitted) =>
    `Đối chiếu “${name}”: ${matched}/${examined} ca đã kiểm tra đi theo một luồng hợp lệ hoàn chỉnh. Có ${omitted} ca chưa được kiểm tra.`,
  unsupported:
    'Mô hình hoặc quá trình đối chiếu vượt ngữ nghĩa hay giới hạn tìm kiếm được hỗ trợ. Chưa thể kết luận mức tuân thủ đầy đủ.',
  deviation: (id, missing, extra) =>
    `Ca ${id}: ${missing ? `mô hình yêu cầu bằng chứng của “${missing}” nhưng alignment không tìm thấy sự kiện tương ứng` : 'alignment này không thiếu hoạt động từ mô hình'}${extra ? `. Nhật ký còn có hoạt động không khớp “${extra}”` : ''}. Có thể là nhảy bước, thiếu ghi log hoặc khác nhãn/thứ tự. Cần xem lịch sử ca gốc để xác minh.`,
  current:
    'Kết luận đối chiếu chỉ áp dụng cho phiên bản mô hình đã chọn. Chạy lại khi sửa mô hình hoặc đổi ánh xạ hoạt động.',
  action:
    'Ưu tiên kiểm tra các khoảng bàn giao dài, làm rõ điều kiện đầu vào và người phụ trách, sau đó so sánh log mới bằng cùng lịch và ranh giới ca. Cần đo trước và sau để xác nhận hiệu quả cải tiến.',
};
export const getMiningConclusionsCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
