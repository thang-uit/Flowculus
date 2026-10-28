# Đóng góp cho Flowculus · Contributing to Flowculus

Flowculus đón nhận báo lỗi, sửa tài liệu, bản dịch, cải thiện trợ năng và đóng góp
mã nguồn. Bạn có thể trao đổi bằng tiếng Việt hoặc tiếng Anh. Không cần là thành
viên dự án để mở Issue hoặc gửi Pull Request (PR).

Flowculus welcomes bug reports, documentation, translations, accessibility work
and code contributions. Vietnamese and English are both welcome. You do not need
write access to propose a change.

## 1. Chọn việc phù hợp · Choose a contribution

- Tìm [Issue hiện có](https://github.com/thang-uit/Flowculus/issues) trước khi tạo mới.
- Bắt đầu với [good first issue](https://github.com/thang-uit/Flowculus/labels/good%20first%20issue)
  hoặc [help wanted](https://github.com/thang-uit/Flowculus/labels/help%20wanted).
  Nếu danh sách trống, bạn vẫn có thể đề xuất việc nhỏ bằng Issue.
- Với thay đổi lớn về công thức, định dạng file, kiến trúc hoặc dependency, mở
  Issue để thống nhất phạm vi trước khi triển khai.
- Lỗi bảo mật gửi riêng theo [SECURITY.md](SECURITY.md). Không đăng dữ liệu công ty,
  nhật ký sự kiện thật, khóa truy cập hoặc thông tin cá nhân lên Issue công khai.

Search existing issues first. Discuss substantial changes before implementing
them. Small fixes may go straight to a PR. Use synthetic, anonymised reproductions
and the private security channel for vulnerabilities.

## 2. Chuẩn bị môi trường · Local setup

Cần Git, Node.js **22.23 trở lên trong nhánh 22.x** và pnpm **11.22.0**, đúng trường
`packageManager`. pnpm 11 cần Node.js từ 22.13. Dùng 22.23 trở lên để chạy cả công cụ
xuất demo. Không cần backend, tài khoản dịch vụ hoặc file `.env`.

Use Node.js 22.23+ within the 22.x line and pnpm 11.22.0. No backend, service
credentials or environment files are required.

1. Bấm **Fork** tại [repo gốc](https://github.com/thang-uit/Flowculus).
2. Clone fork của bạn. Thay `YOUR_USERNAME` trong lệnh dưới bằng tài khoản GitHub.

```bash
git clone https://github.com/YOUR_USERNAME/Flowculus.git
cd Flowculus
git remote add upstream https://github.com/thang-uit/Flowculus.git
corepack enable
pnpm install --frozen-lockfile
git switch -c fix/describe-the-problem
pnpm dev
```

Mở <http://localhost:3000>. Các lệnh chạy từ gốc monorepo. Lệnh trên không thay số
phiên bản. Nếu máy không có Corepack, cài pnpm theo [hướng dẫn chính thức](https://pnpm.io/installation).
Không sửa lockfile để giải quyết lỗi phiên bản Node hoặc pnpm.

Run commands from the repository root. Open localhost:3000 after starting the
development server. Install the declared package-manager version rather than
rewriting the lockfile to work around an incompatible runtime.

## 3. Đặt code đúng chỗ · Where changes belong

Đọc [AGENTS.md](AGENTS.md) trước khi sửa. Quy tắc này áp dụng cho cả người viết
code và công cụ hỗ trợ. Xem thêm [kiến trúc](docs/architecture.md).

| Thay đổi · Change                                             | Vị trí · Location                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Canvas, tương tác, giao diện · Editor and UI                  | `apps/web/components/`, `apps/web/lib/`                                        |
| Bản dịch Anh/Việt · English/Vietnamese copy                   | `apps/web/lib/i18n/`                                                           |
| Kiến thức và ví dụ · Knowledge and examples                   | `apps/web/lib/i18n/knowledge/`, `apps/web/lib/knowledge/`                      |
| Công thức và chất lượng kết quả · Formulas and result quality | `packages/analysis-engine/`                                                    |
| Loại dữ liệu và validation · Domain types and validation      | `packages/process-model/`, `packages/validation/`                              |
| File JSON, CSV, BPMN, draw.io · File formats                  | `packages/file-formats/`, `packages/bpmn-adapter/`, `packages/drawio-adapter/` |
| Event log, Alpha, Petri, conformance · Mining                 | `packages/process-mining/`                                                     |
| Pipeline và hướng dẫn · Automation and documentation          | `.github/`, `scripts/`, `docs/`                                                |

Package domain là TypeScript thuần, không nhập React, DOM hay code từ `apps/web`.
UI dựng từ các component/token dùng chung. Không đưa toàn bộ tính năng vào một
page hoặc hook lớn. Không đổi kiến trúc hay thêm thư viện ngoài phạm vi PR.

Domain packages remain framework-independent. Reuse existing primitives and keep
changes focused. A new dependency needs a concrete reason, licence review and a
description of its bundle, maintenance and security impact.

## 4. Giữ đúng nghiệp vụ · Correctness requirements

- Công thức thuộc engine. UI và exporter dùng kết quả của engine, không tính lại.
- Sai số, giả định và ngữ nghĩa chưa hỗ trợ phải thể hiện rõ. Không tạo con số thay
  cho kết quả chưa thể xác định.
- Lưu/xuất/chia sẻ tiếp tục kiểm tra xác nhận ngữ nghĩa. Giữ khả năng đọc file cũ
  và công việc người dùng đã lưu.
- Pool/lane là khung trách nhiệm. Message flow không phải sequence flow. Khám phá
  từ log không tự trở thành quy trình chuẩn để kết luận vi phạm.
- Dữ liệu nhập không đáng tin cậy. Giữ giới hạn file, timeout, cancellation và
  quyền riêng tư. Test dùng dữ liệu tổng hợp, không dùng log sản xuất.
- Thay đổi công thức cần test hồi quy và nguồn tham khảo có thể kiểm chứng. Khi
  sửa kết quả mẫu đã ghim, giải thích nguyên nhân và cập nhật tài liệu tương ứng.
- Tính năng UI có cả Anh/Việt, sáng/tối, bàn phím và màn hình nhỏ. Cập nhật hướng
  dẫn Kiến thức và ảnh minh họa khi thao tác thay đổi.

Preserve semantic confirmation, backward compatibility and user work. Keep
calculation ownership and quality disclosures intact. Domain changes need
meaningful regression tests and verifiable references. UI changes require both
locales, themes and accessible interaction.

## 5. Kiểm tra trước khi gửi · Verify your work

Chạy lần lượt, không chạy typecheck song song với build vì Next.js tạo lại file
kiểu trong `.next`.

```bash
# Tạo kiểu route cho một checkout mới, không đổi phiên bản sản phẩm.
pnpm --filter @flowculus/web exec next typegen
pnpm format:check
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm check` chạy test, format, lint, typecheck và build theo thứ tự. Với checkout
mới, chạy lệnh `next typegen` phía trên trước. Có thể chạy test tập trung khi đang
sửa, ví dụ `pnpm exec vitest run apps/web/lib/collaboration-editing.test.ts`.

Nếu sửa UI, chạy `pnpm start` sau build và kiểm tra luồng liên quan ở desktop,
mobile, hai ngôn ngữ và hai theme. Kiểm tra 320, 390, 430, 768, 1024, 1440 và
1920 px, bàn phím, nội dung dài, trạng thái lỗi, Undo và console. Nêu rõ phần nào
chỉ dùng viewport giả lập và phần nào đã thử trên thiết bị thật.

Run the listed checks sequentially. Lint must have zero warnings. For UI changes,
serve the production build and include desktop/mobile evidence. Never mark a
check as passed if it was not run. No automated browser suite is currently part
of CI, so a green build does not replace interaction testing.

GitNexus là công cụ review cục bộ tùy chọn. Nếu dùng, chạy `pnpm graph:index` rồi
`pnpm graph:check` theo README. Contributor mới và GitHub Actions không bắt buộc
cài GitNexus. Không commit chỉ mục hay dữ liệu cá nhân vào repo.

GitNexus is optional local tooling, not a contribution prerequisite or runtime
dependency. Generated indexes and private data stay outside version control.

## 6. Gửi và cập nhật PR · Submit a pull request

```bash
git status
git add path/to/your-changed-file
git commit -m "fix: describe the corrected behaviour"
git push -u origin fix/describe-the-problem
```

Chỉ stage file thuộc thay đổi của bạn. Trên GitHub, mở PR từ nhánh fork sang
`thang-uit/Flowculus:main`. Dùng **Draft** khi còn làm. Nội dung cần nói rõ vấn đề,
hành vi sau sửa, cách kiểm tra và giới hạn còn lại. Gắn `Fixes #123` khi PR thực sự
giải quyết Issue đó. Ảnh trước/sau hữu ích với UI. Không gắn nhãn bảo mật cho một
Issue công khai thay cho báo cáo riêng.

Only stage your intended files. Target `main` and use a draft while work is in
progress. Explain the problem, resulting behaviour, validation and limitations.
Keep the PR reasonably scoped and respond to review on the same branch.

CI chạy trên PR và trên push vào `main`/`dev`. PR từ người ngoài có thể cần
maintainer cho phép chạy Actions. Quyền này cho chạy kiểm tra, không cấp quyền
ghi repo hoặc quyền merge. Maintainer vẫn có thể yêu cầu chỉnh sửa hoặc từ chối
thay đổi chưa phù hợp.

Fork PR workflows may need maintainer approval. Approval to run CI does not grant
repository write or merge permission. Passing CI alone does not guarantee merge.

## 7. Giấy phép và ghi nhận · Licence and attribution

Gửi PR nghĩa là bạn đề nghị cấp phép phần đóng góp của mình theo [MIT](LICENSE),
đồng thời xác nhận bạn có quyền gửi nội dung đó. Giữ các thông báo bản quyền,
giấy phép và nguồn của phần tái sử dụng. Không cần chuyển quyền sở hữu bản quyền
cho nhóm. Không thêm tên tác giả giả hoặc commit thay người khác.

By submitting a contribution, you offer it under the project's MIT licence and
confirm you have the right to do so. You retain your copyright. Preserve required
third-party attribution and use your own Git author identity.

GitHub ghi nhận contributor theo commit và tài khoản. Với squash merge, maintainer
cần giữ đúng tác giả và các dòng `Co-authored-by` có thật. Không cam kết một PR
chắc chắn xuất hiện trong mọi bảng thống kê của GitHub.

Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Maintainer procedures, labels and
branch-protection setup are documented in [community maintenance](docs/community-maintenance.md).
