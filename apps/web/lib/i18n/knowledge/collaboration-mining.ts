import type { KnowledgeEntry } from '@/lib/knowledge/types';

export const COLLABORATION_MINING: KnowledgeEntry[] = [
  {
    id: 'pools-lanes',
    category: 'basics',
    content: {
      en: {
        title: 'Participants, pools and lanes',
        summary:
          'Represent participants and responsibility without turning frames into executable work.',
        keywords: ['pool', 'lane', 'participant', 'responsibility', 'BPMN XML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'A pool represents a participant, such as an organisation or an external partner. Lanes divide responsibility within one pool, usually by role or department. A lane does not create an additional processing step.',
          },
          {
            kind: 'example',
            title: 'A request passes through three roles',
            text: 'Within a “Processing organisation” pool, Intake records a request, Approval checks and approves it, and Fulfilment carries out the work. Sequence flow connects tasks across those lanes because they belong to one process. Communication with a separate external participant uses another pool and message flow.',
          },
          {
            kind: 'heading',
            text: 'Frames and calculation',
          },
          {
            kind: 'paragraph',
            text: 'Pools and lanes have no duration, so they do not add cycle time. Moving a task between lanes preserves its time and probability inputs. A lane does not set staffing, capacity or hourly cost. A capacity resource pool is a separate concept.',
          },
          {
            kind: 'heading',
            text: 'Editing in Flowculus',
          },
          {
            kind: 'paragraph',
            text: 'Drag Pool or Lane from Shapes onto the canvas, or click to insert. A lane dropped inside a pool is inserted at the drop position. A lane dropped in free space creates its owning pool as well. Drag a pool title strip to move its contents with it. Reorder one lane at a time by dragging that lane’s title.',
          },
          {
            kind: 'paragraph',
            text: 'Double-click a name to edit it. Delete or Backspace removes the selected frame, its contents and incident connections. Undo restores the edit. To keep the work while removing only its frame, use “Remove frame, keep steps” in Pool/Lane management.',
          },
          {
            kind: 'paragraph',
            text: 'Pool handles resize the frame. The trailing lane divider adjusts the boundary with the next lane. Inspector offers numeric dimensions and lane-order controls for keyboard and smaller-screen use. Rejected dimensions show an inline error and do not change the model.',
          },
          {
            kind: 'notice',
            text: 'Sequence flow cannot cross two pools. Select an explicit process pool when multiple executable pools exist. Participant durations are not automatically summed into collaboration time. Free executable steps need membership before a pooled model can be analysed.',
          },
          {
            kind: 'paragraph',
            text: 'Native .flowculus.json files retain the model and analysis settings. The BPMN XML adapter accepts the declared subset and rejects unsupported timer/boundary events or nested subprocess execution. draw.io XML is a different format from BPMN 2.0.',
          },
        ],
      },
      vi: {
        title: 'Bên tham gia, Pool và Lane',
        summary:
          'Dùng khung để thể hiện bên tham gia và vai trò, giữ riêng logic thực thi.',
        keywords: ['pool', 'lane', 'trách nhiệm', 'bên tham gia', 'BPMN XML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Pool đại diện cho một bên tham gia quy trình, chẳng hạn một doanh nghiệp hoặc một đối tác bên ngoài. Lane chia trách nhiệm bên trong cùng một pool, thường theo vai trò hoặc bộ phận. Lane không tự tạo thêm một bước xử lý.',
          },
          {
            kind: 'example',
            title: 'Một yêu cầu đi qua ba vai trò',
            text: 'Trong pool “Đơn vị xử lý”, lane Tiếp nhận ghi nhận yêu cầu, lane Phê duyệt kiểm tra và chấp thuận, lane Thực hiện xử lý công việc. Các tác vụ được nối bằng sequence flow qua ba lane vì vẫn thuộc cùng một quy trình. Khi một đơn vị bên ngoài trao đổi thông tin, dùng pool riêng và message flow để thể hiện trao đổi đó.',
          },
          {
            kind: 'heading',
            text: 'Quan hệ giữa khung và tính toán',
          },
          {
            kind: 'paragraph',
            text: 'Pool và lane không có thời lượng nên không cộng vào thời gian chu trình. Chuyển một tác vụ sang lane khác giữ nguyên thời gian và xác suất đã nhập. Một lane cũng không tự quy định số nhân sự, năng suất hay đơn giá. Nhóm nguồn lực dùng tính công suất là một khái niệm khác.',
          },
          {
            kind: 'heading',
            text: 'Chỉnh sửa trong Flowculus',
          },
          {
            kind: 'paragraph',
            text: 'Kéo Pool hoặc Lane từ bảng Hình vào canvas, hoặc bấm để thêm. Lane thả trong pool được chèn theo vị trí thả. Nếu thả ở vùng trống, Flowculus tạo cả pool chứa lane. Kéo dải tiêu đề của pool để di chuyển khung cùng nội dung. Đổi thứ tự từng lane bằng cách kéo tiêu đề của lane đó.',
          },
          {
            kind: 'paragraph',
            text: 'Nhấp đúp tên để sửa. Chọn khung rồi nhấn Delete hoặc Backspace sẽ xóa khung cùng nội dung và các đường nối liên quan. Undo khôi phục lại. Nếu chỉ muốn bỏ khung và giữ công việc, dùng mục “Bỏ khung, giữ công việc” trong quản lý Pool/Lane.',
          },
          {
            kind: 'paragraph',
            text: 'Kéo điểm điều khiển để co giãn pool, kéo vạch cuối lane để chỉnh ranh giới với lane kế tiếp. Bảng Thuộc tính có ô nhập kích thước và nút đổi thứ tự để dùng bằng bàn phím hoặc trên màn hình nhỏ. Kích thước không hợp lệ được báo ngay tại ô và không thay mô hình.',
          },
          {
            kind: 'notice',
            text: 'Sequence flow không được đi xuyên hai pool. Khi có nhiều pool thực thi, chọn rõ pool cần phân tích. Không tự cộng thời gian của các pool thành thời gian phối hợp. Các công việc nằm ngoài pool cần được gán trách nhiệm trước khi phân tích mô hình có pool.',
          },
          {
            kind: 'paragraph',
            text: 'File .flowculus.json giữ mô hình và cấu hình phân tích. Adapter BPMN XML chỉ nhận tập con đã công bố, từ chối timer/boundary event hoặc thực thi subprocess lồng chưa hỗ trợ. File draw.io là một định dạng XML khác với BPMN 2.0.',
          },
        ],
      },
    },
  },
  {
    id: 'petri-verification',
    category: 'mining',
    content: {
      en: {
        title: 'Petri nets, replay and verification',
        summary:
          'Follow tokens through a process and distinguish replay from model verification.',
        keywords: ['Petri', 'reachability', 'deadlock', 'soundness', 'safe', 'PNML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'A Petri net represents process state with tokens. A place can hold tokens and usually represents a condition or waiting state. A transition changes the state. A marking is the distribution of tokens across the whole net at one moment.',
          },
          {
            kind: 'heading',
            text: 'When can a transition fire?',
          },
          {
            kind: 'paragraph',
            text: 'In the supported net, a transition is enabled when each input place has enough tokens. Firing consumes tokens from its input places and produces tokens in its output places. Multiple outputs receive tokens together. They do not represent a random choice of one branch.',
          },
          {
            kind: 'example',
            title: 'Both branches must finish before proceeding',
            text: 'An AND split supplies tokens to two branches so their work can proceed independently. The AND join can fire only when both branches have supplied tokens to its separate input places. If one branch is still unfinished, the join is not enabled.',
          },
          {
            kind: 'heading',
            text: 'A declared model or observed data',
          },
          {
            kind: 'paragraph',
            text: 'BPMN → Petri converts a declared process within the supported subset. Event log → Alpha Miner → Petri discovers a candidate from recorded behaviour. Alpha Miner is a discovery algorithm, not a diagram type. A discovered model is not automatically an approved reference.',
          },
          {
            kind: 'heading',
            text: 'Replay and verification ask different questions',
          },
          {
            kind: 'paragraph',
            text: 'Replay examines how an observed event sequence can traverse a model. Model verification explores reachable markings to check whether completion remains possible, completion has the proper final marking, and any transitions can never run. A valid final marking is successful completion, not an erroneous deadlock.',
          },
          {
            kind: 'paragraph',
            text: 'Flowculus highlights enabled transitions so you can fire them step by step. Reset restores the initial marking. PNML exports the net and markings. Verification explains its findings or why a conclusion could not be reached.',
          },
          {
            kind: 'notice',
            text: 'Verification currently explores at most 2,000 markings and bounds token growth. Reaching a bound is inconclusive, not proof of safety. These completion checks apply to the supported routing model and do not establish business correctness, fairness or general liveness.',
          },
        ],
      },
      vi: {
        title: 'Mạng Petri, replay và kiểm chứng',
        summary:
          'Hiểu cách token chạy qua quy trình và phân biệt replay với kiểm chứng mô hình.',
        keywords: ['Petri', 'reachability', 'bế tắc', 'soundness', 'safe', 'PNML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Mạng Petri biểu diễn trạng thái quy trình bằng token. Place là vị trí có thể giữ token, thường thể hiện một điều kiện hoặc trạng thái chờ. Transition là chuyển tiếp làm thay đổi trạng thái. Marking là cách phân bố token trên toàn mạng tại một thời điểm.',
          },
          {
            kind: 'heading',
            text: 'Khi nào một chuyển tiếp được thực hiện?',
          },
          {
            kind: 'paragraph',
            text: 'Trong mạng được hỗ trợ ở đây, một transition được kích hoạt khi mỗi place đầu vào có đủ token. Thực hiện transition sẽ lấy token ở các đầu vào và sinh token ở các đầu ra. Nếu có nhiều đầu ra, token được sinh đồng thời tại các đầu ra đó. Đây không phải lựa chọn ngẫu nhiên một nhánh.',
          },
          {
            kind: 'example',
            title: 'Hai việc cần hoàn thành trước khi tiếp tục',
            text: 'Sau một bước tách AND, hai nhánh được cấp token để có thể tiến hành độc lập. Điểm gộp AND chỉ tiếp tục khi cả hai nhánh đã đưa token về các place đầu vào riêng. Nếu một nhánh chưa hoàn thành, transition gộp chưa được kích hoạt.',
          },
          {
            kind: 'heading',
            text: 'Tạo mạng từ mô hình hay từ dữ liệu',
          },
          {
            kind: 'paragraph',
            text: 'BPMN → Petri chuyển một quy trình đã khai báo sang mạng tương ứng trong tập con hỗ trợ. Event log → Alpha Miner → Petri khám phá một mô hình ứng viên từ hành vi đã ghi nhận. Alpha Miner là thuật toán khám phá, không phải một loại đồ thị. Mô hình được khám phá chưa tự trở thành quy trình chuẩn.',
          },
          {
            kind: 'heading',
            text: 'Replay và kiểm chứng trả lời hai câu hỏi khác nhau',
          },
          {
            kind: 'paragraph',
            text: 'Replay kiểm tra một chuỗi sự kiện quan sát được có thể đi qua mô hình như thế nào. Kiểm chứng mô hình duyệt các marking có thể đạt được để xem quy trình có thể hoàn tất, khi hoàn tất có giữ đúng marking cuối, và có transition nào không bao giờ chạy được. Marking cuối hợp lệ là hoàn tất, không phải lỗi bế tắc.',
          },
          {
            kind: 'paragraph',
            text: 'Trong Flowculus, màn Petri đánh dấu transition đang được kích hoạt để bạn thực hiện từng bước. Đặt lại đưa token về marking ban đầu. PNML xuất cấu trúc mạng và marking. Kết quả kiểm chứng giải thích phát hiện được hoặc lý do chưa thể kết luận.',
          },
          {
            kind: 'notice',
            text: 'Bộ kiểm chứng hiện duyệt tối đa 2.000 marking và có giới hạn tăng token. Chạm giới hạn nghĩa là chưa kết luận, không phải đã chứng minh mô hình an toàn. Các kiểm tra hoàn tất ở đây áp dụng cho mô hình định tuyến được hỗ trợ, không chứng minh đúng nghiệp vụ, fairness hay liveness tổng quát.',
          },
        ],
      },
    },
  },
  {
    id: 'alignment-evidence',
    category: 'mining',
    content: {
      en: {
        title: 'Explain a deviation with alignment',
        summary:
          'Compare a log with an approved model and interpret each explanation of a deviation.',
        keywords: ['alignment', 'fitness', 'skipped step', 'reference', 'mapping'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Alignment matches a recorded event sequence to an execution of a reference model. They may not match completely. The match identifies observed events that cannot be explained by the model, or required model steps with no corresponding recorded event.',
          },
          {
            kind: 'example',
            title: 'Was approval actually skipped?',
            text: 'Reference: Receive → Approve → Pay.\nObserved log: Receive → Pay.\nOne explanation inserts the model’s approval step without a matching log event. Investigate whether approval was omitted or performed without being logged. Alignment alone does not identify the real-world cause.',
          },
          {
            kind: 'heading',
            text: 'Three kinds of moves',
          },
          {
            kind: 'table',
            headers: ['Term', 'Interpretation'],
            rows: [
              ['Synchronous move', 'A log event matches an enabled model step.'],
              ['Log move', 'A recorded event has no matching model step at that point.'],
              [
                'Model move',
                'The model executes a step without a matching log event. Silent routing is not omitted business work.',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'In Flowculus, select a confirmed reference document and process pool. Map log activities to task identities and resolve duplicate labels explicitly. Do not automatically use a model discovered from the same log as its normative reference.',
          },
          {
            kind: 'heading',
            text: 'Costs and fitness',
          },
          {
            kind: 'paragraph',
            text: 'Synchronous moves and silent routing cost 0. Visible log and model moves cost 1. Fitness is 1 minus total alignment cost divided by the sum of trace lengths and shortest model-completion costs for the evaluated cases. A high value describes fit under this metric, not proof of business compliance.',
          },
          {
            kind: 'paragraph',
            text: 'The quality panel declares separate variants of escaping-label precision, transition-frequency generalization and arc-degree simplicity. The first two use only completely matching cases and display that coverage. Do not compare them directly with another PM4Py configuration without checking the metric definitions.',
          },
          {
            kind: 'notice',
            text: 'The interface shows one minimum-cost alignment. Other optimal explanations can exist. Current budgets are 200 cases, 10,000 events and 4,000 states per trace. Fitness is withheld when the budget or supported semantics is exceeded.',
          },
        ],
      },
      vi: {
        title: 'Giải thích sai lệch bằng alignment',
        summary: 'Đối chiếu log với mô hình chuẩn và đọc từng cách giải thích sai lệch.',
        keywords: ['alignment', 'fitness', 'nhảy bước', 'quy trình chuẩn', 'ánh xạ'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Alignment tìm một cách ghép chuỗi sự kiện trong log với đường chạy của mô hình tham chiếu. Hai bên có thể không khớp hoàn toàn. Cách ghép chỉ ra sự kiện quan sát được mà mô hình không cho phép, hoặc bước mô hình cần nhưng log chưa ghi nhận.',
          },
          {
            kind: 'example',
            title: 'Có thực sự bỏ bước phê duyệt?',
            text: 'Quy trình chuẩn: Tiếp nhận → Phê duyệt → Chi tiền.\nLog quan sát: Tiếp nhận → Chi tiền.\nMột cách giải thích là mô hình cần bước Phê duyệt nhưng log không có sự kiện tương ứng. Cần kiểm tra công việc đã bị bỏ qua, hay đã làm nhưng thiếu bản ghi. Alignment không tự xác định nguyên nhân thực tế.',
          },
          {
            kind: 'heading',
            text: 'Ba loại bước trong kết quả',
          },
          {
            kind: 'table',
            headers: ['Thuật ngữ', 'Cách đọc'],
            rows: [
              [
                'Synchronous move',
                'Sự kiện log khớp một bước thực hiện được trong mô hình.',
              ],
              [
                'Log move',
                'Có sự kiện trong log nhưng không ghép được với bước mô hình tại vị trí đó.',
              ],
              [
                'Model move',
                'Mô hình đi qua một bước mà không có sự kiện log tương ứng. Điều phối im lặng không phải công việc bị bỏ.',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Trong Flowculus, chọn tài liệu chuẩn đã xác nhận và pool cần xét. Ánh xạ hoạt động từ log sang task theo định danh, chọn rõ nếu nhãn bị trùng. Không dùng chính đồ thị vừa khám phá từ log làm chuẩn mặc định để kết luận log đúng.',
          },
          {
            kind: 'heading',
            text: 'Chi phí và cách đọc fitness',
          },
          {
            kind: 'paragraph',
            text: 'Synchronous move và điều phối im lặng có chi phí 0. Log move và model move hữu hình có chi phí 1. Fitness bằng 1 trừ tổng chi phí alignment chia cho tổng độ dài trace và chi phí hoàn tất mô hình ngắn nhất của các ca được xét. Giá trị cao cho biết mức khớp theo cách đo này, không tự là bằng chứng tuân thủ nghiệp vụ.',
          },
          {
            kind: 'paragraph',
            text: 'Bảng chất lượng công bố riêng precision theo các nhãn kế tiếp ngoài log, generalization theo tần suất transition và simplicity theo bậc cung. Hai chỉ số đầu chỉ xét các ca khớp hoàn toàn và có hiển thị tỷ lệ ca được xét. Không so sánh trực tiếp chúng với một cấu hình PM4Py khác mà chưa đối chiếu cách đo.',
          },
          {
            kind: 'notice',
            text: 'Giao diện hiển thị một alignment có chi phí tối thiểu. Có thể tồn tại cách giải thích tối ưu khác. Giới hạn hiện tại là 200 ca, 10.000 sự kiện và 4.000 trạng thái mỗi trace. Vượt giới hạn hoặc gặp ngữ nghĩa chưa hỗ trợ thì không đưa ra fitness.',
          },
        ],
      },
    },
  },
  {
    id: 'resource-direction',
    category: 'mining',
    content: {
      en: {
        title: 'Who receives the most handoffs?',
        summary:
          'Distinct senders, transfer counts and bridge roles answer different questions.',
        keywords: [
          'In-degree',
          'Out-degree',
          'weighted in-degree',
          'Betweenness',
          'PageRank',
        ],
        blocks: [
          {
            kind: 'paragraph',
            text: 'A handoff network represents resources transferring work within a case. A node may represent a person, group or system, depending on the log’s resource field. Check that field’s meaning before interpreting a node as an individual employee.',
          },
          {
            kind: 'table',
            headers: ['Question', 'Metric'],
            rows: [
              ['How many distinct resources hand over to this person?', 'In-degree'],
              [
                'How many incoming transfers are observed?',
                'Incoming handoffs (weighted in-degree)',
              ],
              ['How many recipients receive work from this resource?', 'Out-degree'],
              ['Who bridges shortest paths in the declared network?', 'Betweenness'],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Flowculus derives a directed handoff from consecutive events with different known resources in a case. Parallel work, missing events and group identities can change that interpretation. Incoming transfers are not workload, productivity or evidence of blame. PageRank and Eigenvector describe network structure, not how many jobs someone receives.',
          },
          {
            kind: 'example',
            title: 'Two senders and five transfers',
            text: 'In a synthetic example, Lan hands work to Minh three times and An does so twice. Minh has in-degree 2 because there are two distinct senders, and five incoming transfers. These answer different questions and do not measure Minh’s processing time.',
          },
        ],
      },
      vi: {
        title: 'Ai nhận bàn giao nhiều nhất?',
        summary:
          'Số người gửi, số lượt nhận và vai trò cầu nối trả lời các câu hỏi khác nhau.',
        keywords: ['In-degree', 'Out-degree', 'bàn giao', 'Betweenness', 'PageRank'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Mạng bàn giao thể hiện các nguồn lực chuyển công việc cho nhau trong cùng một ca. Một node có thể là một người, một nhóm hoặc một hệ thống, tùy cột resource trong log. Cần đọc định nghĩa cột này trước khi diễn giải một node thành nhân sự cụ thể.',
          },
          {
            kind: 'table',
            headers: ['Câu hỏi', 'Độ đo'],
            rows: [
              ['Có bao nhiêu resource khác bàn giao tới người này?', 'In-degree'],
              [
                'Có bao nhiêu lượt chuyển tới được quan sát?',
                'Lượt bàn giao đến, tức tổng trọng số đầu vào',
              ],
              ['Resource này bàn giao cho bao nhiêu nơi khác?', 'Out-degree'],
              ['Ai nối các đường ngắn nhất trong mạng đã khai báo?', 'Betweenness'],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Flowculus suy ra cung có hướng từ hai sự kiện kế tiếp cùng ca có resource khác nhau và xác định. Công việc song song, thiếu sự kiện và resource nhóm có thể làm thay đổi ý nghĩa này. Lượt nhận chưa là khối lượng việc, năng suất hay bằng chứng quy trách nhiệm. PageRank/Eigenvector mô tả cấu trúc mạng, không phải số việc nhận.',
          },
          {
            kind: 'example',
            title: 'Hai người gửi, năm lượt bàn giao',
            text: 'Ví dụ tổng hợp: Lan bàn giao cho Minh ba lần, An bàn giao cho Minh hai lần. In-degree của Minh là 2 vì có hai nguồn gửi khác nhau. Tổng lượt nhận là 5. Hai con số trả lời hai câu hỏi khác nhau và chưa đo thời gian Minh xử lý công việc.',
          },
        ],
      },
    },
  },
];
