# Security Policy

[English](#english) · [Tiếng Việt](#tieng-viet)

<a id="english"></a>

## English

### Contents

- [Scope](#en-scope)
- [Private reporting](#en-reporting)
- [Coordinated handling](#en-handling)

<a id="en-scope"></a>

### Scope

Report security issues affecting the current `main` branch or the application at
<https://flowculus.vercel.app>. Include the affected commit, application version
or deployment date. Older branches and forks do not have a separate maintenance
commitment.

Examples include unsafe execution of imported content, cross-site scripting
(XSS), unintended exposure of models or event logs, unintended file access and
resource-limit bypasses that can freeze the browser. Ordinary calculation and
user-experience bugs belong in the [bug form](https://github.com/thang-uit/Flowculus/issues/new/choose)
unless they have a security impact or require confidential handling.

<a id="en-reporting"></a>

### Private reporting

Use GitHub's [Report a vulnerability](https://github.com/thang-uit/Flowculus/security/advisories/new)
when private reporting is enabled. **Do not disclose an unresolved vulnerability
in a public issue.** If that channel is unavailable, use a contact method on the
profile of [thang-uit](https://github.com/thang-uit) or
[hue-trinh](https://github.com/hue-trinh) to request a private contact before
sharing sensitive details.

A useful report includes:

- The affected component and reproducible impact.
- The commit or URL, browser and operating system.
- Reproduction steps and a minimal **synthetic** input file, if needed.
- A suggested fix, if you have one.

Do not send production event logs, personal data, credentials or secrets.

<a id="en-handling"></a>

### Coordinated handling

Maintainers assess reports privately and coordinate disclosure with the reporter
after a fix or appropriate mitigation. There is no fixed response-time
commitment. Public attribution requires the reporter's agreement.

Test only with data and environments you are authorised to use. Avoid disrupting
the public service or accessing another person's data.

[Tiếng Việt ↓](#tieng-viet) · [Back to English contents](#english)

---

<a id="tieng-viet"></a>

## Tiếng Việt

### Mục lục

- [Phạm vi](#vi-scope)
- [Gửi riêng](#vi-reporting)
- [Phối hợp xử lý](#vi-handling)

<a id="vi-scope"></a>

### Phạm vi

Nhóm tiếp nhận vấn đề bảo mật trên mã nguồn hiện tại của `main` và bản Flowculus
đang công bố tại <https://flowculus.vercel.app>. Khi báo cáo, ghi commit, phiên
bản ứng dụng hoặc thời điểm truy cập. Chưa có cam kết hỗ trợ riêng cho các nhánh
cũ hoặc các bản fork.

Các ví dụ gồm thực thi nội dung nhập không an toàn, cross-site scripting (XSS),
rò rỉ mô hình hoặc nhật ký sự kiện, đọc file ngoài ý muốn và vượt giới hạn xử lý
có thể làm treo trình duyệt. Sai công thức hay vấn đề trải nghiệm thông thường
dùng [Issue báo lỗi](https://github.com/thang-uit/Flowculus/issues/new/choose), trừ
khi có tác động bảo mật hoặc cần giữ kín dữ liệu.

<a id="vi-reporting"></a>

### Gửi riêng

Dùng [Report a vulnerability](https://github.com/thang-uit/Flowculus/security/advisories/new)
trên GitHub khi chức năng báo cáo riêng đã được bật. **Không mở Issue công khai
cho lỗ hổng chưa được xử lý.** Nếu kênh đó chưa khả dụng, dùng kênh liên hệ trên
hồ sơ [thang-uit](https://github.com/thang-uit) hoặc
[hue-trinh](https://github.com/hue-trinh) để xin cách liên hệ riêng trước khi gửi
chi tiết nhạy cảm.

Báo cáo hữu ích gồm:

- Vùng bị ảnh hưởng và tác động có thể tái hiện.
- Commit hoặc URL, trình duyệt và hệ điều hành.
- Các bước tái hiện cùng file tối thiểu **tổng hợp**, nếu cần.
- Cách khắc phục đề xuất, nếu đã có.

Không gửi nhật ký sự kiện thật, dữ liệu cá nhân, thông tin đăng nhập hoặc bí mật.

<a id="vi-handling"></a>

### Phối hợp xử lý

Nhóm sẽ đánh giá mức độ, trao đổi riêng với người báo cáo và thống nhất việc công
bố sau khi có bản sửa hoặc phương án giảm thiểu phù hợp. Hiện chưa có thời hạn
phản hồi cố định. Việc ghi nhận công khai cần sự đồng ý của người báo cáo.

Chỉ kiểm thử trên dữ liệu và môi trường bạn có quyền sử dụng. Tránh làm gián đoạn
dịch vụ công khai hoặc truy cập dữ liệu của người khác.

[English ↑](#english) · [Về mục lục tiếng Việt](#tieng-viet)
