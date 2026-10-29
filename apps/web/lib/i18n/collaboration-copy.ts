import type { Locale } from './types';
const EN = {
  sizeInvalid:
    'Use at least 180 px width and 100 px height. The frame must contain its steps and cannot overlap another pool.',
  width: 'Width (px)',
  height: 'Height (px)',
  poolHint: 'Participant · drag onto canvas',
  laneHint: 'Responsibility · drop inside a pool',
  directHint:
    'Drag the header to move a pool or reorder a lane. Double-click its name to edit. Delete / Backspace removes the frame and its contents. Undo restores them.',
  rename: 'Rename frame',
  deleteContents: 'Delete frame and contents',
  placementInvalid:
    'Place the pool in an empty area or around the entire connected process. Pools cannot overlap or split a sequence flow.',
  resizeInvalid:
    'The frame cannot be resized there because it would overlap another pool or clip its contents.',
  resize:
    'Drag a handle to resize. A lane divider moves only when the steps on both sides still fit.',
  orientation: 'Orientation',
  up: 'Move lane earlier',
  down: 'Move lane later',
  title: 'Pools and lanes',
  hint: 'Organise participants and responsibility. Frames do not add processing time. Analyse one process at a time.',
  pool: 'Pool',
  lane: 'Lane',
  addPool: 'Add pool',
  addLane: 'Add lane',
  close: 'Close',
  name: 'Name',
  remove: 'Remove frame; keep steps',
  process: 'Process to analyse',
  choose: 'Choose a process',
  assign: 'Assign selected steps',
  unassigned: 'No lane',
  membership: 'Responsibility',
  invalid:
    'This move would break membership, overlap pools or split a sequence flow. Reorder one lane at a time, or move the entire pool with its contents.',
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  removeQuestion:
    'Remove this frame? All steps are kept. Review their memberships before analysis.',
  cancel: 'Cancel',
  confirm: 'Remove frame',
  open: 'Manage pools and lanes',
  empty: 'Add a pool to organise this process.',
  bpmn: 'BPMN 2.0 (.bpmn)',
  bpmnInvalid: 'The BPMN file is malformed or has inconsistent references.',
  bpmnUnsupported:
    'This BPMN file uses execution semantics not supported by this editor. Its contents were not imported.',
  bpmnLimit: 'The BPMN file exceeds the safe parsing limits.',
};
const VI: typeof EN = {
  sizeInvalid:
    'Chiều rộng tối thiểu 180 px, chiều cao tối thiểu 100 px. Khung phải chứa đủ công việc và không chồng lên pool khác.',
  width: 'Chiều rộng (px)',
  height: 'Chiều cao (px)',
  poolHint: 'Bên tham gia · kéo vào canvas',
  laneHint: 'Trách nhiệm · thả vào pool',
  directHint:
    'Kéo tiêu đề để di chuyển pool hoặc đổi thứ tự lane. Nhấp đúp tên để sửa. Delete / Backspace xóa khung cùng nội dung. Undo khôi phục lại.',
  rename: 'Đổi tên khung',
  deleteContents: 'Xóa khung cùng nội dung',
  placementInvalid:
    'Hãy đặt pool ở vùng trống hoặc bao trọn phần quy trình được kết nối. Các pool không được chồng lên nhau hoặc chia cắt sequence flow.',
  resizeInvalid:
    'Không thể đổi kích thước tại đây vì khung sẽ chồng lên pool khác hoặc cắt mất nội dung.',
  resize:
    'Kéo điểm điều khiển để đổi kích thước. Vạch phân cách lane chỉ di chuyển khi các bước ở hai bên vẫn nằm gọn trong lane.',
  orientation: 'Hướng bố trí',
  up: 'Chuyển lane lên trước',
  down: 'Chuyển lane ra sau',
  title: 'Pool và Lane',
  hint: 'Phân chia bên tham gia và trách nhiệm. Khung không cộng thời gian xử lý. Phân tích từng quy trình riêng.',
  pool: 'Pool',
  lane: 'Lane',
  addPool: 'Thêm pool',
  addLane: 'Thêm lane',
  close: 'Đóng',
  name: 'Tên',
  remove: 'Bỏ khung; giữ công việc',
  process: 'Quy trình cần phân tích',
  choose: 'Chọn một quy trình',
  assign: 'Gán các bước đang chọn',
  unassigned: 'Không phân lane',
  membership: 'Trách nhiệm',
  invalid:
    'Thao tác này làm sai quan hệ chứa, chồng pool hoặc chia cắt sequence flow. Hãy đổi thứ tự từng lane hoặc di chuyển cả pool cùng nội dung.',
  horizontal: 'Ngang',
  vertical: 'Dọc',
  removeQuestion:
    'Bỏ khung này? Các công việc được giữ lại. Hãy kiểm tra quan hệ chứa trước khi phân tích.',
  cancel: 'Hủy',
  confirm: 'Bỏ khung',
  open: 'Quản lý pool và lane',
  empty: 'Thêm pool để tổ chức quy trình này.',
  bpmn: 'BPMN 2.0 (.bpmn)',
  bpmnInvalid: 'File BPMN không đúng cấu trúc hoặc có tham chiếu không hợp lệ.',
  bpmnUnsupported:
    'File BPMN có ngữ nghĩa thực thi editor chưa hỗ trợ. Nội dung chưa được nhập.',
  bpmnLimit: 'File BPMN vượt giới hạn phân tích an toàn.',
};
export const getCollaborationCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
