import type { KnowledgeEntry } from '@/lib/knowledge/types';

export const WORKFLOW: KnowledgeEntry[] = [
  {
    id: 'editing',
    category: 'workflow',
    content: {
      en: {
        title: 'Draw, edit and validate',
        summary: 'A practical workflow from the first task to a reviewed model.',
        keywords: [
          'clipboard',
          'copy',
          'paste',
          'undo',
          'connector',
          'waypoint',
          'responsive',
        ],
        blocks: [
          {
            kind: 'list',
            items: [
              'Select moves shapes; on desktop, drag the background to select several elements. Hand pans the view without moving the model. On touchscreens, background drags pan. Both tools are available in the desktop and mobile canvas controls.',
              'Add start/end events, tasks and explicit gateway kinds; connect sequence flows.',
              'Set times in minutes, branch probabilities and intended rework policy in Inspector.',
              'Use copy/paste, duplicate, undo/redo and alignment tools to refine the model.',
              'Read diagnostics and confirm inferred semantics before exporting.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'On desktop, the compact yellow arrow at the top of Shapes collapses the palette to icons; click it again to expand labels. On phones, the matching yellow button lives in the bottom canvas toolbar, so the palette can always be reopened. This only changes the layout and preserves every shape on the canvas.',
          },
          {
            kind: 'paragraph',
            text: 'Click a shape or connector once to open Properties automatically. Enter processing time (T), waiting time (Wq), cycle time (CT), rework probability and cost there. Clicking empty canvas dismisses Properties; selecting another element switches the panel to that element.',
          },
          { kind: 'heading', text: 'Reshape a connector' },
          {
            kind: 'paragraph',
            text: 'Select a line and drag a segment handle or bend point. Double-click the line to add a bend. Arrow keys move a focused handle; Shift increases the step. Delete or Alt-click removes a bend. Choose straight, curved or orthogonal routing in Inspector.',
          },
          { kind: 'heading', text: 'Move an arrow to another gateway tip' },
          {
            kind: 'paragraph',
            text: 'Drag the round endpoint handle to the top, right, bottom or left point of the shape. You can choose another tip of the same gateway without changing the process. The nearest point snaps at any zoom. With a handle focused, arrow keys choose the side and Home restores Automatic. Inspector offers the same choices with touch or keyboard.',
          },
          {
            kind: 'paragraph',
            text: 'An empty or invalid drop keeps the original connection. Escape, window blur or pointer cancellation cancels a drag. Each completed valid gesture is one undo step. Explicit attachment sides survive moving/resizing, clipboard and supported file round trips. Reconnecting to a different shape clears the old bends; changing only the side on the same shape preserves them.',
          },
          {
            kind: 'notice',
            text: 'Straight lines join the selected points directly. Curved and orthogonal routes approach from the selected side. Overlapping shapes or manually placed bends may still cross another shape; adjust the route to suit the drawing.',
          },
          {
            kind: 'notice',
            text: 'A local draft preserves unfinished work even if analysis is invalid. Browser-local storage is not a portable backup: export .flowculus.json to retain the full supported model contract.',
          },
        ],
      },
      vi: {
        title: 'Vẽ, chỉnh sửa và kiểm tra',
        summary: 'Quy trình thực hành từ tác vụ đầu tiên đến mô hình đã rà soát.',
        keywords: [
          'clipboard',
          'copy',
          'paste',
          'undo',
          'đầu nối',
          'điểm uốn',
          'responsive',
        ],
        blocks: [
          {
            kind: 'list',
            items: [
              'Chọn cho phép di chuyển hình; trên desktop, kéo vùng trống để chọn nhiều phần tử. Bàn tay chỉ di chuyển khung nhìn. Trên màn hình cảm ứng, kéo nền ưu tiên di chuyển khung nhìn. Cả hai chế độ đều có trên thanh công cụ desktop và di động.',
              'Thêm sự kiện đầu/cuối, tác vụ, loại gateway rõ ràng và nối luồng tuần tự.',
              'Khai báo thời gian bằng phút, xác suất nhánh và quy tắc làm lại trong Thuộc tính.',
              'Dùng sao chép/dán, nhân bản, hoàn tác/làm lại và căn chỉnh để hoàn thiện bản vẽ.',
              'Đọc chẩn đoán và xác nhận ngữ nghĩa suy luận trước khi xuất tệp.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Trên desktop, nút mũi tên vàng nhỏ ở đầu bảng Hình thu gọn bảng về các biểu tượng; bấm lại để hiện nhãn. Trên điện thoại, nút vàng tương ứng nằm ở thanh công cụ dưới canvas nên luôn mở lại được bảng hình. Thao tác chỉ đổi bố cục, giữ mọi hình trên canvas.',
          },
          {
            kind: 'paragraph',
            text: 'Bấm một lần vào hình hoặc đường nối để tự mở Thuộc tính. Nhập thời gian xử lý (T), thời gian chờ (Wq), thời gian chu trình (CT), xác suất làm lại và chi phí tại đó. Bấm vùng trống để đóng Thuộc tính; chọn phần tử khác sẽ chuyển bảng sang phần tử đó.',
          },
          { kind: 'heading', text: 'Chỉnh đường nối' },
          {
            kind: 'paragraph',
            text: 'Chọn đường rồi kéo tay nắm giữa đoạn hoặc điểm uốn. Nhấp đúp lên đường để thêm điểm. Khi tay nắm được focus, phím mũi tên dịch điểm; giữ Shift để tăng bước. Delete hoặc Alt-nhấp xóa điểm uốn. Trong Thuộc tính, chọn kiểu thẳng, cong hoặc gấp khúc.',
          },
          { kind: 'heading', text: 'Đưa mũi tên sang đỉnh khác của gateway' },
          {
            kind: 'paragraph',
            text: 'Kéo tay nắm tròn ở đầu đường đến điểm trên, phải, dưới hoặc trái của hình. Bạn có thể chuyển sang đỉnh khác của cùng gateway mà không đổi quy trình. Hệ thống bắt dính vào điểm gần nhất ở mọi mức zoom. Focus tay nắm rồi dùng phím mũi tên để chọn hướng, Home trả về Tự động. Các mục chọn trong Thuộc tính hỗ trợ tương đương bằng cảm ứng hoặc bàn phím.',
          },
          {
            kind: 'paragraph',
            text: 'Thả vào chỗ trống hoặc kết nối không hợp lệ sẽ giữ đường cũ. Escape, mất focus hoặc trình duyệt hủy con trỏ sẽ hủy kéo. Mỗi lượt kéo hợp lệ là một bước hoàn tác. Điểm nối được giữ khi di chuyển, đổi kích thước, sao chép/dán và xuất/nhập định dạng hỗ trợ. Nối sang hình khác xóa điểm uốn cũ; chỉ đổi góc trên cùng hình thì giữ các điểm đó.',
          },
          {
            kind: 'notice',
            text: 'Đường thẳng nối trực tiếp hai điểm đã chọn. Đường cong và gấp khúc tiếp cận theo hướng đã chọn. Hình chồng lấn hoặc điểm uốn tự đặt vẫn có thể khiến đường đi qua hình khác; hãy chỉnh đường theo bố cục bản vẽ.',
          },
          {
            kind: 'notice',
            text: 'Bản nháp trong trình duyệt giữ công việc đang dở, kể cả khi chưa phân tích được. Để mở lại trên thiết bị hoặc trình duyệt khác, hãy lưu file .flowculus.json. File giữ mô hình và cấu hình tính toán; ảnh tham chiếu được lưu riêng trong trình duyệt.',
          },
        ],
      },
    },
  },
  {
    id: 'files',
    category: 'workflow',
    content: {
      en: {
        title: 'Import, export and semantic review',
        summary: 'Choose the right file for editing, sharing or reporting.',
        keywords: [
          'BPMN',
          'draw.io',
          'drawio',
          'JSON',
          'CSV',
          'PNG',
          'SVG',
          'PDF',
          'share',
        ],
        blocks: [
          {
            kind: 'table',
            headers: ['Format', 'Use'],
            rows: [
              [
                '.flowculus.json',
                'Portable model backup with supported geometry, semantics and analysis options.',
              ],
              [
                '.bpmn / BPMN XML',
                'Exchange a supported BPMN 2.0 process with pools, lanes and diagram geometry. Unsupported execution semantics are rejected. Native JSON also preserves analysis settings.',
              ],
              [
                '.drawio / draw.io XML',
                'Exchange with draw.io; original XML is patched to preserve supported source data.',
              ],
              [
                'Node/edge CSV',
                'Tabular interchange of supported model fields; not a picture of the canvas.',
              ],
              ['SVG / PNG / JPEG', 'Diagram image. Large diagrams should use SVG.'],
              [
                'PDF / report image',
                'Analysis report requiring a current engine result.',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Imported stencils and discovered routing can require semantic review. Export/share stay blocked until those guesses are confirmed. Unknown types must be corrected first. A saved draft remains possible while review or analysis is incomplete. Correct invalid Inspector inputs before saving, exporting or sharing. Clicking outside keeps an invalid field visible rather than exporting its previous value.',
          },
          { kind: 'heading', text: 'Multiple draw.io pages' },
          {
            kind: 'paragraph',
            text: 'Switching pages first preserves the current page in the source XML. If you edit the model or change process tabs while a page is loading, the old request cannot replace your work. Native backups retain the selected page. When an older backup lacks shape coordinates, positions are recovered from that page without replacing coordinates already present.',
          },
          { kind: 'heading', text: 'Choose a readable report format' },
          {
            kind: 'paragraph',
            text: 'Report images include every diagnostic and wrap long titles and labels. Their size is limited to 1600 × 5000 pixels (8 megapixels). When the complete report would exceed that limit, export PDF instead. Save .flowculus.json when you also need an editable model. Diagram bitmaps have a separate limit of 8 million pixels and 8192 pixels per side. Use SVG for large diagrams.',
          },
          {
            kind: 'notice',
            text: 'File names use flowculus_<model-slug>_<artifact>_<YYYYMMDD-HHmmssZ>.<extension>, with a UTC timestamp and an explicit role such as model, diagram or analysis. PDF previews suggest the same name, while the browser controls the final PDF name. draw.io export patches XML to preserve semantics rather than byte-for-byte identity. Sharing sends or downloads a model file. The /mining URL opens that mode but contains no event log.',
          },
        ],
      },
      vi: {
        title: 'Nhập, xuất và xác nhận ngữ nghĩa',
        summary: 'Chọn đúng định dạng để sửa, chia sẻ hoặc lập báo cáo.',
        keywords: [
          'BPMN',
          'draw.io',
          'drawio',
          'JSON',
          'CSV',
          'PNG',
          'SVG',
          'PDF',
          'chia sẻ',
        ],
        blocks: [
          {
            kind: 'table',
            headers: ['Định dạng', 'Công dụng'],
            rows: [
              [
                '.flowculus.json',
                'Bản sao mô hình để mở lại trên thiết bị khác, giữ vị trí hình, ngữ nghĩa và cấu hình tính toán được hỗ trợ.',
              ],
              [
                '.bpmn / BPMN XML',
                'Trao đổi quy trình BPMN 2.0 trong tập con hỗ trợ, có pool, lane và vị trí hình. Ngữ nghĩa thực thi chưa hỗ trợ bị từ chối. Dùng JSON để giữ cả cấu hình phân tích.',
              ],
              [
                '.drawio / XML của draw.io',
                'Trao đổi với draw.io; vá XML gốc để giữ dữ liệu nguồn được hỗ trợ.',
              ],
              [
                'CSV nút/cạnh',
                'Trao đổi dữ liệu mô hình dạng bảng, không phải ảnh canvas.',
              ],
              ['SVG / PNG / JPEG', 'Ảnh sơ đồ; sơ đồ lớn nên dùng SVG.'],
              ['PDF / ảnh báo cáo', 'Báo cáo phân tích cần kết quả engine hiện tại.'],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Stencil nhập vào và luồng khai phá có thể cần xác nhận ngữ nghĩa. Xuất/chia sẻ bị chặn tới khi xác nhận các phần suy luận; loại không biết phải sửa trước. Vẫn lưu được bản nháp khi chưa rà soát hay phân tích xong. Cần sửa ô nhập sai trong Thuộc tính trước khi lưu, xuất hoặc chia sẻ. Bấm ra ngoài vẫn giữ ô lỗi hiện rõ, tránh xuất nhầm giá trị cũ.',
          },
          { kind: 'heading', text: 'Làm việc với nhiều trang draw.io' },
          {
            kind: 'paragraph',
            text: 'Khi chuyển trang, Flowculus giữ thay đổi của trang hiện tại trong XML nguồn trước. Nếu bạn sửa mô hình hoặc đổi tab quy trình trong lúc tải trang, yêu cầu cũ không thể ghi đè công việc đang mở. Bản sao JSON giữ trang đã chọn. Với file cũ thiếu tọa độ hình, vị trí được khôi phục từ đúng trang đó và giữ nguyên tọa độ đã có.',
          },
          { kind: 'heading', text: 'Chọn định dạng báo cáo dễ đọc' },
          {
            kind: 'paragraph',
            text: 'Ảnh báo cáo chứa đầy đủ chẩn đoán và tự xuống dòng với tiêu đề, nhãn dài. Kích thước tối đa là 1600 × 5000 pixel (8 megapixel). Nếu báo cáo đầy đủ vượt giới hạn này, hãy xuất PDF. Lưu thêm .flowculus.json nếu cần mô hình có thể chỉnh sửa. Ảnh sơ đồ có giới hạn riêng là 8 triệu pixel và 8192 pixel mỗi chiều. Sơ đồ lớn nên dùng SVG.',
          },
          {
            kind: 'notice',
            text: 'Tên tệp theo mẫu flowculus_<ten-quy-trinh>_<loai-noi-dung>_<YYYYMMDD-HHmmssZ>.<dinh-dang>, có dấu thời gian UTC và loại rõ ràng như model, diagram, analysis. Bản xem trước PDF gợi ý cùng tên, còn trình duyệt quyết định tên PDF cuối cùng. Xuất draw.io giữ ngữ nghĩa bằng cách vá XML, không bảo đảm giống từng byte. Chia sẻ gửi hoặc tải file mô hình. URL /mining chỉ mở chế độ và không chứa event log.',
          },
        ],
      },
    },
  },
  {
    id: 'image-trace',
    category: 'workflow',
    content: {
      en: {
        title: 'Image Trace: from a photo to editable shapes',
        summary:
          'Use computer vision as a starting point and review the recovered model.',
        keywords: ['OpenCV', 'photo', 'upload', 'image recognition', 'reference'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Upload a diagram image as a reference, then run Image Trace to create editable shapes and connectors. Processing stays in your browser. Review the proposed model before adding it to the canvas.',
          },
          { kind: 'heading', text: 'What can be recovered?' },
          {
            kind: 'paragraph',
            text: 'The detector finds geometric outlines, repairs short gaps and follows connector strokes through bends. It proposes direction from left to right or top to bottom and infers start/end events from those connections. Review reverse-direction arrows, crossings, missing connections and gateway types. Task names and gateway markers still need your input. Detected centres are retained, with a minimum task size to keep labels readable.',
          },
          { kind: 'heading', text: 'Review the detected hours' },
          {
            kind: 'paragraph',
            text: 'A clearly printed integer-hour label such as 8h or 24h can pre-fill processing time when confidence is sufficient. Supported recognition is limited to a complete label from 0h to 10000h on its own line. Handwriting is not reliably read, even when the surrounding shapes and connectors are detected. Enter missing handwritten hours manually. Decimals, other units and ambiguous labels also need manual entry. Durations must be nonnegative. This is limited duration recognition, not general text recognition.',
          },
          {
            kind: 'example',
            title: 'Check the value before calculating',
            text: 'For a task labelled 8h, check that the review field shows 8 hours. The model stores 480 processing minutes. A label such as 2.5h is left for manual entry rather than being treated as 25 hours. Check all task times before creating the draft, then review any remaining graph diagnostics.',
          },
          {
            kind: 'list',
            items: [
              'Use a sharp, evenly lit, straight-on photo with clear edges. Crop out unrelated tables and text.',
              'Use Image settings or Remove image on the canvas toolbar; replacing/removing the photo keeps the model shapes.',
              'Review shape types, labels, arrow direction and disconnected connectors.',
              'Check pre-filled hours, enter missing times and set probabilities and split/join semantics explicitly.',
              'Confirm inferred elements before exporting or sharing.',
            ],
          },
          {
            kind: 'notice',
            text: 'Images are limited to 20 MB and 100 megapixels, processed at up to 1600 pixels, with a 45-second timeout. The reference photo is stored separately from ProcessModel and is not silently included in model exports.',
          },
        ],
      },
      vi: {
        title: 'Image Trace: từ ảnh sang hình có thể sửa',
        summary: 'Dùng thị giác máy tính để tạo bản nháp, rồi rà soát mô hình.',
        keywords: ['OpenCV', 'ảnh', 'upload', 'nhận dạng', 'tham chiếu'],
        blocks: [
          {
            kind: 'paragraph',
            text: 'Tải ảnh sơ đồ làm tham chiếu, sau đó chạy Image Trace để tạo các hình và đường nối có thể chỉnh sửa. Ảnh được xử lý trong trình duyệt. Hãy rà lại mô hình đề xuất trước khi đưa vào canvas.',
          },
          { kind: 'heading', text: 'Nhận dạng được những gì?' },
          {
            kind: 'paragraph',
            text: 'Bộ nhận dạng tìm đường viền hình học, nối các khe hở ngắn và lần theo nét nối qua góc rẽ. Chiều luồng được đề xuất từ trái sang phải hoặc từ trên xuống dưới. Sự kiện đầu và cuối được suy ra từ các kết nối đó. Bạn cần kiểm tra mũi tên đi ngược, giao điểm, đường nối bị thiếu và loại gateway. Tên tác vụ và ký hiệu bên trong gateway vẫn cần nhập hoặc chọn lại. Các hình giữ tâm đã nhận dạng và có kích thước tối thiểu để đọc nhãn.',
          },
          { kind: 'heading', text: 'Rà lại số giờ đã nhận dạng' },
          {
            kind: 'paragraph',
            text: 'Nhãn giờ nguyên in rõ như 8h hoặc 24h có thể được điền sẵn vào thời gian xử lý khi đủ độ tin cậy. Bộ nhận dạng chỉ hỗ trợ nhãn hoàn chỉnh từ 0h đến 10000h trên một dòng riêng. Chữ viết tay chưa được đọc ổn định, kể cả khi đã tìm đúng hình và đường nối xung quanh. Hãy nhập số giờ viết tay còn thiếu. Số thập phân, đơn vị khác và nhãn mơ hồ cũng cần nhập thủ công. Thời lượng phải không âm. Tính năng này chỉ nhận dạng thời lượng ở phạm vi hẹp, chưa đọc văn bản tổng quát.',
          },
          {
            kind: 'example',
            title: 'Kiểm tra giá trị trước khi tính',
            text: 'Với tác vụ ghi 8h, kiểm tra ô rà soát hiện 8 giờ. Mô hình sẽ lưu 480 phút xử lý. Nhãn như 2.5h được để lại cho bạn nhập, tránh biến thành 25 giờ. Rà lại thời gian của mọi tác vụ trước khi tạo bản nháp, rồi kiểm tra các thông báo về cấu trúc còn thiếu.',
          },
          {
            kind: 'list',
            items: [
              'Chụp rõ nét, đủ sáng, vuông góc; cắt bỏ bảng biểu và chữ không thuộc sơ đồ.',
              'Dùng Tùy chỉnh ảnh hoặc Xóa ảnh ngay trên canvas. Thay/xóa ảnh vẫn giữ các hình đã vẽ.',
              'Kiểm tra loại hình, nhãn, chiều mũi tên và các đầu nối bị rời.',
              'Rà số giờ điền sẵn, bổ sung thời gian còn thiếu và khai báo rõ xác suất cùng ngữ nghĩa tách/gộp.',
              'Xác nhận các phần suy luận trước khi xuất hoặc chia sẻ.',
            ],
          },
          {
            kind: 'notice',
            text: 'Ảnh giới hạn 20 MB và 100 megapixel, xử lý tối đa 1600 pixel, timeout 45 giây. Ảnh tham chiếu lưu riêng với ProcessModel, không tự đưa vào file xuất mô hình.',
          },
        ],
      },
    },
  },
];
