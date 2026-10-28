# Báo cáo bảo mật · Security policy

## Phạm vi · Scope

Nhóm tiếp nhận vấn đề bảo mật trên mã nguồn hiện tại của `main` và bản Flowculus
đang công bố tại <https://flowculus.vercel.app>. Chưa có cam kết hỗ trợ các nhánh
cũ hoặc mọi fork. Khi báo cáo, ghi commit, phiên bản hoặc thời điểm truy cập.

Report security issues affecting current `main` or the published application.
Older branches and forks do not have a separate maintenance commitment. Include
the affected revision or deployment date.

Các ví dụ gồm thực thi nội dung nhập không an toàn, cross-site scripting, rò rỉ
mô hình hoặc log, đọc file ngoài ý muốn và vượt giới hạn xử lý có thể làm treo
trình duyệt. Sai công thức hay vấn đề UX thông thường dùng Issue báo lỗi, trừ
khi có tác động bảo mật hoặc cần giữ kín dữ liệu.

Examples include malicious-import execution, XSS, unintended data exposure and
resource-limit bypasses. Ordinary correctness and UX bugs belong in the bug form
unless they have a security impact or require confidential handling.

## Gửi riêng · Private reporting

Dùng [Report a vulnerability](https://github.com/thang-uit/Flowculus/security/advisories/new)
trên GitHub khi chức năng báo cáo riêng đã được bật. **Không mở Issue công khai
cho lỗ hổng chưa được xử lý.** Nếu kênh đó chưa khả dụng, liên hệ maintainer qua
kênh công khai trên hồ sơ [thang-uit](https://github.com/thang-uit) hoặc
[hue-trinh](https://github.com/hue-trinh), trước khi gửi chi tiết nhạy cảm.

Use GitHub private vulnerability reporting when available. Do not disclose an
unresolved vulnerability in a public issue. If private reporting is unavailable,
ask a maintainer for a private contact before sharing sensitive details.

Báo cáo hữu ích gồm:

- Vùng bị ảnh hưởng và tác động có thể tái hiện.
- Commit hoặc URL, trình duyệt và hệ điều hành.
- Các bước tái hiện cùng file tối thiểu **tổng hợp**, nếu cần.
- Cách khắc phục đề xuất, nếu đã có.

Include the affected component, impact, revision, browser, reproduction steps and
an optional synthetic proof of concept. Do not send production event logs,
personal data, credentials or secrets.

## Phối hợp xử lý · Coordinated handling

Nhóm sẽ đánh giá mức độ, trao đổi riêng với người báo cáo và thống nhất việc công
bố sau khi có bản sửa hoặc phương án giảm thiểu phù hợp. Hiện chưa có thời hạn
phản hồi cố định. Việc ghi nhận công khai cần sự đồng ý của người báo cáo.

Maintainers assess reports privately and coordinate disclosure after a fix or
appropriate mitigation. There is no fixed response-time commitment. Public
attribution requires the reporter's agreement.

Chỉ kiểm thử trên dữ liệu và môi trường bạn có quyền sử dụng. Không kiểm tra bằng
cách làm gián đoạn dịch vụ công khai hay truy cập dữ liệu của người khác.

Test with authorised data and environments. Avoid disrupting the public service
or accessing another person's data.
