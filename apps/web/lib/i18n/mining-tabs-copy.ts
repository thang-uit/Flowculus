import type { Locale } from './types';

const EN = {
  tabs: 'Open event logs',
  open: 'Open event log',
  empty: 'Open a log to start mining',
  close: (name: string) => `Close event log: ${name}`,
  closeTitle: 'Close this event log?',
  closeHint: (name: string) =>
    `“${name}” and its mining session will be removed from this browser. Other logs and BPMN documents stay open. The original file stays on your device.`,
  confirmClose: 'Close log',
  cancel: 'Cancel',
  limit: 'You can open up to 10 event logs. Close a log before opening another.',
  sourceLimit:
    'The open logs exceed the local memory limit. Close a log before opening another.',
  saved: 'Mining session saved in this browser',
  saving: 'Saving mining session…',
  restoring: 'Restoring event logs…',
  storageError: 'Could not save Mining locally. Keep your source files and try again.',
  conflict:
    'Another Flowculus window is saving Mining. Use that window to keep your logs in sync.',
  retry: 'Restore this log',
  retryStorage: 'Retry local storage',
  oneAtATime:
    'Open one event log at a time so you can confirm its columns before opening the next.',
  shortcutSave:
    'Mining is saved automatically in this browser. Export the current log when you need a CSV copy.',
};
const VI: typeof EN = {
  tabs: 'Nhật ký đang mở',
  open: 'Mở nhật ký sự kiện',
  empty: 'Mở nhật ký để bắt đầu khai phá',
  close: (name) => `Đóng nhật ký: ${name}`,
  closeTitle: 'Đóng nhật ký này?',
  closeHint: (name) =>
    `Nhật ký “${name}” và phiên khai phá của nó sẽ được xóa khỏi trình duyệt này. Các nhật ký khác và tài liệu BPMN vẫn được giữ. Tệp gốc trên thiết bị vẫn còn.`,
  confirmClose: 'Đóng nhật ký',
  cancel: 'Hủy',
  limit: 'Có thể mở tối đa 10 nhật ký. Hãy đóng một nhật ký trước khi mở thêm.',
  sourceLimit:
    'Các nhật ký đang mở vượt giới hạn bộ nhớ cục bộ. Hãy đóng một nhật ký trước khi mở thêm.',
  saved: 'Đã lưu phiên Khai phá trong trình duyệt',
  saving: 'Đang lưu phiên Khai phá…',
  restoring: 'Đang khôi phục nhật ký…',
  storageError: 'Chưa lưu được phiên Khai phá cục bộ. Hãy giữ tệp nguồn và thử lại.',
  conflict:
    'Một cửa sổ Flowculus khác đang lưu phiên Khai phá. Hãy dùng cửa sổ đó để giữ dữ liệu đồng bộ.',
  retry: 'Khôi phục nhật ký này',
  retryStorage: 'Thử lại lưu trữ cục bộ',
  oneAtATime: 'Hãy mở từng nhật ký để xác nhận các cột trước khi mở nhật ký tiếp theo.',
  shortcutSave:
    'Khai phá được tự lưu trong trình duyệt. Hãy xuất nhật ký khi cần một bản CSV.',
};
export const getMiningTabsCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
