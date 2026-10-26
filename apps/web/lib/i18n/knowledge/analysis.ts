import type { KnowledgeEntry } from '@/lib/knowledge/types';

export const ANALYSIS: KnowledgeEntry[] = [
  {
    id: 'ct-tct-cte',
    category: 'analysis',
    content: {
      en: {
        title: 'CT, theoretical time and efficiency',
        summary: 'Distinguish elapsed time, processing-only time and their ratio.',
        keywords: ['cycle time', 'TCT', 'CTE', 'efficiency', 'percent'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'efficiency',
            label: 'Cycle-time efficiency',
            expression: 'CTE = TCT / CT; displayed percentage = CTE × 100%',
            note: 'TCT evaluates the same routing model with processing time T. It excludes waiting, while retaining branching and supported synchronization.',
          },
          {
            kind: 'example',
            title: 'An illustrative request process',
            text: 'CT = 35.2 minutes; TCT = 12.8 minutes. CTE = 12.8 / 35.2 ≈ 0.3636, displayed as 36.4%. In the raw model/API, efficiency remains a ratio.',
          },
          {
            kind: 'notice',
            text: 'CT = 0 leaves efficiency undefined. Values outside [0,1] or inconsistent inputs produce a diagnostic. With parallel work, TCT follows elapsed processing-only time; it is not total person-minutes summed across simultaneous tasks.',
          },
        ],
      },
      vi: {
        title: 'CT, thời gian lý thuyết và hiệu suất',
        summary: 'Phân biệt thời gian trôi qua, thời gian chỉ xử lý và tỷ lệ của chúng.',
        keywords: ['thời gian chu trình', 'TCT', 'CTE', 'hiệu suất', 'phần trăm'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'efficiency',
            label: 'Hiệu suất thời gian chu trình',
            expression: 'CTE = TCT / CT; phần trăm hiển thị = CTE × 100%',
            note: 'TCT tính trên cùng mô hình định tuyến nhưng dùng thời gian xử lý T. Bỏ thời gian chờ, vẫn giữ rẽ nhánh và đồng bộ được hỗ trợ.',
          },
          {
            kind: 'example',
            title: 'Ví dụ minh họa quy trình xử lý yêu cầu',
            text: 'CT = 35,2 phút; TCT = 12,8 phút. CTE = 12,8 / 35,2 ≈ 0,3636, hiển thị 36,4%. Trong dữ liệu/API, hiệu suất vẫn là tỷ lệ.',
          },
          {
            kind: 'notice',
            text: 'CT = 0 làm hiệu suất không xác định. Tỷ lệ ngoài [0,1] hoặc đầu vào mâu thuẫn tạo chẩn đoán. Với công việc song song, TCT là thời gian trôi qua khi chỉ giữ phần xử lý; không phải tổng phút công của các tác vụ chạy đồng thời.',
          },
        ],
      },
    },
  },
  {
    id: 'cost',
    category: 'analysis',
    content: {
      en: {
        title: 'Expected cost per execution',
        summary: 'Processing-based labour cost plus explicit charges.',
        keywords: ['currency', 'resource rate', 'cost', 'labour'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'cost',
            label: 'Cost of one attempt',
            expression: 'Cost = (Tminutes / 60) × hourly rate + other cost',
            note: 'T is active processing time in minutes, h is the hourly rate, and Cother is other cost per attempt. Dividing T by 60 converts minutes to hours. The engine weights route costs by branch probability and supported rework visits. Costs across parallel branches add.',
          },
          {
            kind: 'example',
            title: 'A 30-minute task',
            text: 'At 120 USD/hour with a 10 USD charge, the task costs 70 USD per attempt. Waiting does not add labour cost under this model. If staff remain paid while waiting, model that accounting policy explicitly.',
          },
          {
            kind: 'notice',
            text: 'Use a consistent currency. Flowculus does not convert exchange rates. A processing-time estimate also makes the derived labour cost an assumption.',
          },
        ],
      },
      vi: {
        title: 'Chi phí kỳ vọng mỗi lần thực hiện',
        summary: 'Chi phí nhân công theo thời gian xử lý cộng khoản phí khai báo.',
        keywords: ['tiền tệ', 'đơn giá', 'cost', 'nhân công'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'cost',
            label: 'Chi phí một lượt',
            expression: 'Cost = (Tphút / 60) × đơn giá mỗi giờ + chi phí khác',
            note: 'T là thời gian xử lý thực tính bằng phút, h là đơn giá mỗi giờ và Cother là chi phí khác của một lượt. Chia T cho 60 để đổi sang giờ. Engine tính chi phí kỳ vọng theo xác suất nhánh và số lượt làm lại được hỗ trợ; chi phí các nhánh song song được cộng.',
          },
          {
            kind: 'example',
            title: 'Tác vụ xử lý 30 phút',
            text: 'Đơn giá 120 USD/giờ và phí khác 10 USD cho chi phí 70 USD mỗi lượt. Mô hình này không cộng nhân công theo thời gian chờ. Nếu nhân sự vẫn được trả công khi chờ, cần mô hình hóa chính sách kế toán đó rõ ràng.',
          },
          {
            kind: 'notice',
            text: 'Dùng tiền tệ nhất quán. Flowculus không quy đổi tỷ giá. Thời gian xử lý là ước lượng thì chi phí nhân công suy ra cũng mang mức giả định.',
          },
        ],
      },
    },
  },
  {
    id: 'critical-path',
    category: 'analysis',
    content: {
      en: {
        title: 'CPM and the expected-time critical chain',
        summary:
          'Two different questions: scheduling tasks versus explaining expected elapsed time.',
        keywords: ['CPM', 'earliest', 'latest', 'slack', 'critical chain'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'cpm',
            label: 'Critical path method',
            expression: 'ESi = max(EFpredecessors); EFi = ESi + Ti; Slacki = LSi − ESi',
            note: 'The textbook CPM result uses processing durations on an acyclic graph without XOR/OR decisions. Predi is the set of predecessors of activity i; a starting activity has ESi = 0. A zero-slack path determines the project duration.',
          },
          {
            kind: 'paragraph',
            text: 'Flowculus also shows an expected-time critical chain: at a decision it follows the branch with the largest probability × remaining expected time. That heuristic explains the expectation; it is neither the most likely trace nor textbook CPM.',
          },
          {
            kind: 'notice',
            text: 'Prefer an explicit Processing time (T) value in Inspector. A fallback from observed duration D is marked as an assumption. Cycles and decisions prevent a general CPM conclusion.',
          },
        ],
      },
      vi: {
        title: 'CPM và chuỗi găng theo thời gian kỳ vọng',
        summary:
          'Hai bài toán khác nhau: lập lịch tác vụ và giải thích thời gian kỳ vọng.',
        keywords: [
          'đường găng',
          'CPM',
          'sớm nhất',
          'muộn nhất',
          'độ dự trữ',
          'critical chain',
        ],
        blocks: [
          {
            kind: 'formula',
            mathId: 'cpm',
            label: 'Phương pháp đường găng',
            expression: 'ESi = max(EFcác bước trước); EFi = ESi + Ti; Slacki = LSi − ESi',
            note: 'CPM trong sách dùng thời gian xử lý trên đồ thị không chu trình và không có quyết định XOR/OR. Predi là tập hoạt động trước i; hoạt động khởi đầu có ESi = 0. Đường có độ dự trữ bằng 0 quyết định thời gian dự án.',
          },
          {
            kind: 'paragraph',
            text: 'Flowculus còn hiển thị chuỗi găng theo thời gian kỳ vọng: tại quyết định, chọn nhánh có xác suất × thời gian kỳ vọng còn lại lớn nhất. Quy tắc ước lượng này giúp giải thích kết quả; không xác định chuỗi hoạt động có khả năng xảy ra cao nhất và không thay thế CPM.',
          },
          {
            kind: 'notice',
            text: 'Nên khai báo rõ Thời gian xử lý (T) trong Thuộc tính. Nếu phải lấy D quan sát làm ước lượng T, kết quả có mức giả định. Vòng lặp và quyết định không cho phép kết luận CPM tổng quát.',
          },
        ],
      },
    },
  },
  {
    id: 'capacity',
    category: 'analysis',
    content: {
      en: {
        title: 'Unit load, resource capacity and utilization',
        summary: 'Find the resource pool that limits throughput.',
        keywords: ['bottleneck', 'pool', 'resourceCount', 'rho', 'throughput'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'capacity',
            label: 'Pool capacity',
            expression: 'Capacity/day = c × H × 60 / U; ρ = λ × U / (60 × c)',
            note: 'U is expected processing minutes per case assigned to the pool; c is its resource count; H is working hours/day; λ is arrivals/hour.',
          },
          {
            kind: 'example',
            title: 'An approval pool',
            text: 'Two resources, 8 hours/day, 30 minutes of unit load per case: capacity is 32 cases/day. At 3 arrivals/hour, utilization is 0.75. The pool with the smallest finite capacity is the capacity bottleneck.',
          },
          {
            kind: 'notice',
            text: 'Unit load adds resource effort across parallel work and expected repeat visits. Capacity analysis assumes available work time and the configured pool size; missing pool size defaults to one with an assumption.',
          },
        ],
      },
      vi: {
        title: 'Tải đơn vị, công suất và mức sử dụng',
        summary: 'Tìm nhóm nguồn lực giới hạn thông lượng quy trình.',
        keywords: [
          'điểm nghẽn',
          'pool',
          'resourceCount',
          'rho',
          'throughput',
          'công suất',
        ],
        blocks: [
          {
            kind: 'formula',
            mathId: 'capacity',
            label: 'Công suất nhóm nguồn lực',
            expression: 'Công suất/ngày = c × H × 60 / U; ρ = λ × U / (60 × c)',
            note: 'U là phút xử lý kỳ vọng mỗi ca thuộc nhóm; c là số nguồn lực; H là giờ làm mỗi ngày; λ là số ca đến mỗi giờ.',
          },
          {
            kind: 'example',
            title: 'Nhóm duyệt yêu cầu',
            text: 'Hai nhân sự, 8 giờ/ngày, tải đơn vị 30 phút/ca: công suất 32 ca/ngày. Với 3 ca đến/giờ, mức sử dụng là 0,75. Nhóm có công suất hữu hạn nhỏ nhất là điểm nghẽn công suất.',
          },
          {
            kind: 'notice',
            text: 'Tải đơn vị cộng công sức các nhánh song song và số lượt lặp kỳ vọng. Phân tích công suất dựa trên thời gian làm việc khả dụng và quy mô nhóm; thiếu quy mô sẽ giả định một nguồn lực và có thông báo.',
          },
        ],
      },
    },
  },
  {
    id: 'queue',
    category: 'analysis',
    content: {
      en: {
        title: 'M/M/1 and M/M/c queues',
        summary:
          'Arrival rate, service rate and why waiting grows near full utilization.',
        keywords: ['Erlang C', 'lambda', 'mu', 'Wq', 'Lq', 'Poisson', 'servers'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'M/M/c assumes Poisson arrivals, exponential service times, c identical parallel servers and a steady state. Use the same unit for λ and μ. The service rate μ is per server, not the total pool rate.',
          },
          {
            kind: 'formula',
            mathId: 'mm1',
            label: 'Single server',
            expression: 'ρ = λ/μ; Lq = ρ²/(1−ρ); Wq = Lq/λ; W = Wq + 1/μ',
            note: 'Requires 0 ≤ λ < μ. When λ = 0, waiting is zero.',
          },
          {
            kind: 'formula',
            mathId: 'mmc',
            label: 'Erlang C with c servers',
            expression:
              'a = λ/μ; ρ = a/c; P0 = [Σk=0…c−1 a^k/k! + a^c/(c!(1−ρ))]⁻¹; Lq = P0 × a^c × ρ / [c!(1−ρ)²]',
            note: 'Wq = Lq/λ, W = Wq + 1/μ and L = λW. Requires ρ < 1.',
          },
          {
            kind: 'example',
            title: '4 arrivals/hour; 5 completions/hour',
            text: 'For one server, ρ = 0.8; Lq = 3.2; Wq = 0.8 hour (48 minutes); W = 1 hour. A small service-capacity margin can still yield substantial waiting.',
          },
          {
            kind: 'notice',
            text: 'At ρ ≥ 1, no finite steady-state waiting estimate is shown. Using expected pool unit load as exponential service is a separate approximation; real batching, priorities or correlated arrivals need another model.',
          },
        ],
      },
      vi: {
        title: 'Hàng đợi M/M/1 và M/M/c',
        summary:
          'Tốc độ đến, phục vụ và vì sao thời gian chờ tăng gần mức sử dụng tối đa.',
        keywords: ['Erlang C', 'lambda', 'mu', 'Wq', 'Lq', 'Poisson', 'máy phục vụ'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'M/M/c giả định dòng đến Poisson, thời gian phục vụ phân phối mũ, c máy phục vụ giống nhau chạy song song và trạng thái ổn định. λ và μ phải cùng đơn vị. μ là tốc độ một máy phục vụ, không phải tổng tốc độ cả nhóm.',
          },
          {
            kind: 'formula',
            mathId: 'mm1',
            label: 'Một máy phục vụ',
            expression: 'ρ = λ/μ; Lq = ρ²/(1−ρ); Wq = Lq/λ; W = Wq + 1/μ',
            note: 'Cần 0 ≤ λ < μ. Khi λ = 0, thời gian chờ bằng 0.',
          },
          {
            kind: 'formula',
            mathId: 'mmc',
            label: 'Erlang C với c máy',
            expression:
              'a = λ/μ; ρ = a/c; P0 = [Σk=0…c−1 a^k/k! + a^c/(c!(1−ρ))]⁻¹; Lq = P0 × a^c × ρ / [c!(1−ρ)²]',
            note: 'Wq = Lq/λ, W = Wq + 1/μ, L = λW. Cần ρ < 1.',
          },
          {
            kind: 'example',
            title: 'Đến 4 ca/giờ; phục vụ 5 ca/giờ',
            text: 'Với một máy, ρ = 0,8; Lq = 3,2; Wq = 0,8 giờ (48 phút); W = 1 giờ. Dù công suất lớn hơn nhu cầu, thời gian chờ vẫn có thể đáng kể.',
          },
          {
            kind: 'notice',
            text: 'Khi ρ ≥ 1, không đưa ra thời gian chờ hữu hạn ở trạng thái ổn định. Dùng tải đơn vị kỳ vọng của nhóm làm thời gian phục vụ mũ là một xấp xỉ riêng; xử lý theo lô, ưu tiên hoặc dòng đến tương quan cần mô hình khác.',
          },
        ],
      },
    },
  },
  {
    id: 'little-law',
    category: 'analysis',
    content: {
      en: {
        title: 'Little’s Law',
        summary: 'Connect work in process, throughput and mean flow time.',
        keywords: ['WIP', 'Little', 'throughput', 'lead time', 'lambda'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'little',
            label: 'Stable system averages',
            expression: 'WIP = λ × CT; CT = WIP / λ',
            note: 'The rearranged CT equation requires λ > 0. Use a consistent system boundary and time unit. λ is the long-run throughput of that stable system.',
          },
          {
            kind: 'example',
            title: '12 open cases; 3 cases/hour',
            text: 'Mean flow time is 12/3 = 4 hours. If Flowculus stores CT in minutes, convert CT/60 before multiplying by arrivals per hour.',
          },
          {
            kind: 'notice',
            text: 'Little’s Law does not require exponential service times. It does require compatible averages and a stable boundary. An arrival-rate forecast can differ from realized throughput when a process is overloaded.',
          },
        ],
      },
      vi: {
        title: 'Định luật Little',
        summary: 'Liên hệ công việc dở dang, thông lượng và thời gian lưu trung bình.',
        keywords: ['WIP', 'Little', 'throughput', 'lead time', 'lambda'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'little',
            label: 'Giá trị trung bình của hệ ổn định',
            expression: 'WIP = λ × CT; CT = WIP / λ',
            note: 'Dạng suy ra CT chỉ áp dụng khi λ > 0. Dùng cùng ranh giới hệ thống và đơn vị thời gian. λ là thông lượng dài hạn của hệ ổn định đó.',
          },
          {
            kind: 'example',
            title: '12 ca đang xử lý; thông lượng 3 ca/giờ',
            text: 'Thời gian lưu trung bình là 12/3 = 4 giờ. CT trong Flowculus là phút, nên đổi CT/60 trước khi nhân với số ca đến mỗi giờ.',
          },
          {
            kind: 'notice',
            text: 'Định luật Little không đòi hỏi thời gian phục vụ phân phối mũ. Cần các giá trị trung bình tương thích và ranh giới ổn định. Tốc độ đến dự báo có thể khác thông lượng thực tế khi quy trình quá tải.',
          },
        ],
      },
    },
  },
  {
    id: 'paths-quality',
    category: 'analysis',
    content: {
      en: {
        title: 'Path counts and result quality',
        summary: 'What a path count measures, and when a number must be withheld.',
        keywords: [
          'exact',
          'assumption',
          'simulation-required',
          'cycle',
          'validation',
          'join',
        ],
        blocks: [
          {
            kind: 'formula',
            mathId: 'paths',
            label: 'Path count on an acyclic sequence graph',
            expression: 'P(end) = 1; P(v) = Σ(v→u) P(u)',
            note: 'Counts directed edge-distinct routes to the chosen terminal set. It does not enumerate every possible concurrent execution schedule.',
          },
          {
            kind: 'table',
            headers: ['Quality', 'Interpretation'],
            rows: [
              ['exact', 'Exact within the declared supported model and assumptions.'],
              [
                'assumption',
                'A stated estimate or inferred modelling assumption affects the result.',
              ],
              [
                'simulation-required',
                'A safe analytic value is unavailable for this structure; the metric is withheld.',
              ],
            ],
          },
          {
            kind: 'notice',
            text: 'Cycles prevent a general finite path count; Flowculus reports cycles or the 1,000,000-path safety limit. Multiple starts, unsupported gateways and unproven joins must not be resolved by picking an arbitrary node. Schema errors and contradictory times block the affected analysis.',
          },
        ],
      },
      vi: {
        title: 'Đếm đường đi và chất lượng kết quả',
        summary: 'Đếm đường đi đo điều gì và khi nào phải giữ trống chỉ số.',
        keywords: [
          'exact',
          'assumption',
          'simulation-required',
          'chu trình',
          'validate',
          'join',
        ],
        blocks: [
          {
            kind: 'formula',
            mathId: 'paths',
            label: 'Đếm trên đồ thị luồng tuần tự không chu trình',
            expression: 'P(end) = 1; P(v) = Σ(v→u) P(u)',
            note: 'Đếm các tuyến có chuỗi cạnh khác nhau tới tập điểm kết thúc đã chọn. Không liệt kê mọi lịch thực thi đồng thời.',
          },
          {
            kind: 'table',
            headers: ['Chất lượng', 'Diễn giải'],
            rows: [
              [
                'exact',
                'Chính xác trong phạm vi mô hình và giả định được hỗ trợ đã khai báo.',
              ],
              ['assumption', 'Có ước lượng hoặc giả định mô hình hóa ảnh hưởng kết quả.'],
              [
                'simulation-required',
                'Chưa có giá trị giải tích an toàn cho cấu trúc này; chỉ số được giữ trống.',
              ],
            ],
          },
          {
            kind: 'notice',
            text: 'Chu trình không cho phép đếm hữu hạn tổng quát; Flowculus báo chu trình hoặc giới hạn an toàn 1.000.000 đường. Không chọn tùy tiện một start, gateway hay join khi có nhiều khả năng. Sai schema hoặc thời gian mâu thuẫn chặn phần phân tích bị ảnh hưởng.',
          },
        ],
      },
    },
  },
];
