import type { Locale } from './types';

const en = {
  tabs: 'Open processes',
  reorderHint:
    'Drag to reorder; on touch, hold before dragging. Alt+Shift+Left/Right moves the focused tab.',
  moveLeft: 'Move tab left',
  moveRight: 'Move tab right',
  moveFirst: 'Move tab to start',
  moveLast: 'Move tab to end',
  moved: (name: string, position: number, total: number) =>
    `${name}: tab ${position} of ${total}`,
  tabMenu: 'Process tab actions',
  listTabs: 'Find an open process',
  newDocument: 'New process',
  open: 'Open / import',
  rename: 'Rename process',
  close: 'Close process',
  name: 'Process name',
  save: 'Save to device',
  saveAs: 'Save as…',
  cancel: 'Cancel',
  confirm: 'Apply name',
  nameHint: 'This name appears in the tab, exports and analysis reports.',
  invalidField:
    'Correct the highlighted value before saving. Your drawing has been kept.',
  invalidName: 'Enter a name between 1 and 120 characters, without control characters.',
  saveTitle: 'Save process to your device',
  saveHint:
    'A .flowculus.json file keeps the model and analysis settings. Reference photos stay in this browser.',
  fileName: 'File name',
  format: 'Format',
  location: 'Location',
  device: 'Your device',
  formatValue: 'Flowculus model (.flowculus.json)',
  browserConflict:
    'Another editor window owns browser auto-save — save this window to device',
  browserSaved: 'Draft saved in this browser',
  browserSaving: 'Saving browser draft…',
  browserLoading: 'Restoring browser drafts…',
  browserError: 'Browser draft not saved — save to device',
  unsaved: 'Not saved to device',
  modified: 'Changes not saved to device',
  saved: 'Saved to device',
  downloaded: 'Save copy downloaded',
  opened: 'Opened from a file',
  saving: 'Saving to device…',
  error: 'Device save failed — try Save as',
  permission:
    'File write permission is needed. Press Save to retry, or Save as to keep a separate copy.',
  conflict:
    'The file changed outside this process tab. Use Save as to keep your changes without overwriting it.',
  connected: 'Connected file',
  review: 'Review inferred semantics before saving',
  closeTitle: 'Save changes before closing?',
  closeSavedTitle: 'Close this process?',
  closeSavedHint:
    'The file you opened or last saved stays on your device. Closing removes this tab and its browser draft.',
  closeSaved: 'Close process',
  photoCloseHint:
    'The reference photo will also be removed. It is not included in the model file.',
  closeHint:
    'Closing removes this tab and its browser draft. Save a device copy to open it again later.',
  discard: 'Close without saving',
  saveAndClose: 'Save and close',
  autoSave: 'Auto-save to this file',
  stopAutoSave: 'Turn off file auto-save',
  autoHint:
    'Updates the connected file after edits. Auto-save stops on reload, lost permission or an external file change.',
  downloadHint:
    'This browser downloads a new copy on each save. It cannot update a device file automatically.',
  tabLimit:
    'Up to 20 processes can be open. Save and close a tab before opening another.',
  fileNameInvalid:
    'Use a file name of 1–120 characters without / \\ : * ? " < > | or control characters.',
  reconnect: 'Press Save to choose or reconnect your device file.',
};
export type DocumentCopy = typeof en;
const vi: DocumentCopy = {
  tabs: 'Các quy trình đang mở',
  reorderHint:
    'Kéo để đổi thứ tự; trên cảm ứng, giữ rồi kéo. Alt+Shift+Trái/Phải di chuyển tab đang focus.',
  moveLeft: 'Chuyển tab sang trái',
  moveRight: 'Chuyển tab sang phải',
  moveFirst: 'Chuyển tab về đầu',
  moveLast: 'Chuyển tab về cuối',
  moved: (name, position, total) => `${name}: tab ${position} trên ${total}`,
  tabMenu: 'Thao tác với tab quy trình',
  listTabs: 'Tìm quy trình đang mở',
  newDocument: 'Quy trình mới',
  open: 'Mở / nhập tệp',
  rename: 'Đổi tên quy trình',
  close: 'Đóng quy trình',
  name: 'Tên quy trình',
  save: 'Lưu vào thiết bị',
  saveAs: 'Lưu thành…',
  cancel: 'Hủy',
  confirm: 'Đổi tên',
  nameHint: 'Tên này dùng trên tab, tệp xuất và báo cáo phân tích.',
  invalidField: 'Hãy sửa ô đang báo lỗi trước khi lưu. Bản đang vẽ vẫn được giữ nguyên.',
  invalidName: 'Nhập tên từ 1 đến 120 ký tự, không có ký tự điều khiển.',
  saveTitle: 'Lưu quy trình vào thiết bị',
  saveHint:
    'File .flowculus.json giữ mô hình và cấu hình tính toán. Ảnh tham chiếu được giữ riêng trong trình duyệt.',
  fileName: 'Tên tệp',
  format: 'Định dạng',
  location: 'Nơi lưu',
  device: 'Thiết bị của bạn',
  formatValue: 'Mô hình Flowculus (.flowculus.json)',
  browserConflict: 'Cửa sổ khác đang tự lưu bản nháp — hãy lưu cửa sổ này vào thiết bị',
  browserSaved: 'Đã lưu nháp trong trình duyệt',
  browserSaving: 'Đang lưu nháp…',
  browserLoading: 'Đang khôi phục bản nháp…',
  browserError: 'Chưa lưu được bản nháp — hãy lưu vào thiết bị',
  unsaved: 'Chưa lưu vào thiết bị',
  modified: 'Có thay đổi chưa lưu vào thiết bị',
  saved: 'Đã lưu vào thiết bị',
  downloaded: 'Đã tải bản lưu',
  opened: 'Đã mở từ tệp',
  saving: 'Đang lưu vào thiết bị…',
  error: 'Lưu tệp thất bại — hãy chọn Lưu thành',
  permission:
    'Cần quyền ghi tệp. Bấm Lưu để cấp lại quyền, hoặc Lưu thành để giữ một bản riêng.',
  conflict:
    'Tệp đã thay đổi bên ngoài tab quy trình này. Chọn Lưu thành để giữ bản đang vẽ và tránh ghi đè.',
  connected: 'Tệp đang kết nối',
  review: 'Cần xác nhận ngữ nghĩa trước khi lưu tệp',
  closeTitle: 'Lưu thay đổi trước khi đóng?',
  closeSavedTitle: 'Đóng quy trình này?',
  closeSavedHint:
    'File đã mở hoặc lưu gần nhất vẫn nằm trên thiết bị. Đóng sẽ xóa tab cùng bản nháp của tab này trong trình duyệt.',
  closeSaved: 'Đóng quy trình',
  photoCloseHint:
    'Ảnh tham chiếu của tab cũng sẽ bị xóa. File mô hình không kèm ảnh này.',
  closeHint:
    'Đóng sẽ xóa tab này cùng bản nháp trong trình duyệt. Hãy lưu một bản vào thiết bị để mở lại sau.',
  discard: 'Đóng không lưu',
  saveAndClose: 'Lưu và đóng',
  autoSave: 'Tự lưu vào tệp này',
  stopAutoSave: 'Tắt tự lưu vào tệp',
  autoHint:
    'Cập nhật tệp đang kết nối sau khi chỉnh sửa. Tự lưu dừng khi tải lại trang, mất quyền ghi hoặc tệp bị sửa bên ngoài.',
  downloadHint:
    'Trình duyệt này tải một bản mới mỗi lần lưu, chưa hỗ trợ tự cập nhật tệp trên thiết bị.',
  tabLimit: 'Mở tối đa 20 quy trình. Hãy lưu và đóng một tab trước khi mở thêm.',
  fileNameInvalid:
    'Tên tệp cần 1–120 ký tự, không chứa / \\ : * ? " < > | hoặc ký tự điều khiển.',
  reconnect: 'Bấm Lưu để chọn hoặc kết nối lại tệp trên thiết bị.',
};
export const getDocumentCopy = (locale: Locale): DocumentCopy =>
  locale === 'vi' ? vi : en;
