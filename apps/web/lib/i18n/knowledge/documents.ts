import type { KnowledgeEntry } from '@/lib/knowledge/types';

export const DOCUMENTS: KnowledgeEntry[] = [
  {
    id: 'documents',
    category: 'workflow',
    content: {
      vi: {
        title: 'Nhiều quy trình, tự lưu và lưu vào thiết bị',
        summary: 'Mở nhiều bản vẽ, đặt tên và chọn cách giữ lại công việc của bạn.',
        keywords: [
          'tab',
          'quy trình mới',
          'đổi tên',
          'tự lưu',
          'lưu thiết bị',
          'bản nháp',
          'mở tệp',
        ],
        blocks: [
          { kind: 'heading', text: 'Mở, chọn và đặt tên quy trình' },
          {
            kind: 'paragraph',
            text: 'Bấm dấu cộng cạnh thanh tab để tạo một quy trình trống. Mở hoặc nhập file mô hình sẽ tạo tab mới, giữ nguyên bản đang vẽ. Kết quả Mining đưa sang canvas cũng mở trong tab riêng. Có thể mở tối đa 20 quy trình cùng lúc.',
          },
          {
            kind: 'paragraph',
            text: 'Khi chuyển từ Khai phá sang canvas, hãy nhập tên quy trình rồi chọn Tạo quy trình. Tên log mẫu chỉ nhận diện nguồn dữ liệu, không tự trở thành tên bản vẽ. Hủy sẽ giữ nguyên các tab. Những quy trình đã lưu trước đây giữ tên cũ; bạn có thể đổi tên bằng nút bút.',
          },
          {
            kind: 'paragraph',
            text: 'Tab đang chọn có nền vàng dịu, viền trên màu vàng và góc bo mềm. Bấm tab khác để chuyển quy trình; nhấp đúp tên tab hoặc chọn nút bút để đổi tên. Tên này dùng trong báo cáo và tên tệp xuất. Nhãn hình do người dùng đặt sẽ được giữ nguyên khi đổi ngôn ngữ giao diện.',
          },
          { kind: 'heading', text: 'Sắp xếp và tìm tab đang mở' },
          {
            kind: 'paragraph',
            text: 'Kéo ngang tên tab để đổi thứ tự. Trên cảm ứng, giữ khoảng một phần ba giây rồi kéo; vuốt ngay để cuộn thanh tab. Kéo sát mép sẽ tự cuộn, Escape hủy. Khi focus tên tab, dùng Alt+Shift+Trái/Phải để di chuyển. Thứ tự được giữ trong bản nháp trình duyệt; mô hình, lịch sử và ảnh của từng tab không thay đổi.',
          },
          {
            kind: 'paragraph',
            text: 'Nút số cạnh thanh tab liệt kê các quy trình đang mở để chọn nhanh. Nhấp chuột phải hoặc nhấn Shift+F10 trên tên tab để đổi tên, đưa tab sang trái/phải/đầu/cuối hoặc đóng. Nhấp chuột giữa cũng yêu cầu xác nhận trước khi đóng; thao tác đóng bị khóa khi đang ghi file.',
          },
          { kind: 'heading', text: 'Phân biệt hai nơi lưu' },
          {
            kind: 'table',
            headers: ['Dấu hiệu', 'Ý nghĩa'],
            rows: [
              [
                'Đã lưu nháp trong trình duyệt',
                'Các tab và tab đang chọn có thể được khôi phục khi tải lại trang trên trình duyệt này.',
              ],
              [
                'Dấu * cạnh tên tab',
                'Chưa có bản lưu trên thiết bị khớp với nội dung hiện tại; bản nháp trong trình duyệt vẫn có thể đã được lưu.',
              ],
              [
                'Đã lưu vào thiết bị / Đã tải bản lưu',
                'Đã ghi vào file đã chọn, hoặc đã yêu cầu trình duyệt tải một bản mới.',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Mỗi tab giữ mô hình, cấu hình tính toán, khung nhìn và ảnh tham chiếu riêng. Thay đổi được tự lưu sau một khoảng nghỉ ngắn, kể cả khi bản vẽ chưa đủ để phân tích. Lịch sử hoàn tác/làm lại có tối đa 100 bước mỗi tab và chỉ giữ trong phiên hiện tại.',
          },
          { kind: 'heading', text: 'Giữ một bản để mở lại trên thiết bị' },
          {
            kind: 'list',
            items: [
              'Mở file .flowculus.json bằng Mở / nhập tệp hoặc Ctrl/Cmd+O trên trình duyệt hỗ trợ sẽ kết nối với file gốc. Sau khi sửa, Ctrl/Cmd+S ghi vào đúng file đó. Trình duyệt có thể hỏi quyền ghi lần đầu. Quy trình mới cần chọn nơi lưu lần đầu. File giữ mô hình cùng cấu hình tính toán, khi mở lại sẽ tính kết quả mới.',
              'Lưu thành… hoặc Ctrl/Cmd+Shift+S cho chọn tên hoặc vị trí khác và chuyển liên kết lưu sang file mới. Nhập BPMN, draw.io hay CSV là chuyển đổi định dạng, nên Lưu tạo file .flowculus.json riêng và giữ nguyên file nguồn.',
              'Liên kết file được giữ riêng trong IndexedDB khi trình duyệt cho phép. Sau reload, bấm Lưu để cấp lại quyền nếu được hỏi. Tự lưu vào tệp chỉ bật theo lựa chọn của bạn và dừng sau reload. Bật hoặc tắt trong menu chuột phải của tab. Trình duyệt không hỗ trợ sẽ tải bản mới mỗi lần lưu.',
            ],
          },
          { kind: 'heading', text: 'Nếu file bị sửa bên ngoài Flowculus' },
          {
            kind: 'paragraph',
            text: 'Flowculus kiểm tra nội dung file đang kết nối trước mỗi lần ghi. Nếu ứng dụng khác hoặc tab khác đã sửa file, thao tác ghi bị dừng và tự lưu tắt. Bản đang vẽ vẫn được giữ. Dùng Lưu thành để giữ một bản riêng, hoặc mở lại file trên thiết bị trong tab khác để so sánh. Từ chối quyền ghi hay hủy hộp chọn file không làm mất thay đổi.',
          },
          { kind: 'heading', text: 'Khi ô nhập đang báo lỗi' },
          {
            kind: 'paragraph',
            text: 'Nếu ô thời gian, xác suất hoặc kích thước đang báo lỗi, hãy sửa giá trị rồi lưu lại. Lưu thủ công chốt ô đang nhập và đưa focus về ô cần sửa, thay vì âm thầm lưu giá trị cũ. Bản nháp vẫn giữ phần mô hình đã chốt. Chỉ mở rồi rời ô số không làm tròn lại dữ liệu gốc.',
          },
          { kind: 'heading', text: 'Đóng tab an toàn' },
          {
            kind: 'paragraph',
            text: 'Nút X có vòng nổi bật khi rê chuột hoặc focus bàn phím. Bấm X, hoặc nhấn Delete khi focus vào tên tab, luôn hỏi trước khi đóng. Tab có thay đổi cho chọn Lưu và đóng, Đóng không lưu hoặc Hủy. Tab đã lưu cho chọn Đóng quy trình hoặc Hủy.',
          },
          {
            kind: 'paragraph',
            text: 'Xác nhận đóng xóa tab cùng bản nháp của tab đó trong trình duyệt, giữ file đã lưu trên thiết bị. Tab có ảnh tham chiếu nhắc rõ ảnh cũng sẽ bị xóa vì file mô hình không kèm ảnh. Trong lúc ghi file, thao tác đóng được khóa. Hủy hoặc lỗi lưu không đóng tab và không xóa dấu thay đổi.',
          },
          {
            kind: 'notice',
            text: 'Bản nháp trình duyệt không thay thế file sao lưu: xóa dữ liệu trình duyệt sẽ xóa bản nháp. Các phần ngữ nghĩa suy luận chưa xác nhận vẫn được giữ trong bản nháp, nhưng cần được rà soát trước khi lưu file, xuất hoặc chia sẻ.',
          },
          { kind: 'heading', text: 'Nếu mở nhiều cửa sổ Flowculus' },
          {
            kind: 'paragraph',
            text: 'Ở trình duyệt hỗ trợ Web Locks, cửa sổ đầu giữ quyền tự lưu bản nháp chung. Cửa sổ khác báo rõ xung đột và vẫn cho lưu file thiết bị. Đóng cửa sổ đầu rồi tải lại cửa sổ còn lại để tiếp tục tự lưu.',
          },
        ],
      },
      en: {
        title: 'Multiple processes, auto-save and device files',
        summary: 'Open several drawings, name them and choose how to keep your work.',
        keywords: [
          'tabs',
          'new process',
          'rename',
          'auto-save',
          'device',
          'draft',
          'open file',
        ],
        blocks: [
          { kind: 'heading', text: 'Open, select and name a process' },
          {
            kind: 'paragraph',
            text: 'Use the plus button beside the tabs for a blank process. Opening or importing a model creates a new tab and preserves the current drawing. Sending a Mining result to the canvas also opens a separate tab. Up to 20 processes can be open at once.',
          },
          {
            kind: 'paragraph',
            text: 'When sending a Mining result to the canvas, enter a process name and choose Create process. The sample log name identifies the data source; it does not automatically name the drawing. Cancel preserves all tabs. Previously saved processes keep their existing names; use the pencil button to rename them.',
          },
          {
            kind: 'paragraph',
            text: 'The active tab has a yellow-tinted surface, a yellow top edge and rounded shoulders. Select another tab to switch processes; double-click a name or choose the pencil button to rename it. Reports and exported file names use that name. User-authored shape labels stay unchanged when the interface language changes.',
          },
          { kind: 'heading', text: 'Reorder and find open tabs' },
          {
            kind: 'paragraph',
            text: 'Drag a tab horizontally to reorder it. On touchscreens, hold for about a third of a second before dragging; swipe immediately to scroll the tab strip. Dragging near an edge scrolls it; Escape cancels. With a tab focused, use Alt+Shift+Left/Right to move it. Browser drafts retain the order; models, histories and photos stay with their tabs.',
          },
          {
            kind: 'paragraph',
            text: 'The count button lists open processes for quick switching. Right-click or press Shift+F10 on a tab to rename, move left/right/to either end, or close it. Middle-clicking also asks for confirmation before closing; closing is disabled during a file write.',
          },
          { kind: 'heading', text: 'Understand the two save locations' },
          {
            kind: 'table',
            headers: ['Indicator', 'Meaning'],
            rows: [
              [
                'Draft saved in this browser',
                'Open tabs and the selected tab can be restored after reloading this browser.',
              ],
              [
                'An asterisk beside a tab name',
                'No device copy matches the current content; the browser draft may already be saved.',
              ],
              [
                'Saved to device / Save copy downloaded',
                'The chosen file was written, or the browser was asked to download a new copy.',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Each tab keeps its own model, analysis settings, viewport and reference photo. Committed edits auto-save after a short pause, including unfinished drawings that cannot yet be analysed. Each tab has up to 100 undo/redo steps, kept only for the current session.',
          },
          { kind: 'heading', text: 'Keep a portable device copy' },
          {
            kind: 'list',
            items: [
              'Open a .flowculus.json file through Open / import or Ctrl/Cmd+O in a supported browser to connect the original file. After editing, Ctrl/Cmd+S updates that file. The browser may request write permission on the first save. New processes need a save location once. Files retain the model and analysis settings, and reopening recomputes results.',
              'Save as… or Ctrl/Cmd+Shift+S chooses a new name or location and moves the save connection to that file. Importing BPMN, draw.io or CSV converts a format, so Save creates a separate .flowculus.json file and preserves the source.',
              'File connections are stored separately in IndexedDB when the browser permits it. After reload, press Save and grant permission if requested. File auto-save is opt-in and stops on reload. Toggle it in the process tab context menu. Browsers without writable access download a new copy on each save.',
            ],
          },
          { kind: 'heading', text: 'When the file changes outside Flowculus' },
          {
            kind: 'paragraph',
            text: 'Flowculus checks the connected file contents before each write. If another application or process tab changed the file, saving stops and file auto-save turns off. Your drawing stays intact. Use Save as to keep a separate copy, or open the device file in another tab to compare. Denied write permission and cancelled pickers never discard your edits.',
          },
          { kind: 'heading', text: 'When an input reports an error' },
          {
            kind: 'paragraph',
            text: 'Correct invalid time, probability or dimension values before saving. Manual Save commits the active input and focuses a field that needs correction, instead of silently saving its previous value. Browser drafts still retain committed model data. Focusing and leaving a numeric field does not round its original value.',
          },
          { kind: 'heading', text: 'Close a tab safely' },
          {
            kind: 'paragraph',
            text: 'The X button highlights on hover or keyboard focus. Clicking X, or pressing Delete while the tab name is focused, always asks for confirmation. Changed tabs offer Save and close, Close without saving or Cancel. Unchanged tabs offer Close process or Cancel.',
          },
          {
            kind: 'paragraph',
            text: 'Confirming removes the tab and its browser draft, while device files stay in place. Tabs with reference photos warn that the photo will also be removed because model files exclude it. Closing is disabled during a file write. Cancellation or a save failure keeps the tab open and retains its unsaved indicator.',
          },
          {
            kind: 'notice',
            text: 'A browser draft is not a portable backup: clearing browser data deletes drafts. Unconfirmed inferred semantics can remain in drafts but must be reviewed before saving a file, exporting or sharing.',
          },
          { kind: 'heading', text: 'When several Flowculus windows are open' },
          {
            kind: 'paragraph',
            text: 'With Web Locks support, the first editor window owns shared draft auto-save. Additional windows show a conflict and still allow saving device files. Close the first window and reload the other to resume browser auto-save.',
          },
        ],
      },
    },
  },
];
