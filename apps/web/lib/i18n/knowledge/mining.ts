import type { KnowledgeEntry } from '@/lib/knowledge/types';

export const MINING: KnowledgeEntry[] = [
  {
    id: 'work-calendar',
    category: 'mining',
    content: {
      en: {
        title: 'Choose the clock for mining',
        summary: 'Separate elapsed time from working time before comparing durations.',
        keywords: [
          'calendar',
          'working hours',
          'weekend',
          'shifts',
          'UTC',
          'holidays',
          'sprint',
        ],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Elapsed calendar time includes nights and weekends. Working time counts only the overlap with configured weekdays, shifts and holidays. Configure the clock in the log source panel. Timestamp order and conformance do not change.',
          },
          {
            kind: 'example',
            title: 'Friday to Monday',
            text: 'With Mon–Fri 08:00–12:00 and 13:00–17:00 at UTC+07:00, Friday 16:00 to Monday 09:00 is 65 elapsed hours and 2 working hours. A two-week sprint contains 10 working days and 80 nominal hours per person; it does not set feature CT.',
          },
          {
            kind: 'notice',
            text: 'The same clock applies to lead time, measured service, handover, variants and standards. Activity spans do not prove hands-on effort. Use the same time basis in model inputs. The calendar uses a fixed UTC offset, has no per-resource or automatic DST schedule, and is stored locally with the Mining draft.',
          },
        ],
      },
      vi: {
        title: 'Chọn lịch đo thời gian Mining',
        summary: 'Phân biệt thời gian trôi qua với giờ làm việc trước khi so sánh.',
        keywords: [
          'lịch',
          'giờ làm việc',
          'cuối tuần',
          'ca làm',
          'UTC',
          'ngày nghỉ',
          'sprint',
        ],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Thời gian lịch liên tục gồm cả buổi tối và cuối tuần. Giờ làm việc chỉ tính phần giao với các thứ, ca làm và ngày nghỉ đã cấu hình. Chọn lịch trong bảng nguồn log. Timestamp, thứ tự trace và kết quả conformance giữ nguyên.',
          },
          {
            kind: 'example',
            title: 'Từ thứ 6 đến thứ 2',
            text: 'Với lịch thứ 2–thứ 6, 08:00–12:00 và 13:00–17:00, UTC+07:00, từ thứ 6 lúc 16:00 đến thứ 2 lúc 09:00 là 65 giờ liên tục nhưng chỉ 2 giờ làm việc. Sprint hai tuần có 10 ngày làm việc, 80 giờ danh nghĩa/người; không tự xác định CT tính năng.',
          },
          {
            kind: 'notice',
            text: 'Lead time, thời lượng xử lý, bàn giao, biến thể và định mức dùng chung lịch đang chọn. Khoảng start/end chưa chứng minh toàn bộ là giờ công. Nhập thời gian mô hình theo cùng cơ sở đo. Lịch dùng UTC cố định, chưa có lịch riêng từng người hay tự đổi giờ mùa; cấu hình được lưu cục bộ cùng bản nháp Mining.',
          },
        ],
      },
    },
  },
  {
    id: 'event-log',
    category: 'mining',
    content: {
      en: {
        title: 'Prepare an event log',
        summary:
          'Case, activity and time: the minimum data needed to reconstruct traces.',
        keywords: [
          'CSV',
          'TSV',
          'XLSX',
          'JSON',
          'XES',
          'mapping',
          'timestamp',
          'lifecycle',
        ],
        blocks: [
          {
            kind: 'table',
            headers: ['Column', 'Purpose'],
            rows: [
              ['caseId', 'Identifies events belonging to the same process instance.'],
              [
                'activity',
                'Names the observed activity. Match BPMN labels when checking conformance.',
              ],
              ['timestamp', 'Completion timestamp; required for chronological ordering.'],
              [
                'startTimestamp',
                'Optional start, used to distinguish service from hand-over delay.',
              ],
              [
                'resource / lifecycle / cost',
                'Optional performer, start/complete lifecycle and numeric cost.',
              ],
            ],
          },
          { kind: 'heading', text: 'Keep models and event logs separate' },
          {
            kind: 'paragraph',
            text: 'Model shows BPMN document tabs. Mining shows event-log tabs with their source filenames. Opening another log adds a tab after its columns are confirmed and its events are read successfully. Switching logs restores that log’s filters, calendar, diagram view and selected insight. For example, open current-process.csv and improved-process.csv, then select either tab to compare their observed results. Opening or closing a log does not change BPMN documents.',
          },
          { kind: 'heading', text: 'Inspect the imported data' },
          {
            kind: 'list',
            items: [
              'Check the filename and extension in Current event log. Samples are identified separately from uploaded files.',
              'Open View event data to read accepted events in pages of 50. Search by case, activity or resource, narrow by case/activity and sort by completion time.',
              'The event number follows imported accepted-event order. It is not the original file line number. Timestamps use ISO UTC.',
              'Graph filters affect the diagram. They do not remove events from this table. Filter and calendar edits made during source loading are applied after that source is ready.',
            ],
          },
          {
            kind: 'notice',
            text: 'Closing or clearing a log asks for confirmation and removes only that Mining tab. The original file and BPMN documents remain available. Up to 10 logs can stay open within a combined budget of 30 million source-text characters. Source data, column mapping and per-log controls are saved locally. Reload restores the tabs and recomputes the active log in one worker. Alignment evidence must be run again after reload. Clearing browser site data removes these sessions, so retain the source files.',
          },
          { kind: 'heading', text: 'Read the Conclusions tab' },
          {
            kind: 'paragraph',
            text: 'After discovery, Conclusions explains the accepted case and event counts, the selected clock, frequent routes, long handover intervals and measured activity durations. It also identifies prominent resources in the handover network and explains what their centrality scores measure. These observations use the full accepted log, before graph filters.',
          },
          {
            kind: 'example',
            title: 'From an observation to an investigation',
            text: 'If the handover from Review to Approval has the longest mean gap, inspect its case histories and entry conditions first. A person with high incoming handoffs receives many recorded transfers, but that count alone does not show who caused the delay. To investigate a missing approval step, choose an approved BPMN reference and run comparison. The conclusions then identify missing model steps and unmatched log events for the examined cases.',
          },
          {
            kind: 'example',
            title: 'Minimum CSV',
            text: 'caseId,activity,timestamp\nc1,Receive,2026-10-25T08:00:00Z\nc1,Approve,2026-10-25T09:00:00Z',
          },
          {
            kind: 'paragraph',
            text: 'Each selected mapping uses a different column. The parser reports skipped required data, unreadable completion timestamps and invalid start times. Lifecycle start/complete events are paired by case and activity. Ties in timestamps use stable file order.',
          },
          {
            kind: 'notice',
            text: 'XLSX reads the first worksheet, up to 10 MB; other log files are capped at 50 MB, and logs at 500,000 rows. Prefer ISO timestamps with a zone; naive supported formats use UTC. Ambiguous numeric dates default to day-first unless the data proves month-first.',
          },
        ],
      },
      vi: {
        title: 'Chuẩn bị nhật ký sự kiện',
        summary: 'Mã ca, hoạt động và thời gian: dữ liệu tối thiểu để dựng trace.',
        keywords: [
          'CSV',
          'TSV',
          'XLSX',
          'JSON',
          'XES',
          'ánh xạ',
          'timestamp',
          'lifecycle',
        ],
        blocks: [
          {
            kind: 'table',
            headers: ['Cột', 'Mục đích'],
            rows: [
              ['caseId', 'Gom sự kiện cùng một lần thực hiện quy trình.'],
              [
                'activity',
                'Tên hoạt động quan sát được. Cần khớp nhãn BPMN khi đối chiếu.',
              ],
              ['timestamp', 'Thời điểm hoàn thành; bắt buộc để sắp thứ tự.'],
              [
                'startTimestamp',
                'Thời điểm bắt đầu tùy chọn, phân biệt xử lý với độ trễ bàn giao.',
              ],
              [
                'resource / lifecycle / cost',
                'Người thực hiện, vòng đời start/complete và chi phí dạng số, đều tùy chọn.',
              ],
            ],
          },
          { kind: 'heading', text: 'Phân biệt mô hình với nhật ký sự kiện' },
          {
            kind: 'paragraph',
            text: 'Mô hình hiển thị tab tài liệu BPMN. Khai phá hiển thị tab nhật ký theo tên tệp nguồn. Mở thêm nhật ký sẽ tạo tab sau khi xác nhận cột và đọc được sự kiện hợp lệ. Chuyển tab khôi phục bộ lọc, lịch, dạng biểu đồ và mục kết quả đã chọn của nhật ký đó. Ví dụ, mở quy-trinh-hien-tai.csv và quy-trinh-cai-tien.csv, rồi bấm từng tab để xem kết quả quan sát tương ứng. Mở hoặc đóng nhật ký không thay đổi tài liệu BPMN.',
          },
          { kind: 'heading', text: 'Kiểm tra dữ liệu đã nhập' },
          {
            kind: 'list',
            items: [
              'Kiểm tra tên tệp và phần mở rộng trong Nhật ký đang phân tích. Dữ liệu mẫu được phân biệt với tệp bạn tải lên.',
              'Mở Xem dữ liệu sự kiện để đọc các sự kiện hợp lệ theo trang 50 dòng. Tìm mã ca, hoạt động hoặc người thực hiện, lọc riêng mã ca/hoạt động và sắp xếp theo thời điểm hoàn thành.',
              'Số sự kiện là thứ tự sự kiện hợp lệ nhập vào, không phải số dòng gốc của tệp. Thời điểm hiển thị theo ISO UTC.',
              'Bộ lọc đồ thị chỉ thay đổi sơ đồ, không xóa sự kiện khỏi bảng. Nếu đổi bộ lọc hoặc lịch trong lúc tải nguồn, lựa chọn mới nhất được áp dụng khi nguồn đã sẵn sàng.',
            ],
          },
          {
            kind: 'notice',
            text: 'Đóng hoặc xóa nhật ký đều có xác nhận và chỉ xóa tab Khai phá đó. Tệp gốc và tài liệu BPMN vẫn được giữ. Có thể mở tối đa 10 nhật ký trong tổng giới hạn 30 triệu ký tự nguồn. Dữ liệu nguồn, ánh xạ cột và cấu hình riêng được lưu cục bộ. Tải lại trang khôi phục các tab và tính lại nhật ký đang chọn bằng một worker. Bằng chứng đối chiếu cần chạy lại sau reload. Xóa dữ liệu website sẽ xóa các phiên này, vì vậy hãy giữ tệp nguồn.',
          },
          { kind: 'heading', text: 'Đọc tab Kết luận' },
          {
            kind: 'paragraph',
            text: 'Sau khi khai phá, tab Kết luận giải thích số ca và sự kiện hợp lệ, lịch đo đang dùng, luồng phổ biến, các khoảng bàn giao dài và thời lượng hoạt động đo được. Phần nhân sự chỉ ra những người có vị trí đáng chú ý trong mạng bàn giao và giải thích ý nghĩa của các độ đo trung tâm. Nhận xét dựa trên toàn bộ nhật ký hợp lệ, trước khi lọc đồ thị.',
          },
          {
            kind: 'example',
            title: 'Từ số liệu đến việc cần kiểm tra',
            text: 'Nếu chặng từ Rà soát sang Phê duyệt có khoảng cách trung bình dài nhất, hãy xem lịch sử các ca và điều kiện tiếp nhận công việc trước. Người có nhiều lượt bàn giao đến nhận nhiều lần chuyển việc được ghi nhận, nhưng riêng số lượt chưa cho biết ai gây chậm. Muốn kiểm tra bước phê duyệt có bị thiếu, hãy chọn BPMN chuẩn rồi chạy đối chiếu. Kết luận sẽ chỉ ra bước chuẩn chưa ghi nhận và sự kiện không khớp ở những ca đã kiểm tra.',
          },
          {
            kind: 'example',
            title: 'CSV tối thiểu',
            text: 'caseId,activity,timestamp\nc1,Receive,2026-10-25T08:00:00Z\nc1,Approve,2026-10-25T09:00:00Z',
          },
          {
            kind: 'paragraph',
            text: 'Mỗi trường ánh xạ phải dùng cột riêng. Parser thống kê dòng thiếu dữ liệu bắt buộc, thời điểm hoàn thành không đọc được và giờ bắt đầu không hợp lệ. Lifecycle start/complete được ghép theo mã ca và hoạt động. Trùng thời gian thì giữ thứ tự ổn định trong tệp.',
          },
          {
            kind: 'notice',
            text: 'XLSX đọc trang tính đầu, tối đa 10 MB; log khác tối đa 50 MB và 500.000 dòng. Nên dùng ISO có múi giờ; định dạng được hỗ trợ không ghi múi giờ dùng UTC. Ngày số mơ hồ mặc định ngày trước, trừ khi dữ liệu xác định tháng trước.',
          },
        ],
      },
    },
  },
  {
    id: 'dfg-variants',
    category: 'mining',
    content: {
      en: {
        title: 'Directly-follows graphs and variants',
        summary: 'See frequent routes, repetitions and the effects of filtering.',
        keywords: ['DFG', 'happy path', 'trace', 'frequency', 'projection'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'frequency',
            label: 'Observed frequency',
            expression:
              'f(A→B) = count of consecutive A,B pairs within cases; share(V) = cases(V) / all cases',
            note: 'f(A→B) counts consecutive A,B pairs within a case; nV is the number of cases of variant V, and n is the total case count. Trace order is completion time, then start time, then original file order. It does not by itself prove a causal relationship.',
          },
          {
            kind: 'diagram',
            diagram: 'mining',
            caption:
              'Discover observed behaviour from a log; compare it separately with a reference.',
          },
          {
            kind: 'paragraph',
            text: 'A variant groups cases with the same activity sequence. The Common route badge identifies the most frequent non-repeating variant where one exists. It describes observed behaviour; an approved process must come from a separate reference. Repetitions may indicate rework, loops or duplicate logging.',
          },
          {
            kind: 'notice',
            text: 'Hiding activities projects traces and can create a direct A→C edge when B is hidden. That edge is not proof that a case skipped B. Frequency/duration filters are display choices. Summary statistics remain based on the full log. Exported Mining evidence includes the active filters and hidden activity/edge counts so a projected graph is not mistaken for the full observed process.',
          },
          {
            kind: 'paragraph',
            text: 'Send to BPMN canvas asks you to name a new process tab. It converts the filtered directly-follows map, not the Alpha/Petri candidate. Branch frequencies suggest XOR routing, but observations alone do not establish the intended BPMN semantics. Review the inferred choices before saving or exporting.',
          },
        ],
      },
      vi: {
        title: 'Đồ thị luồng trực tiếp và biến thể',
        summary: 'Quan sát tuyến phổ biến, lặp và ảnh hưởng của bộ lọc.',
        keywords: ['DFG', 'happy path', 'trace', 'tần suất', 'projection'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'frequency',
            label: 'Tần suất quan sát',
            expression:
              'f(A→B) = số cặp A,B liên tiếp trong từng ca; tỷ trọng(V) = số ca(V) / tổng số ca',
            note: 'f(A→B) đếm số lần A rồi đến ngay B trong cùng một ca; nV là số ca thuộc biến thể V, n là tổng số ca. Trace được sắp theo lúc hoàn thành, rồi lúc bắt đầu, rồi thứ tự tệp. Thứ tự đó không tự chứng minh quan hệ nhân quả.',
          },
          {
            kind: 'diagram',
            diagram: 'mining',
            caption: 'Khám phá hành vi từ log; đối chiếu riêng với mô hình chuẩn.',
          },
          {
            kind: 'paragraph',
            text: 'Một biến thể gom các ca có cùng chuỗi hoạt động. Huy hiệu Luồng phổ biến đánh dấu biến thể không lặp xuất hiện nhiều nhất, nếu có. Đây là hành vi quan sát từ log; quy trình chuẩn phải được xác định bằng mô hình tham chiếu riêng. Hoạt động lặp có thể do làm lại, vòng lặp nghiệp vụ hoặc ghi log trùng.',
          },
          {
            kind: 'notice',
            text: 'Ẩn hoạt động làm phép chiếu trace, có thể tạo cạnh A→C khi B bị ẩn. Cạnh này không chứng minh ca đã bỏ B. Bộ lọc tần suất/thời gian chỉ đổi phần hiển thị. Số liệu tổng quan vẫn dựa trên toàn bộ log. File kết quả Mining ghi cả bộ lọc và số hoạt động, cạnh bị ẩn để người đọc phân biệt đồ thị đã lọc với quy trình quan sát đầy đủ.',
          },
          {
            kind: 'paragraph',
            text: 'Chuyển sang canvas BPMN yêu cầu bạn đặt tên cho tab quy trình mới. Chức năng này chuyển bản đồ luồng trực tiếp đã lọc, không chuyển mạng Alpha/Petri ứng viên. Tần suất nhánh gợi ý định tuyến XOR, nhưng dữ liệu quan sát chưa xác định được ngữ nghĩa BPMN mong muốn. Hãy rà soát các lựa chọn suy luận trước khi lưu tệp hoặc xuất.',
          },
        ],
      },
    },
  },
  {
    id: 'bottlenecks',
    category: 'mining',
    content: {
      en: {
        title: 'Read bottleneck measurements',
        summary: 'Separate hand-over time from service time before drawing conclusions.',
        keywords: ['delay', 'mean', 'waiting', 'partial timestamps', 'slow'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'measurements',
            label: 'Time measurements',
            expression:
              'Handover(A→B) = max(0, start(B) − complete(A)); Service(B) = complete(B) − start(B)',
            note: 'H is hand-over delay, S is service time, and t denotes an event timestamp. When B has no start timestamp, its completion is used instead; the hand-over includes B’s work. Overlapping observed activities produce zero hand-over delay. These subtraction formulas describe elapsed time; working mode measures each interval against the configured calendar.',
          },
          {
            kind: 'formula',
            mathId: 'cumulative',
            label: 'Cumulative time and share',
            expression:
              'Total = mean time × measured samples; share = Total / Σ Total of the same kind',
            note: 'Service totals use only executions with measured starts. The UI ranks by mean time, not cumulative time. Standards comparisons group activity and performer pairs. Use Previous and Next to inspect every result when the table spans multiple pages.',
          },
          {
            kind: 'notice',
            text: 'A slow hand-over is a candidate for investigation. It may reflect weekends, batching or incomplete logging, not necessarily insufficient staffing. Capacity bottlenecks and measured log delays answer different questions.',
          },
        ],
      },
      vi: {
        title: 'Đọc số đo điểm nghẽn',
        summary: 'Phân biệt thời gian bàn giao và xử lý trước khi kết luận.',
        keywords: ['độ trễ', 'trung bình', 'chờ', 'thiếu timestamp', 'chậm'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'measurements',
            label: 'Số đo thời gian',
            expression:
              'Bàn giao(A→B) = max(0, bắt đầu(B) − hoàn thành(A)); Xử lý(B) = hoàn thành(B) − bắt đầu(B)',
            note: 'H là độ trễ bàn giao, S là thời gian xử lý, t là mốc thời gian của sự kiện. Thiếu lúc B bắt đầu thì dùng lúc B hoàn thành; số đo bàn giao chứa cả công việc của B. Các hoạt động chồng thời gian cho độ trễ bàn giao bằng 0. Công thức trừ timestamp mô tả thời gian liên tục; chế độ giờ làm việc đo phần giao của từng khoảng với lịch đã cấu hình.',
          },
          {
            kind: 'formula',
            mathId: 'cumulative',
            label: 'Tổng thời gian và tỷ trọng',
            expression:
              'Tổng = thời gian trung bình × số mẫu đo; tỷ trọng = Tổng / Σ Tổng cùng loại',
            note: 'Tổng xử lý chỉ dùng lượt có giờ bắt đầu đo được. Giao diện xếp hạng theo thời gian trung bình, không phải tổng tích lũy. Khi đối chiếu định mức với nhiều nhóm hoạt động và người thực hiện, dùng nút trang trước và trang sau để xem đầy đủ kết quả.',
          },
          {
            kind: 'notice',
            text: 'Chặng bàn giao chậm là ứng viên cần điều tra. Có thể do ngày nghỉ, xử lý theo lô hoặc log thiếu, chưa chắc thiếu nhân sự. Điểm nghẽn công suất và độ trễ đo trong log trả lời hai câu hỏi khác nhau.',
          },
        ],
      },
    },
  },
  {
    id: 'alpha-petri',
    category: 'mining',
    content: {
      en: {
        title: 'Alpha Miner and Petri-net candidates',
        summary:
          'Discover structural relations without treating the log as its own standard.',
        keywords: ['causality', 'parallelism', 'place', 'transition', 'token', 'replay'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'alpha',
            label: 'Classical Alpha relations',
            expression:
              'A→B if A>B and not B>A; A∥B if A>B and B>A; A#B if neither direction occurs',
            note: 'A>B means B directly follows A in at least one observed trace. These are classical discovery relations, not proof of real-world causality or concurrency.',
          },
          {
            kind: 'paragraph',
            text: 'A Petri net contains places, transitions and tokens. A transition consumes input tokens and produces output tokens. Alpha groups compatible causal relations into candidate places. Replay tests whether observed cases can execute in the discovered candidate.',
          },
          {
            kind: 'notice',
            text: 'Classical Alpha has short-loop and noise limitations. Flowculus bounds it to 16 activities and 2,000 candidates; short loops can disable replay. A good replay score against a model mined from the same log is not compliance with an approved BPMN process.',
          },
        ],
      },
      vi: {
        title: 'Alpha Miner và mạng Petri ứng viên',
        summary: 'Khám phá quan hệ cấu trúc, không lấy log làm chuẩn cho chính nó.',
        keywords: ['nhân quả', 'song song', 'place', 'transition', 'token', 'replay'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'alpha',
            label: 'Quan hệ Alpha cổ điển',
            expression:
              'A→B nếu A>B và không B>A; A∥B nếu A>B và B>A; A#B nếu không thấy cả hai chiều',
            note: 'A>B nghĩa là B theo ngay A trong ít nhất một trace. Đây là quan hệ khám phá cổ điển, không chứng minh nhân quả hay đồng thời ngoài thực tế.',
          },
          {
            kind: 'paragraph',
            text: 'Mạng Petri gồm place, transition và token. Transition tiêu thụ token đầu vào rồi sinh token đầu ra. Alpha gom quan hệ nhân quả tương thích thành place ứng viên. Replay kiểm tra ca quan sát có chạy được trong mô hình ứng viên đó hay không.',
          },
          {
            kind: 'notice',
            text: 'Alpha cổ điển có hạn chế với vòng lặp ngắn và nhiễu. Flowculus giới hạn 16 hoạt động, 2.000 ứng viên; vòng lặp ngắn có thể khiến replay không khả dụng. Replay tốt với mô hình khám phá từ chính log chưa chứng minh tuân thủ BPMN đã phê duyệt.',
          },
        ],
      },
    },
  },
  {
    id: 'conformance',
    category: 'mining',
    content: {
      en: {
        title: 'Skipped steps and BPMN conformance',
        summary: 'Use a confirmed reference to examine unexpected activity order.',
        keywords: ['skip', 'violation', 'missing task', 'token replay', 'compliance'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Open the intended BPMN reference in Model, confirm any inferred semantics, then select it in Mining. The comparison shows the active log and the chosen reference separately. Each event-log tab remembers its reference, process pool and activity mapping. A unique, exactly matching task label maps automatically. Duplicate labels and different names need an explicit choice. Alignment compares the observed sequence with a valid model execution. Comparison waits while a log loads or its worker is being restored. A timeout clears worker-dependent results, but retains the source for Restore this log. Editing or closing the reference invalidates its evidence. Re-run comparison against the current model before presenting a result.',
          },
          {
            kind: 'table',
            headers: ['Finding', 'Meaning'],
            rows: [
              ['Unknown activity', 'The activity is absent from the reference labels.'],
              [
                'Unexpected order',
                'The activity is not enabled here; a step may have been skipped, repeated or routed differently.',
              ],
              ['Incomplete case', 'The trace stops before the reference can finish.'],
            ],
          },
          {
            kind: 'example',
            title: 'Reference A → B → C; log A → C',
            text: 'C is not enabled immediately after A, while B is expected. This is evidence of a mismatch consistent with skipping B. Check logging completeness and the reference version before classifying the business cause.',
          },
          {
            kind: 'notice',
            text: 'Alignment fitness measures deviation cost. It is not the percentage of completely matching cases. Read both the matching-case count and the coverage before drawing a conclusion. Limits or unsupported semantics withhold fitness. Missing events can also reflect incomplete logging, so discovery alone cannot establish a business violation.',
          },
        ],
      },
      vi: {
        title: 'Nhảy bước và đối chiếu BPMN',
        summary:
          'Dùng mô hình chuẩn đã xác nhận để kiểm tra thứ tự hoạt động bất thường.',
        keywords: [
          'bỏ bước',
          'skip',
          'vi phạm',
          'thiếu tác vụ',
          'token replay',
          'tuân thủ',
        ],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Mở BPMN chuẩn trong Mô hình, xác nhận các ngữ nghĩa suy luận, rồi chọn tài liệu đó trong Khai phá. Phần đối chiếu ghi rõ nhật ký đang phân tích và mô hình tham chiếu. Mỗi tab nhật ký nhớ riêng mô hình chuẩn, pool và ánh xạ hoạt động. Nhãn task giống hoàn toàn và duy nhất được gán tự động. Nhãn trùng hoặc khác tên cần chọn rõ. Alignment đối chiếu chuỗi sự kiện với một cách thực hiện hợp lệ trong mô hình. Chức năng chờ khi nhật ký đang tải hoặc worker đang khôi phục. Hết thời gian xử lý sẽ xóa kết quả phụ thuộc worker, nhưng giữ nguồn để dùng Khôi phục nhật ký này. Sửa hoặc đóng mô hình chuẩn làm bằng chứng cũ hết hiệu lực. Hãy chạy lại đối chiếu với mô hình hiện tại trước khi trình bày.',
          },
          {
            kind: 'table',
            headers: ['Phát hiện', 'Diễn giải'],
            rows: [
              ['Hoạt động không có', 'Tên hoạt động vắng trong mô hình chuẩn.'],
              [
                'Sai thứ tự',
                'Hoạt động chưa được phép chạy tại đây; có thể đã bỏ bước, lặp hoặc rẽ nhánh khác.',
              ],
              ['Ca chưa hoàn tất', 'Trace dừng trước khi mô hình chuẩn có thể kết thúc.'],
            ],
          },
          {
            kind: 'example',
            title: 'Chuẩn A → B → C; log A → C',
            text: 'Ngay sau A, C chưa được phép chạy; B mới là bước hợp lệ. Đây là bằng chứng lệch mô hình, phù hợp với khả năng bỏ B. Cần kiểm tra độ đầy đủ của log và phiên bản mô hình trước khi kết luận nguyên nhân nghiệp vụ.',
          },
          {
            kind: 'notice',
            text: 'Fitness alignment đo mức lệch theo chi phí, không phải tỷ lệ ca khớp hoàn toàn. Cần đọc cả số ca khớp và phạm vi đã xét trước khi kết luận. Vượt giới hạn hoặc ngữ nghĩa chưa hỗ trợ thì không có fitness. Thiếu sự kiện còn có thể do log chưa đầy đủ, nên chỉ khám phá từ log chưa xác định được vi phạm nghiệp vụ.',
          },
        ],
      },
    },
  },
  {
    id: 'resource-network',
    category: 'mining',
    content: {
      en: {
        title: 'Resource networks and centrality',
        summary: 'Understand who connects observed hand-overs and how the scores differ.',
        keywords: [
          'degree',
          'betweenness',
          'closeness',
          'eigenvector',
          'PageRank',
          'handoff',
        ],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Resource nodes represent performers; directed edges count hand-overs between different consecutive performers within a case. Self hand-overs are excluded. Flowculus computes the network for up to 80 resources selected by observed event count.',
          },
          {
            kind: 'table',
            headers: ['Measure', 'Interpretation'],
            rows: [
              [
                'In/out degree',
                'Number of distinct incoming/outgoing hand-over neighbours.',
              ],
              [
                'Betweenness',
                'Share of shortest directed paths that pass through this resource; indicates a bridge.',
              ],
              [
                'Closeness',
                'Reachability-adjusted inverse mean shortest directed distance.',
              ],
              [
                'Eigenvector',
                'Influence under the implementation’s undirected neighbour relation.',
              ],
              [
                'PageRank',
                'Directed hand-over importance with damping 0.85 and redistribution at dangling nodes.',
              ],
            ],
          },
          {
            kind: 'notice',
            text: 'Counts and centrality describe the selected observed network, not accountability, staff productivity or causation. Missing resources and excluded nodes change the scores; the UI reports omitted resources.',
          },
        ],
      },
      vi: {
        title: 'Mạng nhân sự và độ đo trung tâm',
        summary: 'Ai kết nối các lần bàn giao quan sát được và ý nghĩa từng chỉ số.',
        keywords: [
          'degree',
          'betweenness',
          'closeness',
          'eigenvector',
          'PageRank',
          'bàn giao',
          'trung tâm',
        ],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Nút biểu diễn người thực hiện; cạnh có hướng đếm bàn giao giữa hai người khác nhau liên tiếp trong cùng ca. Không đếm tự bàn giao. Flowculus tính mạng cho tối đa 80 nhân sự chọn theo số sự kiện quan sát.',
          },
          {
            kind: 'table',
            headers: ['Độ đo', 'Diễn giải'],
            rows: [
              ['Bậc vào/ra', 'Số hàng xóm bàn giao khác nhau đi vào/đi ra.'],
              [
                'Betweenness',
                'Tỷ phần đường đi ngắn nhất có hướng đi qua nhân sự; gợi ý vai trò cầu nối.',
              ],
              [
                'Closeness',
                'Nghịch đảo khoảng cách có hướng trung bình, điều chỉnh theo khả năng tiếp cận.',
              ],
              [
                'Eigenvector',
                'Ảnh hưởng theo quan hệ hàng xóm vô hướng trong triển khai hiện tại.',
              ],
              [
                'PageRank',
                'Tầm quan trọng theo bàn giao có hướng, hệ số 0,85 và phân phối lại tại nút cụt.',
              ],
            ],
          },
          {
            kind: 'notice',
            text: 'Tần suất và độ đo mô tả mạng được chọn đã quan sát, không xác định trách nhiệm, năng suất cá nhân hay nguyên nhân. Thiếu nhân sự hoặc bỏ nút làm thay đổi chỉ số; giao diện báo số người chưa hiển thị.',
          },
        ],
      },
    },
  },
];
