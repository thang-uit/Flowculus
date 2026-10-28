import type { KnowledgeEntry } from '@/lib/knowledge/types';
export const COLLABORATION_MINING: KnowledgeEntry[] = [
  {
    id: 'pools-lanes',
    category: 'basics',
    content: {
      en: {
        title: 'Participants, pools and lanes',
        summary: 'Separate who participates from what executes.',
        keywords: ['pool', 'lane', 'participant', 'responsibility', 'BPMN XML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'A pool represents a participant. A lane partitions responsibility within one process. Sequence flow can cross lanes within a process, but cannot cross participant pools; message flow describes communication between different participants.',
          },
          {
            kind: 'list',
            items: [
              'Open Pools and lanes above the canvas to add frames, name them and assign selected steps. The first pool wraps the existing process.',
              'Frames do not add processing time, cost or gateway semantics. Moving a task between lanes does not change its time inputs.',
              'Choose the process pool for analysis when several executable pools exist. Separate pool durations are not automatically summed into collaboration time.',
              'BPMN Pool is not the resource pool used in capacity calculations. A lane assignment does not set staffing or hourly cost.',
            ],
          },
          {
            kind: 'notice',
            text: 'The BPMN XML adapter accepts the declared subset and rejects unsupported execution semantics, including timer/boundary events and nested subprocess execution. draw.io files are a different XML format. Device files use .flowculus.json and retain analysis settings.',
          },
        ],
      },
      vi: {
        title: 'Bên tham gia, Pool và Lane',
        summary: 'Phân biệt người tham gia với các bước được thực hiện.',
        keywords: ['pool', 'lane', 'trách nhiệm', 'bên tham gia', 'BPMN XML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Pool đại diện một bên tham gia. Lane phân chia trách nhiệm trong một quy trình. Sequence flow được đi qua các lane cùng quy trình, nhưng không vượt qua hai pool; message flow mô tả trao đổi giữa các bên khác nhau.',
          },
          {
            kind: 'list',
            items: [
              'Mở Pool và Lane phía trên canvas để thêm khung, đặt tên và gán các bước đang chọn. Pool đầu tiên bao quy trình hiện có.',
              'Khung không cộng thời gian xử lý, chi phí hoặc ngữ nghĩa gateway. Chuyển task giữa các lane không đổi dữ liệu thời gian.',
              'Chọn pool cần phân tích khi có nhiều quy trình. Không tự cộng CT các pool thành thời gian phối hợp.',
              'BPMN Pool khác nhóm nguồn lực dùng tính công suất. Gán lane không tự đặt số nhân sự hay chi phí theo giờ.',
            ],
          },
          {
            kind: 'notice',
            text: 'Adapter BPMN XML nhận tập con đã công bố và từ chối ngữ nghĩa chưa hỗ trợ như timer/boundary event hoặc thực thi subprocess lồng. draw.io là định dạng XML khác. File thiết bị .flowculus.json giữ cấu hình phân tích.',
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
        summary: 'A successful trace and a sound workflow are different claims.',
        keywords: ['Petri', 'reachability', 'deadlock', 'soundness', 'safe', 'PNML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'A transition consumes one token from every input place and produces one token in every output place. Multiple outputs run together; they are not a probabilistic pass/fail choice. AND joins therefore need separate completed-branch places as inputs.',
          },
          {
            kind: 'list',
            items: [
              'BPMN → Petri converts a declared process model. Log → Alpha → Petri discovers a candidate from observations. Alpha is an algorithm, not a diagram type.',
              'The Petri view highlights enabled transitions and lets you fire them. Reset restores the initial marking; PNML exports the net and markings.',
              'Verification explores reachable markings. A final marking is successful completion, not an erroneous deadlock.',
              'Complete exploration can establish 1-safety, finite boundedness and the workflow completion conditions checked here. A bound reached returns an inconclusive result; a counterexample remains useful.',
            ],
          },
          {
            kind: 'notice',
            text: 'Verification currently examines at most 2,000 markings and limits token growth. Soundness checks option to complete, proper completion and absence of dead transitions in the supported routing model. It is not a proof of arbitrary BPMN collaboration, fairness, business correctness or general liveness.',
          },
        ],
      },
      vi: {
        title: 'Mạng Petri, replay và kiểm chứng',
        summary: 'Một trace chạy được khác với workflow có soundness.',
        keywords: ['Petri', 'reachability', 'bế tắc', 'soundness', 'safe', 'PNML'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Transition lấy một token từ mỗi place đầu vào và sinh một token tại mỗi place đầu ra. Nhiều đầu ra được kích hoạt đồng thời, không tự là lựa chọn pass/fail theo xác suất. AND join vì vậy cần place hoàn thành riêng cho từng nhánh.',
          },
          {
            kind: 'list',
            items: [
              'BPMN → Petri chuyển mô hình đã khai báo. Log → Alpha → Petri khám phá ứng viên từ dữ liệu. Alpha là thuật toán, không phải loại sơ đồ.',
              'Giao diện Petri đánh dấu transition có thể chạy và cho thực thi từng bước. Đặt lại đưa token về marking đầu; PNML lưu mạng và marking.',
              'Kiểm chứng duyệt các marking đạt được. Final marking là kết thúc hợp lệ, không phải deadlock lỗi.',
              'Duyệt hết có thể xác lập 1-safety, tính hữu hạn và các điều kiện hoàn tất workflow đang xét. Chạm giới hạn thì chưa kết luận; phản ví dụ tìm được vẫn có giá trị.',
            ],
          },
          {
            kind: 'notice',
            text: 'Hiện duyệt tối đa 2.000 marking và có giới hạn tăng token. Soundness kiểm tra khả năng hoàn tất, hoàn tất đúng và không có transition chết trong mô hình định tuyến hỗ trợ. Đây chưa phải chứng minh mọi BPMN collaboration, fairness, đúng nghiệp vụ hoặc liveness tổng quát.',
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
          'Compare observed events with a chosen reference rather than treating discovery as a standard.',
        keywords: ['alignment', 'fitness', 'skipped step', 'reference', 'mapping'],
        blocks: [
          {
            kind: 'example',
            title: 'Approval not recorded',
            text: 'Reference: Receive → Approve → Pay.\nObserved: Receive → Pay.\nA model move for Approve is one optimal explanation. Investigate whether work was skipped or the event was not logged.',
          },
          {
            kind: 'paragraph',
            text: 'Choose an open reference document and process pool, then map log activity labels to task identities. Duplicate labels require a choice. Synchronous moves cost 0; visible log/model moves cost 1; silent routing costs 0. Fitness is 1 − total alignment cost divided by the sum of trace length plus the cost of the shortest model completion.',
          },
          {
            kind: 'paragraph',
            text: 'The quality panel also reports declared variants: prefix escaping-label precision on exactly compatible cases (including completion), transition-frequency generalization on that same subset, and arc-degree simplicity with baseline 2. Coverage is displayed. These variants are not interchangeable with every PM4Py precision/generalization configuration.',
          },
          {
            kind: 'notice',
            text: 'Only one optimal alignment is displayed; alternatives may exist. Analysis is capped at 200 cases, 10,000 events and 4,000 explored states per trace. If the budget or supported semantics is exceeded, fitness is withheld. A high fitness is not precision, generalization, proof of compliance, or prevention of a release.',
          },
        ],
      },
      vi: {
        title: 'Giải thích sai lệch bằng alignment',
        summary:
          'Đối chiếu sự kiện với chuẩn được chọn; mô hình khám phá chưa tự là chuẩn.',
        keywords: ['alignment', 'fitness', 'nhảy bước', 'quy trình chuẩn', 'ánh xạ'],
        blocks: [
          {
            kind: 'example',
            title: 'Chưa ghi nhận phê duyệt',
            text: 'Chuẩn: Tiếp nhận → Phê duyệt → Chi tiền.\nLog: Tiếp nhận → Chi tiền.\nModel move cho Phê duyệt là một cách giải thích tối ưu. Cần kiểm tra bước bị bỏ qua hay chỉ thiếu bản ghi.',
          },
          {
            kind: 'paragraph',
            text: 'Chọn tài liệu chuẩn đang mở và pool cần xét, rồi ánh xạ nhãn hoạt động sang định danh task. Nhãn trùng cần chọn rõ. Synchronous move có chi phí 0; log/model move hữu hình là 1; điều phối im lặng là 0. Fitness = 1 − tổng chi phí alignment chia tổng của độ dài trace cộng chi phí hoàn tất mô hình ngắn nhất.',
          },
          {
            kind: 'paragraph',
            text: 'Bảng chất lượng còn có các biến thể công bố rõ: precision theo nhãn kế tiếp ngoài log trên ca khớp hoàn toàn (có xét kết thúc), generalization theo tần suất transition trên cùng tập con, và simplicity theo bậc cung với mốc 2. Có hiển thị coverage; không coi các biến thể này là mọi cấu hình precision/generalization của PM4Py.',
          },
          {
            kind: 'notice',
            text: 'Hiển thị một alignment tối ưu; có thể có cách giải thích khác. Giới hạn 200 ca, 10.000 sự kiện và 4.000 trạng thái xét mỗi trace. Vượt giới hạn hay ngữ nghĩa hỗ trợ thì không có fitness. Fitness cao chưa là precision, generalization, chứng minh tuân thủ hoặc chặn phát hành.',
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
        ],
      },
      vi: {
        title: 'Ai nhận bàn giao nhiều nhất?',
        summary:
          'Số người gửi, số lượt nhận và vai trò cầu nối trả lời các câu hỏi khác nhau.',
        keywords: ['In-degree', 'Out-degree', 'bàn giao', 'Betweenness', 'PageRank'],
        blocks: [
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
        ],
      },
    },
  },
];
