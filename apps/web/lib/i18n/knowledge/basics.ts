import type { KnowledgeEntry } from '@/lib/knowledge/types';

export const BASICS: KnowledgeEntry[] = [
  {
    id: 'bpmn',
    category: 'basics',
    content: {
      en: {
        title: 'Read a BPMN diagram',
        summary: 'Events, tasks, gateways and the meaning of an arrow.',
        keywords: ['shape', 'start', 'end', 'sequence flow', 'BPMN 2.0'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Start and end events delimit a process. A task represents work; a sequence flow states what may happen next. A gateway controls routing or synchronization. Its kind matters more than its visual position.',
          },
          { kind: 'notation' },
          {
            kind: 'notice',
            text: 'Flowculus implements a BPMN subset. Pool/lane organisation and BPMN XML exchange are available. Boundary-event execution and full BPMN simulation are not supported. The notation below follows BPMN 2.0.2; calculation support is listed separately. Yellow highlights are analysis overlays, not new BPMN types. Event, gateway and sequence-flow outlines stay solid. Correct symbols still require valid connections, conditions and semantics.',
          },
        ],
      },
      vi: {
        title: 'Đọc một sơ đồ BPMN',
        summary: 'Sự kiện, tác vụ, gateway và ý nghĩa của mũi tên.',
        keywords: ['hình', 'bắt đầu', 'kết thúc', 'luồng tuần tự', 'BPMN 2.0'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Sự kiện bắt đầu và kết thúc xác định ranh giới quy trình. Tác vụ biểu diễn công việc; luồng tuần tự cho biết bước nào có thể diễn ra tiếp theo. Gateway điều khiển rẽ nhánh hoặc đồng bộ. Loại gateway quyết định ngữ nghĩa, không phải vị trí hình trên canvas.',
          },
          { kind: 'notation' },
          {
            kind: 'notice',
            text: 'Flowculus hỗ trợ một tập con BPMN. Có tổ chức Pool/Lane và trao đổi BPMN XML. Chưa thực thi boundary event hoặc mô phỏng đầy đủ BPMN. Ký hiệu dưới đây được đối chiếu theo BPMN 2.0.2; khả năng tính toán được nêu riêng. Màu vàng là phần tô sáng phân tích, không phải một loại BPMN mới. Nét liền của sự kiện, gateway và luồng tuần tự luôn được giữ nguyên. Hình đúng ký hiệu vẫn cần kiểm tra kết nối, điều kiện và ngữ nghĩa.',
          },
        ],
      },
    },
  },
  {
    id: 'activity-time',
    category: 'basics',
    content: {
      en: {
        title: 'Cycle, processing and waiting time',
        summary: 'What D, T and Wq mean, and which value takes precedence.',
        keywords: [
          'CT',
          'durationMinutes',
          'processingMinutes',
          'waitingMinutes',
          'minutes',
          'hours',
        ],
        blocks: [
          {
            kind: 'formula',
            mathId: 'activity',
            label: 'Activity time',
            expression: 'CT = D when observed; otherwise CT = T + Wq',
            note: 'Use the first equation when an observed duration D is available. Otherwise, use the second: T is active processing and Wq is waiting, measured in the same unit.',
          },
          {
            kind: 'paragraph',
            text: 'All model time fields use minutes. Enter 120 for 2 hours. If D is present, the engine uses D for cycle time. If T is absent but D and Wq are known, it derives T = D − Wq. With D alone, using D as processing time is an explicit assumption.',
          },
          {
            kind: 'example',
            title: 'A two-hour activity',
            text: 'D = 120, T = 45 and Wq = 75 minutes are consistent. T + Wq > D is invalid. If T + Wq < D, the remaining gap is unexplained waiting and must be reviewed.',
          },
          {
            kind: 'notice',
            text: 'Zero is a real measurement; missing means unknown. The observed duration is per attempt, so do not enter a duration already inflated by rework and also add a rework probability.',
          },
        ],
      },
      vi: {
        title: 'Thời gian chu trình, xử lý và chờ',
        summary: 'D, T, Wq là gì và dữ liệu nào được ưu tiên.',
        keywords: [
          'CT',
          'durationMinutes',
          'processingMinutes',
          'waitingMinutes',
          'phút',
          'giờ',
        ],
        blocks: [
          {
            kind: 'formula',
            mathId: 'activity',
            label: 'Thời gian một hoạt động',
            expression: 'CT = D khi có quan sát; nếu không, CT = T + Wq',
            note: 'Dùng dòng thứ nhất khi đã đo được thời gian trôi qua D của một lượt thực hiện. Khi chưa có D, dùng dòng thứ hai: cộng thời gian xử lý T và thời gian chờ Wq. Các giá trị phải cùng đơn vị.',
          },
          {
            kind: 'paragraph',
            text: 'Các trường thời gian trong mô hình đều dùng phút. Hoạt động 2 giờ nhập 120. Khi có D, engine dùng D cho CT. Nếu thiếu T nhưng có D và Wq, engine suy ra T = D − Wq. Khi chỉ có D, lấy D làm thời gian xử lý là một giả định được ghi rõ.',
          },
          {
            kind: 'example',
            title: 'Một hoạt động hai giờ',
            text: 'D = 120, T = 45, Wq = 75 phút là nhất quán. T + Wq > D là dữ liệu sai. Nếu T + Wq < D, phần chênh là thời gian chờ chưa giải thích và cần kiểm tra.',
          },
          {
            kind: 'notice',
            text: 'Số 0 là một giá trị thực; bỏ trống là chưa biết. D là thời gian mỗi lượt, vì vậy không nhập thời gian đã cộng làm lại rồi đồng thời gán xác suất làm lại.',
          },
        ],
      },
    },
  },
  {
    id: 'sequence-xor',
    category: 'basics',
    content: {
      en: {
        title: 'Sequence and exclusive choice (XOR)',
        summary: 'Add sequential work; weight alternative branches by probability.',
        keywords: ['sum', 'expected value', 'branch probability', 'decision'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'sequence',
            label: 'Sequence / XOR',
            expression: 'CTsequence = Σ CTi; CTXOR = Σ pi × CTi; Σ pi = 1',
            note: 'Branch times cover the split-to-join block. A shared continuation is counted once.',
          },
          {
            kind: 'diagram',
            diagram: 'xor',
            caption:
              'The decision selects A or B. The process continues after the merge.',
          },
          {
            kind: 'example',
            title: 'A weighted decision',
            text: 'After 18 minutes of triage, a 24-minute review occurs with probability 0.6, otherwise a 7-minute task occurs. Expected CT is 18 + 0.6 × 24 + 0.4 × 7 = 35.2 minutes. This is an expectation, not the duration of every case.',
          },
          {
            kind: 'notice',
            text: 'Enter probabilities on outgoing XOR flows and make their total one. A zero probability denotes an impossible branch under the given model; it does not erase the branch from the drawing.',
          },
        ],
      },
      vi: {
        title: 'Tuần tự và lựa chọn loại trừ (XOR)',
        summary: 'Cộng các bước liên tiếp; lấy kỳ vọng theo xác suất các nhánh.',
        keywords: ['tổng', 'kỳ vọng', 'xác suất nhánh', 'quyết định'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'sequence',
            label: 'Tuần tự / XOR',
            expression: 'CTtuần tự = Σ CTi; CTXOR = Σ pi × CTi; Σ pi = 1',
            note: 'Thời gian nhánh tính trong khối split–join; phần tiếp tục chung chỉ tính một lần.',
          },
          {
            kind: 'diagram',
            diagram: 'xor',
            caption: 'Gateway chọn A hoặc B, rồi đi tiếp sau điểm gộp.',
          },
          {
            kind: 'example',
            title: 'Một quyết định có xác suất',
            text: 'Sau 18 phút phân loại, có 60% trường hợp cần duyệt 24 phút, còn lại xử lý tự động 7 phút. CT kỳ vọng = 18 + 0,6 × 24 + 0,4 × 7 = 35,2 phút. Đây là kỳ vọng, không phải thời gian của mọi ca.',
          },
          {
            kind: 'notice',
            text: 'Nhập xác suất trên các luồng đi ra của XOR sao cho tổng bằng 1. Xác suất 0 nghĩa là nhánh không xảy ra theo mô hình đã khai báo; không có nghĩa xóa nhánh khỏi hình.',
          },
        ],
      },
    },
  },
  {
    id: 'parallel-or',
    category: 'basics',
    content: {
      en: {
        title: 'Parallel (AND) and inclusive (OR) branches',
        summary:
          'Elapsed time uses max, while resource effort adds across active branches.',
        keywords: ['maximum', 'join', 'SESE', 'independent', 'inclusive gateway'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'parallel',
            label: 'Parallel block',
            expression: 'CTAND = max(CT1, …, CTn); CostAND = Σ Costi',
            note: 'All branches start together and the matching join waits for all of them. Branch times must be suitable deterministic values.',
          },
          {
            kind: 'diagram',
            diagram: 'and',
            caption: 'A and B both run. The AND join synchronizes their completion.',
          },
          {
            kind: 'formula',
            mathId: 'inclusive',
            label: 'Inclusive block under independent selection',
            expression:
              'CTOR = ΣS≠∅ P(S | at least one selected) × max(CTi : i ∈ S); P(S | at least one selected) = [∏i∈S pi × ∏j∉S (1−pj)] / [1−∏i (1−pi)]',
            note: '𝒮 is the random set of selected branches; S denotes one possible nonempty subset of the outgoing branches. The first equation averages the completion time of each selected subset; its join waits for the slowest selected branch. In the second equation, multiply the selection probabilities of branches in S and the non-selection probabilities of all remaining branches. Divide by the probability that at least one branch is selected.\n\nThis model assumes independent branch selection and fixed branch durations. Every pi lies in [0, 1] and at least one must be positive. The normalized probabilities of all nonempty subsets sum to 1. Unlike XOR probabilities, the individual pi values need not sum to 1.',
          },
          {
            kind: 'example',
            title: 'Two independent optional branches',
            text: 'Let A take 10 minutes and B take 20 minutes, each selected independently with probability 0.5. Before conditioning, the four subsets (none, A only, B only, both) each have probability 0.25. Require at least one branch: the three remaining subsets each have conditional probability 1/3. Their completion times are 10, 20 and max(10, 20) = 20 minutes, so expected CT is (10 + 20 + 20) / 3 ≈ 16.67 minutes.',
          },
          {
            kind: 'notice',
            text: 'For random durations, E[max(X,Y)] generally differs from max(E[X],E[Y]). Independent OR selection is an assumption, not general BPMN semantics. Flowculus limits OR enumeration to 12 branches; unproven joins or unsupported structures require simulation.',
          },
        ],
      },
      vi: {
        title: 'Nhánh song song (AND) và bao hàm (OR)',
        summary:
          'Thời gian trôi qua dùng max; công sức và chi phí cộng trên các nhánh chạy.',
        keywords: ['lớn nhất', 'hội tụ', 'SESE', 'độc lập', 'inclusive gateway'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'parallel',
            label: 'Khối song song',
            expression: 'CTAND = max(CT1, …, CTn); CostAND = Σ Costi',
            note: 'Các nhánh bắt đầu cùng lúc, join tương ứng đợi tất cả. Thời gian nhánh phải là các giá trị xác định phù hợp.',
          },
          {
            kind: 'diagram',
            diagram: 'and',
            caption: 'A và B đều chạy. AND join đồng bộ lúc hoàn tất.',
          },
          {
            kind: 'formula',
            mathId: 'inclusive',
            label: 'OR với giả định chọn nhánh độc lập',
            expression:
              'CTOR = ΣS≠∅ P(S | có ít nhất một nhánh) × max(CTi : i ∈ S); P(S | có ít nhất một nhánh) = [∏i∈S pi × ∏j∉S (1−pj)] / [1−∏i (1−pi)]',
            note: '𝒮 là tập nhánh ngẫu nhiên được chọn; S là một tập nhánh có thể xảy ra, gồm ít nhất một nhánh. Dòng đầu tính thời gian kỳ vọng bằng cách xét từng tập S; trong mỗi tập, join phải chờ nhánh chậm nhất. Ở dòng thứ hai, nhân xác suất được chọn của các nhánh thuộc S với xác suất không được chọn của các nhánh còn lại. Sau đó chia cho xác suất có ít nhất một nhánh được chọn.\n\nCông thức này giả định các nhánh được chọn độc lập và thời gian từng nhánh là giá trị xác định. Mỗi pi nằm trong [0, 1], ít nhất một pi phải lớn hơn 0. Sau chuẩn hóa, tổng xác suất các tập khác rỗng bằng 1. Các pi riêng lẻ không bắt buộc cộng thành 1 như trong XOR.',
          },
          {
            kind: 'example',
            title: 'Hai nhánh tùy chọn độc lập',
            text: 'Nhánh A mất 10 phút, nhánh B mất 20 phút; mỗi nhánh được chọn độc lập với xác suất 0,5. Ban đầu có bốn tập nhánh (không chọn, chỉ A, chỉ B, cả hai), mỗi tập có xác suất 0,25. Khi yêu cầu chọn ít nhất một nhánh, ba tập còn lại đều có xác suất có điều kiện bằng 1/3. Thời gian hoàn tất lần lượt là 10, 20 và max(10, 20) = 20 phút. Vì vậy CT kỳ vọng = (10 + 20 + 20) / 3 ≈ 16,67 phút.',
          },
          {
            kind: 'notice',
            text: 'Với thời gian ngẫu nhiên, E[max(X,Y)] thường khác max(E[X],E[Y]). Chọn OR độc lập là giả định, không đại diện toàn bộ ngữ nghĩa BPMN. Flowculus giới hạn liệt kê OR ở 12 nhánh; join chưa chứng minh được hoặc cấu trúc chưa hỗ trợ cần mô phỏng.',
          },
        ],
      },
    },
  },
  {
    id: 'rework',
    category: 'basics',
    content: {
      en: {
        title: 'Rework: one redo versus repeated attempts',
        summary: 'Choose the model first; its repetition policy determines the formula.',
        keywords: ['retry', 'loop', '1+r', '1-r', 'geometric', 'at most once'],
        blocks: [
          {
            kind: 'formula',
            mathId: 'once',
            label: 'At most one redo',
            expression: 'E[CT] = τ₀ + r × τᵣ; when τ₀ = τᵣ = τ, E[CT] = (1 + r) × τ',
            note: 'τ₀ is the elapsed time of the first attempt; τᵣ is the time of one redo; r is the probability that the redo is needed (0 ≤ r ≤ 1). Every case incurs τ₀, while only a fraction r incurs τᵣ. The second line applies only when both attempts take the same time τ.\n\nFor example, an initial attempt takes 120 minutes and a redo takes 30 minutes with probability 0.5: the expectation is 120 + 0.5 × 30 = 135 minutes. When both take 120 minutes, the result is 180 minutes. The separate redo task must lead forward, with no return to the decision.',
          },
          {
            kind: 'diagram',
            diagram: 'rework-once',
            caption:
              'A separate redo task after an XOR decision makes the one-redo limit explicit.',
          },
          {
            kind: 'formula',
            mathId: 'repeated',
            label: 'Repeated attempts',
            expression: 'E[N] = 1 / (1 − r); E[CT] = τ / (1 − r), 0 ≤ r < 1',
            note: 'N counts all attempts, including the first. Each attempt takes elapsed time τ and independently requires another attempt with the same probability r. The expected number of attempts is 1/(1 − r), so the expected cycle time is τ/(1 − r). Here τ includes any waiting within an attempt; it is not necessarily active processing time T. At r = 1 the process never exits under this model, so there is no finite expectation.',
          },
          {
            kind: 'diagram',
            diagram: 'rework-loop',
            caption:
              'A flow back to the same task permits another attempt after each completion.',
          },
          {
            kind: 'example',
            title: 'τ = 120 minutes; r = 0.5',
            text: 'One redo: 120 + 0.5 × 120 = 180 minutes. Repeated attempts: 120 / (1 − 0.5) = 240 minutes. A drawing alone does not impose a one-redo limit unless its control flow encodes it.',
          },
          {
            kind: 'notice',
            text: 'The task reworkProbability field means repeated rework. To model at most one redo, use a separate task and XOR flows and leave that field unset. Do not count the same repetition in both a loop connector and the task field.',
          },
        ],
      },
      vi: {
        title: 'Làm lại: một lần hay nhiều lượt?',
        summary: 'Chọn đúng mô hình trước; quy tắc lặp quyết định công thức.',
        keywords: [
          'rework',
          'retry',
          'vòng lặp',
          '1+r',
          '1-r',
          'hình học',
          'tối đa một lần',
        ],
        blocks: [
          {
            kind: 'formula',
            mathId: 'once',
            label: 'Tối đa một lần làm lại',
            expression: 'E[CT] = τ₀ + r × τᵣ; khi τ₀ = τᵣ = τ, E[CT] = (1 + r) × τ',
            note: 'τ₀ là thời gian trôi qua của lượt đầu; τᵣ là thời gian của một lượt làm lại; r là xác suất phải làm lại (0 ≤ r ≤ 1). Mọi ca đều tốn τ₀, nhưng chỉ tỷ lệ r các ca tốn thêm τᵣ. Dòng thứ hai chỉ áp dụng khi hai lượt có cùng thời gian τ.\n\nVí dụ, lượt đầu mất 120 phút, lượt làm lại mất 30 phút và xác suất làm lại là 0,5: kỳ vọng bằng 120 + 0,5 × 30 = 135 phút. Nếu cả hai lượt đều mất 120 phút thì kết quả là 180 phút. Trên sơ đồ, tác vụ làm lại riêng phải đi tiếp, không được quay về quyết định để làm lại nữa.',
          },
          {
            kind: 'diagram',
            diagram: 'rework-once',
            caption: 'Tác vụ làm lại riêng sau XOR thể hiện rõ giới hạn tối đa một lần.',
          },
          {
            kind: 'formula',
            mathId: 'repeated',
            label: 'Có thể lặp nhiều lượt',
            expression: 'E[N] = 1 / (1 − r); E[CT] = τ / (1 − r), 0 ≤ r < 1',
            note: 'N đếm tổng số lượt thực hiện, kể cả lượt đầu. Mỗi lượt mất thời gian trôi qua τ và có cùng xác suất r phải thực hiện thêm một lượt, độc lập với các lượt trước. Số lượt kỳ vọng là 1/(1 − r), nên thời gian chu trình kỳ vọng là τ/(1 − r). τ có thể bao gồm thời gian chờ trong lượt, không nhất thiết bằng thời gian xử lý T. Nếu r = 1 thì quy trình không thoát theo mô hình này và không có kỳ vọng hữu hạn.',
          },
          {
            kind: 'diagram',
            diagram: 'rework-loop',
            caption: 'Luồng quay về cùng tác vụ cho phép tiếp tục làm lại sau mỗi lượt.',
          },
          {
            kind: 'example',
            title: 'τ = 120 phút; r = 0,5',
            text: 'Tối đa một lần: 120 + 0,5 × 120 = 180 phút. Lặp nhiều lượt: 120 / (1 − 0,5) = 240 phút. Sơ đồ không tự có giới hạn một lần nếu luồng điều khiển chưa biểu diễn giới hạn đó.',
          },
          {
            kind: 'notice',
            text: 'Trường reworkProbability trên tác vụ nghĩa là có thể lặp nhiều lượt. Muốn tối đa một lần, dùng tác vụ làm lại riêng và nhánh XOR, để trống trường này. Không khai báo cùng một lần lặp bằng cả mũi tên quay về lẫn xác suất trên tác vụ.',
          },
        ],
      },
    },
  },
];
