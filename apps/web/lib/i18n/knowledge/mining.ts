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
        title: 'Chọn cách đo thời gian khi khai phá',
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
            text: 'Thời gian lịch liên tục tính cả buổi tối và cuối tuần. Giờ làm việc chỉ tính những khoảng nằm trong ngày và ca làm đã chọn, đồng thời loại trừ ngày nghỉ đã khai báo. Bạn chọn cách đo trong vùng Nhật ký sự kiện. Lựa chọn này không đổi thời điểm gốc, thứ tự hoạt động hay kết quả đối chiếu quy trình.',
          },
          {
            kind: 'example',
            title: 'Từ thứ 6 đến thứ 2',
            text: 'Với lịch thứ Hai đến thứ Sáu, 08:00–12:00 và 13:00–17:00, múi giờ UTC+07:00, từ thứ Sáu lúc 16:00 đến thứ Hai lúc 09:00 là 65 giờ theo lịch nhưng chỉ có 2 giờ làm việc. Một đợt phát triển hai tuần có 10 ngày làm việc, tương đương 80 giờ theo lịch làm việc của mỗi người. Con số đó không có nghĩa mỗi tính năng đều mất 80 giờ để hoàn thành.',
          },
          {
            kind: 'notice',
            text: 'Thời gian chu trình, thời lượng hoạt động, khoảng bàn giao, các luồng thực hiện và kết quả so định mức đều dùng chung lịch đã chọn. Khoảng từ lúc bắt đầu đến khi kết thúc chưa phải toàn bộ giờ công thao tác. Khi so với mô hình, hãy dùng cùng cách đo thời gian. Lịch hiện dùng độ lệch UTC cố định, chưa có lịch riêng từng nhân sự hay tự đổi giờ theo mùa. Cấu hình được lưu trong trình duyệt cùng từng nhật ký.',
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
            text: 'Conclusions begins with four highlights: mean case duration, the longest measured activity, the longest handover interval and a key coordination bridge. The report then shows the frequent route, personnel metrics and findings organised as recorded evidence, meaning and recommended action. Each finding uses names and values from the active log. Open full report provides a wider reading view. Observations use all accepted events before graph filters.',
          },
          {
            kind: 'notice',
            text: 'Export readable report creates an HTML report with the source name, observed period, selected clock, data-quality counts, routes, findings, personnel interpretation and BPMN comparison when a current reference exists. Print / save as PDF opens the same report in the browser print preview. Technical JSON remains available for reproducible machine-readable evidence.',
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
            text: 'Download a Flowculus event template or a Jira history template from CSV templates in Mining. Confirm the header record, column mapping, numeric date order and UTC offset, then choose Review import. Check accepted events, rejected records, duplicates and missing starts before confirming. Duplicate rows are kept. Lifecycle start/complete rows are paired by case and activity in time order, with stable source order for ties.',
          },
          {
            kind: 'paragraph',
            text: 'For Jira status history, map Issue key (or an intentional Parent key), To status and Change time. This reconstructs status changes, not task completions. Changed by is the status editor, not necessarily the performer. Processing time and personnel conclusions are withheld. Current-issue snapshots cannot reconstruct history.',
          },
          {
            kind: 'notice',
            text: 'XLSX reads the first worksheet, up to 10 MB. Other log files are capped at 50 MB and 500,000 records. Prefer ISO timestamps with an offset. For unzoned timestamps choose the source UTC offset, which is separate from the work calendar. Ambiguous numeric dates block confirmation until an explicit day/month order is selected.',
          },
        ],
      },
      vi: {
        title: 'Chuẩn bị nhật ký sự kiện',
        summary: 'Mã ca, tên hoạt động và thời điểm giúp dựng lại trình tự thực hiện.',
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
              ['timestamp', 'Thời điểm hoàn thành hoạt động, dùng để sắp xếp thứ tự.'],
              [
                'startTimestamp',
                'Thời điểm bắt đầu tùy chọn, phân biệt xử lý với độ trễ bàn giao.',
              ],
              [
                'resource / lifecycle / cost',
                'Các cột tùy chọn cho người thực hiện, trạng thái bắt đầu hoặc hoàn thành và chi phí dạng số.',
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
            text: 'Đóng hoặc xóa nhật ký đều có bước xác nhận và chỉ bỏ tab Khai phá đó. Tệp trên thiết bị và tài liệu BPMN không bị xóa. Có thể mở tối đa 10 nhật ký với tổng 30 triệu ký tự dữ liệu nguồn. Trình duyệt lưu dữ liệu, cách ghép cột và cấu hình riêng của từng nhật ký. Khi tải lại trang, các tab được khôi phục và nhật ký đang chọn được tính lại trong một tiến trình xử lý nền. Kết quả đối chiếu cần chạy lại. Hãy giữ tệp nguồn vì việc xóa dữ liệu trang web cũng xóa bản lưu trong trình duyệt.',
          },
          { kind: 'heading', text: 'Đọc tab Kết luận' },
          {
            kind: 'paragraph',
            text: 'Tab Kết luận mở đầu bằng bốn kết quả nổi bật: thời gian chu trình trung bình, hoạt động kéo dài nhất, chặng bàn giao lâu nhất và nhân sự có vai trò cầu nối. Bên dưới là luồng công việc phổ biến, bảng chỉ số nhân sự và các thẻ nhận xét theo thứ tự Số liệu ghi nhận, Ý nghĩa, Đề xuất cải tiến. Mỗi nhận xét dùng tên và số liệu của nhật ký đang mở. Bạn có thể chọn Mở rộng báo cáo để đọc hoặc trình bày trên vùng rộng hơn. Các kết quả dựa trên toàn bộ sự kiện hợp lệ, trước khi lọc đồ thị.',
          },
          {
            kind: 'notice',
            text: 'Tải báo cáo dễ đọc tạo tệp HTML có tên nguồn, kỳ dữ liệu, cơ sở đo thời gian, chất lượng dữ liệu, các luồng, nhận xét, diễn giải mạng nhân sự và kết quả đối chiếu BPMN nếu đang có mô hình chuẩn hợp lệ. In / lưu báo cáo PDF mở cùng nội dung trong bản xem trước của trình duyệt. JSON kỹ thuật vẫn có để đối soát bằng máy.',
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
            text: 'Tại Tệp CSV mẫu trong Khai phá, tải mẫu sự kiện Flowculus hoặc mẫu lịch sử Jira rồi thay các dòng bằng dữ liệu của bạn. Chọn dòng tiêu đề, ghép các cột, xác định thứ tự ngày và độ lệch UTC rồi chọn Kiểm tra trước khi nhập. Xem số sự kiện dùng được, dòng bị bỏ, dòng trùng và giờ bắt đầu còn thiếu trước khi xác nhận. Dòng trùng không tự bị xóa. Nếu dữ liệu tách riêng dòng bắt đầu và hoàn thành, hai dòng có giá trị start và complete được ghép theo mã ca, tên hoạt động và thứ tự thời gian. Khi trùng thời điểm, thứ tự nguồn được giữ nguyên.',
          },
          {
            kind: 'paragraph',
            text: 'Với lịch sử trạng thái Jira, chọn Issue key làm mã ca nếu mỗi công việc là một ca. Chỉ chọn Parent key khi các công việc con thực sự thuộc cùng một lần chạy quy trình. To status là trạng thái mới, Change time là thời điểm đổi trạng thái. Dữ liệu này dựng lại việc chuyển trạng thái, chưa cho biết tác vụ được hoàn thành lúc nào. Changed by chỉ là người sửa trạng thái nên không tự được xem là người thực hiện. Bản xuất danh sách công việc với trạng thái hiện tại chưa đủ dựng lại lịch sử.',
          },
          {
            kind: 'notice',
            text: 'Tệp XLSX được đọc từ trang tính đầu tiên và có giới hạn 10 MB. Các loại nhật ký khác có giới hạn 50 MB, tối đa 500.000 dòng. Nên dùng thời điểm theo chuẩn ISO có kèm múi giờ. Nếu dữ liệu chưa ghi múi giờ, hãy chọn độ lệch UTC của nguồn. Thiết lập này độc lập với lịch làm việc. Khi ngày dạng số có thể hiểu theo nhiều cách, cần chọn rõ ngày trước hay tháng trước trước khi xác nhận.',
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
        summary: 'Xem các luồng thường gặp, bước lặp lại và ảnh hưởng của bộ lọc.',
        keywords: ['DFG', 'happy path', 'trace', 'tần suất', 'projection'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'frequency',
            label: 'Tần suất quan sát',
            expression:
              'f(A→B) = số cặp A,B liên tiếp trong từng ca; tỷ trọng(V) = số ca(V) / tổng số ca',
            note: 'f(A→B) đếm số lần A được theo ngay bởi B trong cùng một ca. nV là số ca thuộc luồng V, n là tổng số ca. Chuỗi hoạt động được sắp theo lúc hoàn thành, rồi lúc bắt đầu, rồi thứ tự trong tệp. Thứ tự quan sát này chưa chứng minh A là nguyên nhân khiến B xảy ra.',
          },
          {
            kind: 'diagram',
            diagram: 'mining',
            caption:
              'Dựng lại cách thực hiện từ nhật ký rồi đối chiếu riêng với quy trình chuẩn.',
          },
          {
            kind: 'paragraph',
            text: 'Một biến thể là một thứ tự thực hiện công việc riêng. Các ca có cùng thứ tự được xếp chung vào biến thể đó. Huy hiệu Luồng phổ biến đánh dấu luồng không lặp xuất hiện nhiều nhất, nếu có. Luồng thường gặp chưa chắc là luồng đã được phê duyệt. Một bước xuất hiện lại có thể là làm lại công việc, vòng lặp hợp lệ hoặc dữ liệu bị ghi trùng.',
          },
          {
            kind: 'notice',
            text: 'Khi ẩn bước B trong luồng A → B → C, sơ đồ có thể nối trực tiếp A → C để thu gọn cách xem. Đường nối đó không có nghĩa một ca đã bỏ B. Bộ lọc tần suất và thời gian chỉ đổi phần hiển thị. Số liệu tổng quan vẫn dựa trên toàn bộ nhật ký. Tệp báo cáo khai phá ghi rõ bộ lọc cùng số hoạt động và đường nối đang bị ẩn.',
          },
          {
            kind: 'paragraph',
            text: 'Chuyển sang canvas BPMN tạo một tab quy trình mới theo tên bạn đặt. Chức năng chuyển sơ đồ luồng trực tiếp đang lọc, không chuyển mạng Petri do Alpha Miner đề xuất. Tần suất nhánh có thể gợi ý cách rẽ nhánh XOR, nhưng dữ liệu quan sát chưa đủ xác định ý nghĩa nghiệp vụ. Hãy kiểm tra và xác nhận các loại bước, cổng rẽ nhánh trước khi lưu hoặc xuất mô hình.',
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
            note: 'H là khoảng bàn giao, S là thời gian xử lý, t là thời điểm ghi nhận. Khi thiếu giờ bắt đầu của B, hệ thống dùng giờ hoàn thành của B nên khoảng này có thể gồm cả công việc của B. Nếu hai hoạt động chồng thời gian, khoảng bàn giao được tính bằng 0. Phép trừ thời điểm cho thời gian lịch liên tục. Khi chọn Giờ làm việc, hệ thống chỉ tính phần nằm trong lịch đã cấu hình.',
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
            text: 'Một chặng kéo dài là nơi nên xem lại cách bàn giao. Hãy kiểm tra điều kiện đầu vào, người nhận việc, lịch làm việc và cách ghi dữ liệu trước khi kết luận nguyên nhân. Màu đỏ chỉ làm nổi bật thời gian dài. Muốn biết một hoạt động có vượt mức cho phép hay không, cần tải định mức đã thống nhất. Độ trễ thực tế và giới hạn năng lực xử lý là hai vấn đề khác nhau.',
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
            kind: 'example',
            title: 'What a Petri check establishes',
            text: 'The Petri view shows a number inside each place for its token count. Enabled transitions can be executed to inspect how a case moves. A completed reachability check can establish one-token safety and workflow completion for this model. If exploration stops at a bound, the result remains inconclusive. These structural checks do not establish whether people followed an approved business process.',
          },
          {
            kind: 'notice',
            text: 'Classical Alpha has short-loop and noise limitations. Flowculus bounds it to 16 activities and 2,000 candidates; short loops can disable replay. A good replay score against a model mined from the same log is not compliance with an approved BPMN process.',
          },
        ],
      },
      vi: {
        title: 'Alpha Miner và ý nghĩa của mạng Petri',
        summary:
          'Dùng lịch sử hoạt động để đề xuất cấu trúc và hiểu cách quy trình vận hành.',
        keywords: ['nhân quả', 'song song', 'place', 'transition', 'token', 'replay'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'alpha',
            label: 'Quan hệ Alpha cổ điển',
            expression:
              'A→B nếu A>B và không B>A; A∥B nếu A>B và B>A; A#B nếu không thấy cả hai chiều',
            note: 'A>B nghĩa là B xuất hiện ngay sau A trong ít nhất một ca. Nếu thấy cả A rồi B và B rồi A, phương pháp xem đó là dấu hiệu có thể cần cấu trúc song song. Dấu hiệu này chưa chứng minh hai công việc diễn ra đồng thời ngoài thực tế.',
          },
          {
            kind: 'paragraph',
            text: 'Alpha Miner đọc thứ tự các hoạt động để đề xuất một cấu trúc quy trình. Mạng Petri biểu diễn cấu trúc đó bằng vị trí, chuyển tiếp và dấu trạng thái. Vị trí được vẽ bằng vòng tròn. Chuyển tiếp được vẽ bằng hình chữ nhật và thường biểu diễn một hoạt động. Dấu trạng thái, còn gọi là token, cho biết một ca đang có điều kiện đi tiếp ở đâu. Khi một chuyển tiếp được thực hiện, dấu ở đầu vào bị lấy đi và dấu ở đầu ra được tạo ra.',
          },
          {
            kind: 'example',
            title: 'Mạng Petri kiểm tra được điều gì',
            text: 'Trong sơ đồ, số bên trong vòng tròn là số dấu trạng thái tại vị trí đó. Bạn có thể thực hiện các chuyển tiếp đang được phép để theo dõi ca đi qua quy trình. Khi đã xét hết các trạng thái có thể đạt tới, kết quả cho biết mỗi vị trí có tối đa một dấu hay không và luồng có thể hoàn tất đúng cách hay không. Nếu chạm giới hạn phân tích, kết quả vẫn là chưa kết luận. Đây là kiểm tra cấu trúc mô hình, chưa xác định nhân sự có làm đúng quy trình đã phê duyệt.',
          },
          {
            kind: 'notice',
            text: 'Alpha Miner cổ điển có hạn chế với vòng lặp ngắn và dữ liệu nhiễu. Flowculus giới hạn phương pháp này ở 16 hoạt động và 2.000 cấu trúc vị trí được xem xét. Vòng lặp một hoặc hai bước có thể khiến việc kiểm tra trình tự trên mạng đề xuất không thực hiện được. Một mô hình biểu diễn tốt chính nhật ký đã dùng để tạo nó chưa chứng minh nhân sự làm đúng quy trình đã phê duyệt.',
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
            text: 'Sequence matching measures how many steps must be added or removed to fit the reference. It differs from the share of fully matching cases. Read the matching, differing and unchecked case counts separately. Required steps not recorded and events that do not match here identify what to investigate. Verify source histories before attributing a business violation. Limits or unsupported semantics withhold the overall score. Additional indicators and calculation details are available in expandable sections.',
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
            text: 'Mở quy trình BPMN đã được thống nhất làm chuẩn trong Mô hình, kiểm tra các nội dung suy luận từ tệp nhập rồi xác nhận. Trong Khai phá, chọn quy trình đó và ghép từng tên hoạt động thực tế với tác vụ tương ứng. Tên trùng hoàn toàn và chỉ xuất hiện một lần trong mô hình được ghép tự động. Tên khác hoặc trùng nhau cần chọn rõ. Hệ thống đối chiếu chuỗi sự kiện với một luồng hợp lệ của mô hình bằng cách tìm số bước chỉnh sửa ít nhất. Mỗi nhật ký giữ riêng quy trình chuẩn, phạm vi bên tham gia và cách ghép hoạt động. Kết quả cần chạy lại khi tải lại trang, sửa hoặc đóng quy trình chuẩn, hay đổi cách ghép tên.',
          },
          {
            kind: 'table',
            headers: ['Phát hiện', 'Diễn giải'],
            rows: [
              ['Hoạt động không có', 'Tên hoạt động vắng trong mô hình chuẩn.'],
              [
                'Sai thứ tự',
                'Hoạt động chưa được phép thực hiện tại vị trí này. Có thể đã bỏ bước, lặp hoặc đi theo nhánh khác.',
              ],
              [
                'Ca chưa hoàn tất',
                'Chuỗi hoạt động dừng trước khi quy trình chuẩn có thể kết thúc.',
              ],
            ],
          },
          {
            kind: 'example',
            title: 'Quy trình chuẩn A → B → C, thực tế A → C',
            text: 'Quy trình chuẩn yêu cầu thực hiện B trước khi đến C, nhưng ca thực tế chỉ ghi nhận A rồi C. Báo cáo sẽ nêu B trong nhóm Bước chuẩn chưa được ghi nhận. Đây là dấu hiệu phù hợp với khả năng bỏ bước B. Hãy mở lịch sử gốc để kiểm tra xem B thực sự bị bỏ hay chỉ chưa được ghi vào nhật ký.',
          },
          {
            kind: 'notice',
            text: 'Mức khớp trình tự phản ánh số bước cần thêm hoặc bỏ để phù hợp với quy trình chuẩn, không phải tỷ lệ ca khớp hoàn toàn. Hãy đọc riêng số ca khớp, số ca có sai khác và số ca chưa kiểm tra. Các mục Bước chuẩn chưa được ghi nhận và Hoạt động không khớp tại vị trí này giúp xác định cần xem lại điều gì. Khi mô hình chưa được hỗ trợ hoặc chạm giới hạn xử lý, hệ thống không đưa ra điểm khớp tổng thể. Công thức và các chỉ số bổ sung nằm trong mục mở rộng để xem khi cần.',
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
        title: 'Mạng nhân sự và ý nghĩa các chỉ số',
        summary:
          'Nhìn cách công việc được chuyển giữa các nhân sự và những đầu mối cần chú ý.',
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
            text: 'Mỗi nút là một người thực hiện. Mũi tên A → B đếm số lần công việc chuyển từ A sang B liên tiếp trong cùng một ca. Không tính việc một người tiếp tục thực hiện công việc của chính mình là một lần bàn giao cho người khác. Flowculus hiển thị tối đa 80 nhân sự, ưu tiên những người có nhiều lần thực hiện được ghi nhận.',
          },
          {
            kind: 'table',
            headers: ['Độ đo', 'Diễn giải'],
            rows: [
              [
                'Số người gửi và nhận việc',
                'Số đầu mối khác nhau gửi việc đến và nhận việc từ một người. Tính riêng hai chiều, không phải số lượt chuyển việc.',
              ],
              [
                'Vai trò cầu nối',
                'Nhiều đường bàn giao ngắn nhất đi qua người này. Điểm cao gợi ý nên kiểm tra đầu mối thay thế và cách bàn giao dự phòng.',
              ],
              [
                'Khả năng tiếp cận',
                'Từ người này có thể đi đến các đồng nghiệp liên quan qua ít chặng bàn giao hơn. Chỉ số chưa đo tốc độ trao đổi thực tế.',
              ],
              [
                'Liên kết với người chủ chốt',
                'Người này kết nối với những người cũng có nhiều liên kết. Chỉ số phản ánh vị trí phối hợp, không thể hiện chức vụ.',
              ],
              [
                'Mức tập trung bàn giao đến',
                'Người này nhận việc từ các đầu mối có ảnh hưởng trong mạng. Điểm cao chưa chứng minh công việc đang tồn đọng hoặc người đó bị quá tải.',
              ],
            ],
          },
          {
            kind: 'notice',
            text: 'Bảng nhân sự phân biệt số người gửi hoặc nhận việc, số lượt bàn giao và số lần thực hiện hoạt động. Nhận xét cho biết ai có điểm cao, điểm đó có ý nghĩa gì và nên kiểm tra cách phối hợp nào. Các chỉ số không chấm năng suất và không tự chỉ ra người gây chậm. Thứ hạng chỉ áp dụng cho nhóm đang hiển thị. Nếu có nhân sự nằm ngoài giới hạn, giao diện sẽ báo số người chưa được đưa vào mạng.',
          },
        ],
      },
    },
  },
];
