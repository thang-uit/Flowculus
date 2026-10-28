import type { Locale } from './types';
const EN = {
  title: 'Time measurement',
  basis: 'Clock used for durations',
  elapsed: 'Elapsed calendar time',
  working: 'Working time',
  hint: 'Working time excludes off-hours, weekends and listed holidays. Timestamps and trace order remain unchanged. A fixed UTC offset is used; daylight-saving schedules need separate calendars.',
  configure: 'Configure work calendar',
  close: 'Close',
  apply: 'Apply calendar',
  offset: 'UTC offset (minutes)',
  weekdays: 'Working weekdays (ISO 1–7)',
  shifts: 'Shifts (HH:MM-HH:MM, separated by commas)',
  holidays: 'Holidays (YYYY-MM-DD, separated by commas)',
  offsetError: 'Enter an integer UTC offset from −840 to 840 minutes.',
  daysError: 'Enter unique weekdays from 1 to 7, separated by commas.',
  shiftsError:
    'Enter 1–8 valid, non-overlapping HH:MM-HH:MM shifts. Valid shifts are sorted automatically.',
  holidaysError: 'Enter valid YYYY-MM-DD dates, separated by commas (maximum 1,000).',
  summary:
    'Default: Mon–Fri, 08:00–12:00 and 13:00–17:00, UTC+07:00. Configure it for your organisation.',
  standards:
    'Thresholds use the selected clock. Start/end intervals are elapsed activity spans, not proof of hands-on labour.',
};
const VI: typeof EN = {
  title: 'Cách đo thời gian',
  basis: 'Lịch dùng tính thời lượng',
  elapsed: 'Thời gian lịch liên tục',
  working: 'Giờ làm việc',
  hint: 'Giờ làm việc loại trừ ngoài ca, cuối tuần và ngày nghỉ đã khai báo. Timestamp và thứ tự trace được giữ nguyên. Dùng độ lệch UTC cố định; lịch đổi giờ mùa cần cấu hình riêng.',
  configure: 'Cấu hình lịch làm việc',
  close: 'Đóng',
  apply: 'Áp dụng lịch',
  offset: 'Độ lệch UTC (phút)',
  weekdays: 'Ngày làm việc (ISO 1–7, thứ 2 là 1)',
  shifts: 'Ca làm (HH:MM-HH:MM, phân cách bằng dấu phẩy)',
  holidays: 'Ngày nghỉ (YYYY-MM-DD, phân cách bằng dấu phẩy)',
  offsetError: 'Nhập độ lệch UTC là số nguyên từ −840 đến 840 phút.',
  daysError: 'Nhập các thứ từ 1 đến 7, không trùng, phân cách bằng dấu phẩy.',
  shiftsError:
    'Nhập 1–8 ca HH:MM-HH:MM hợp lệ, không chồng nhau. Ca hợp lệ được tự xếp theo giờ.',
  holidaysError:
    'Nhập ngày hợp lệ YYYY-MM-DD, phân cách bằng dấu phẩy (tối đa 1.000 ngày).',
  summary:
    'Mặc định: thứ 2–thứ 6, 08:00–12:00 và 13:00–17:00, UTC+07:00. Có thể đổi theo đơn vị của bạn.',
  standards:
    'Ngưỡng dùng lịch đo đang chọn. Khoảng start/end là thời lượng hoạt động, chưa chứng minh toàn bộ là giờ công thao tác.',
};
export const getCalendarCopy = (locale: Locale) => (locale === 'vi' ? VI : EN);
