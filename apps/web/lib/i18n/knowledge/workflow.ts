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
            text: 'Bản nháp cục bộ giữ công việc đang dở kể cả khi chưa phân tích được. Lưu trên trình duyệt không thay thế bản sao lưu di chuyển được: xuất .flowculus.json để giữ đầy đủ hợp đồng mô hình được hỗ trợ.',
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
        keywords: ['draw.io', 'drawio', 'JSON', 'CSV', 'PNG', 'SVG', 'PDF', 'share'],
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
                '.drawio / XML',
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
            text: 'Imported stencils and discovered routing can require semantic review. Export/share stay blocked until those guesses are confirmed. Unknown types must be corrected first. A saved draft remains possible while review or analysis is incomplete.',
          },
          {
            kind: 'notice',
            text: 'File names use flowculus_<model-slug>_<artifact>_<YYYYMMDD-HHmmssZ>.<extension>, with a UTC timestamp and an explicit role such as model, diagram or analysis. PDF print previews suggest the same name; the browser controls the final PDF name. draw.io export preserves semantics by patching XML, not byte-for-byte identity. Sharing sends/downloads a model file; the /mining URL opens the mode but contains no event log. Bitmap exports are bounded to 8 million pixels and 8192 pixels per side.',
          },
        ],
      },
      vi: {
        title: 'Nhập, xuất và xác nhận ngữ nghĩa',
        summary: 'Chọn đúng định dạng để sửa, chia sẻ hoặc lập báo cáo.',
        keywords: ['draw.io', 'drawio', 'JSON', 'CSV', 'PNG', 'SVG', 'PDF', 'chia sẻ'],
        blocks: [
          {
            kind: 'table',
            headers: ['Định dạng', 'Công dụng'],
            rows: [
              [
                '.flowculus.json',
                'Sao lưu mô hình di chuyển được, giữ hình học, ngữ nghĩa và tùy chọn phân tích được hỗ trợ.',
              ],
              [
                '.drawio / XML',
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
            text: 'Stencil nhập vào và luồng khai phá có thể cần xác nhận ngữ nghĩa. Xuất/chia sẻ bị chặn tới khi xác nhận các phần suy luận; loại không biết phải sửa trước. Vẫn lưu được bản nháp khi chưa rà soát hay phân tích xong.',
          },
          {
            kind: 'notice',
            text: 'Tên tệp theo mẫu flowculus_<ten-quy-trinh>_<loai-noi-dung>_<YYYYMMDD-HHmmssZ>.<dinh-dang>, có dấu thời gian UTC và loại rõ ràng như model, diagram, analysis. Bản xem trước PDF gợi ý cùng tên; trình duyệt quyết định tên PDF cuối cùng. Xuất draw.io giữ ngữ nghĩa bằng cách vá XML, không bảo đảm giống từng byte. Chia sẻ gửi/tải file mô hình; URL /mining chỉ mở chế độ và không chứa event log. Ảnh bitmap giới hạn 8 triệu pixel và 8192 pixel mỗi chiều.',
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
            text: 'Upload a photo as a separate reference image. OpenCV detects candidate geometric shapes and connectors in a worker; review the result before bringing it into the model. This is approximate geometric tracing, not guaranteed BPMN interpretation or OCR.',
          },
          {
            kind: 'list',
            items: [
              'Use a sharp, evenly lit, straight-on photo with clear edges.',
              'Review shape types, labels, arrow direction and disconnected connectors.',
              'Enter times, probabilities and explicit split/join semantics yourself.',
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
            text: 'Tải ảnh làm tham chiếu riêng. OpenCV nhận diện ứng viên hình học và đầu nối trong worker; cần rà soát trước khi đưa vào mô hình. Đây là nhận dạng hình học gần đúng, chưa bảo đảm hiểu BPMN hoặc OCR.',
          },
          {
            kind: 'list',
            items: [
              'Chụp rõ nét, đủ sáng, vuông góc và đường viền dễ phân biệt.',
              'Kiểm tra loại hình, nhãn, chiều mũi tên và các đầu nối bị rời.',
              'Tự nhập thời gian, xác suất và ngữ nghĩa split/join rõ ràng.',
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
