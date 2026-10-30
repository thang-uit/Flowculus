# Contributing to Flowculus

[English](#english) · [Tiếng Việt](#tieng-viet)

<a id="english"></a>

## English

Flowculus welcomes bug reports, documentation improvements, translations,
accessibility work and code contributions. You can discuss contributions in
English or Vietnamese. You do not need repository write access to open an issue
or propose a pull request (PR).

### Contents

1. [Choose a contribution](#en-choose)
2. [Set up locally](#en-setup)
3. [Put changes in the right place](#en-structure)
4. [Preserve correctness](#en-correctness)
5. [Verify your work](#en-verification)
6. [Submit and update a pull request](#en-submit)
7. [Licence and attribution](#en-licence)

<a id="en-choose"></a>

### 1. Choose a contribution

- Search [existing issues](https://github.com/thang-uit/Flowculus/issues) before opening a new one.
- Look for [good first issue](https://github.com/thang-uit/Flowculus/labels/good%20first%20issue)
  or [help wanted](https://github.com/thang-uit/Flowculus/labels/help%20wanted).
  If there are no matching issues, you can still propose a small task.
- Open an issue to agree on scope before making substantial changes to formulas,
  file formats, architecture or dependencies. Small fixes may go straight to a PR.
- Follow [SECURITY.md](SECURITY.md) for vulnerabilities. Do not post company data,
  production event logs, credentials or personal information in public issues.
  Use synthetic, anonymised examples for reproductions.

<a id="en-setup"></a>

### 2. Set up locally

You need Git, **Node.js 22.23+ within 22.x** and **pnpm 11.22.0**, as declared in
`packageManager`. pnpm 11 requires Node.js 22.13 or newer. Flowculus uses 22.23+
so the demo export tools run on the same supported runtime. No backend, service
account or `.env` file is required.

1. Fork the [upstream repository](https://github.com/thang-uit/Flowculus).
2. Clone your fork. Replace `YOUR_USERNAME` with your GitHub account name.

```bash
git clone https://github.com/YOUR_USERNAME/Flowculus.git
cd Flowculus
git remote add upstream https://github.com/thang-uit/Flowculus.git
corepack enable
pnpm install --frozen-lockfile
git switch -c fix/describe-the-problem
pnpm dev
```

Open <http://localhost:3000>. Run commands from the monorepo root. These commands
do not change the application version. If Corepack is unavailable, follow the
[pnpm installation guide](https://pnpm.io/installation). Use the declared Node.js
and pnpm versions rather than rewriting the lockfile to work around an
incompatible runtime.

<a id="en-structure"></a>

### 3. Put changes in the right place

Read [AGENTS.md](AGENTS.md) before editing. Its rules apply to both human
contributors and coding tools. See [architecture.md](docs/architecture.md) for
module boundaries.

| Change                                   | Location                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Editor, canvas and interaction           | `apps/web/components/`, `apps/web/lib/`                                        |
| English and Vietnamese copy              | `apps/web/lib/i18n/`                                                           |
| Knowledge content and examples           | `apps/web/lib/i18n/knowledge/`, `apps/web/lib/knowledge/`                      |
| Formulas and result quality              | `packages/analysis-engine/`                                                    |
| Domain types and validation              | `packages/process-model/`, `packages/validation/`                              |
| JSON, CSV, BPMN and draw.io formats      | `packages/file-formats/`, `packages/bpmn-adapter/`, `packages/drawio-adapter/` |
| Event logs, Alpha, Petri and conformance | `packages/process-mining/`                                                     |
| Automation and developer documentation   | `.github/`, `scripts/`, `docs/`                                                |

Domain packages are pure TypeScript. They do not import React, DOM APIs or code
from `apps/web`. Reuse existing components and design tokens. Keep pages,
hooks and services focused, with independently maintainable responsibilities.
Do not change architecture or add dependencies beyond the agreed scope.

A new dependency needs a concrete reason, a licence review and a description of
its bundle, build, maintenance and security impact.

<a id="en-correctness"></a>

### 4. Preserve correctness

- Keep formulas in the engine. UI components and exporters render engine results.
- Disclose assumptions, diagnostics and unsupported semantics. Withhold a metric
  when it cannot be calculated reliably.
- Preserve semantic confirmation for saving, exporting and sharing, along with
  file compatibility and users' existing work.
- Treat pools and lanes as responsibility boundaries. Message flows are not
  sequence flows. A model discovered from a log is not an approved reference
  for declaring violations.
- Treat imports as untrusted. Preserve file limits, timeouts, cancellation and
  privacy safeguards. Tests use synthetic inputs, not production logs.
- Add meaningful regression coverage and verifiable references for formula
  changes. Explain intended changes to pinned example results and update the
  relevant domain documentation.
- Verify English, Vietnamese, light and dark themes, keyboard access and small
  screens for UI changes. Update Knowledge and demo images when interactions change.

<a id="en-verification"></a>

### 5. Verify your work

Run these checks sequentially. Do not run typecheck concurrently with a build,
which recreates generated Next.js types.

```bash
# Generate route types on a fresh checkout. This does not change the app version.
pnpm --filter @flowculus/web exec next typegen
pnpm format:check
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm check` runs tests, formatting, lint, typecheck and build in that order.
Generate route types first on a fresh checkout. During development, run focused
tests when useful, for example:

```bash
pnpm exec vitest run apps/web/lib/collaboration-editing.test.ts
```

For UI changes, serve the production build with `pnpm start` and check the
relevant flows at 320, 390, 430, 768, 1024, 1440 and 1920 px. Cover desktop and
mobile layouts, both languages and themes, keyboard use, long content, error
states, Undo and console output. State which checks used emulated viewports and
which used real devices. Lint must have zero warnings. Report only checks that
actually ran. CI currently has no automated browser suite, so a green build does
not replace interaction testing.

GitNexus is optional local review tooling. If you use it, run `pnpm graph:index`
and `pnpm graph:check` as described in the README. Contributors and GitHub
Actions do not need GitNexus installed. Keep generated indexes and private data
out of version control.

<a id="en-submit"></a>

### 6. Submit and update a pull request

```bash
git status
git add path/to/your-changed-file
git commit -m "fix: describe the corrected behaviour"
git push -u origin fix/describe-the-problem
```

Stage only the files you intend to contribute. Open a PR from your fork to
`thang-uit/Flowculus:main`. Use Draft while work is in progress. Describe the
problem, resulting behaviour, verification and remaining limitations. Add
`Fixes #123` only when the PR resolves that issue. Before/after images are useful
for UI changes. Respond to review in the same branch and keep the PR focused.
Use the private security channel for sensitive reports.

CI runs on PRs and pushes to `main` and `dev`. Fork workflows may need maintainer
approval before they run. That approval grants permission to run checks, without
granting repository write access or merge permission. Maintainers may request
changes or decline contributions. Passing CI alone does not guarantee merge.

<a id="en-licence"></a>

### 7. Licence and attribution

By submitting a contribution, you offer it under the project's [MIT licence](LICENSE)
and confirm that you have the right to submit it. You retain your copyright.
Preserve required copyright, licence and source notices for reused material.
Do not invent authors or commit on someone else's behalf.

GitHub identifies contributors through commits and accounts. When squash merging,
maintainers should preserve the actual author and genuine `Co-authored-by`
trailers. A contribution is not guaranteed to appear in every GitHub statistics
view.

Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Maintainer procedures, labels and
branch-protection setup are documented in the
[community runbook](docs/community-maintenance.md).

[Tiếng Việt ↓](#tieng-viet) · [Back to English contents](#english)

---

<a id="tieng-viet"></a>

## Tiếng Việt

Flowculus đón nhận báo lỗi, sửa tài liệu, bản dịch, cải thiện trợ năng và đóng góp
mã nguồn. Bạn có thể trao đổi bằng tiếng Anh hoặc tiếng Việt. Không cần quyền ghi
repo để mở Issue hoặc gửi Pull Request (PR).

### Mục lục

1. [Chọn việc phù hợp](#vi-choose)
2. [Chuẩn bị môi trường](#vi-setup)
3. [Đặt code đúng chỗ](#vi-structure)
4. [Giữ đúng nghiệp vụ](#vi-correctness)
5. [Kiểm tra trước khi gửi](#vi-verification)
6. [Gửi và cập nhật PR](#vi-submit)
7. [Giấy phép và ghi nhận](#vi-licence)

<a id="vi-choose"></a>

### 1. Chọn việc phù hợp

- Tìm [Issue hiện có](https://github.com/thang-uit/Flowculus/issues) trước khi tạo mới.
- Bắt đầu với [good first issue](https://github.com/thang-uit/Flowculus/labels/good%20first%20issue)
  hoặc [help wanted](https://github.com/thang-uit/Flowculus/labels/help%20wanted).
  Nếu danh sách trống, bạn vẫn có thể đề xuất việc nhỏ bằng Issue.
- Với thay đổi lớn về công thức, định dạng file, kiến trúc hoặc dependency, mở
  Issue để thống nhất phạm vi trước khi triển khai. Bản sửa nhỏ có thể gửi PR trực tiếp.
- Lỗi bảo mật gửi riêng theo [SECURITY.md](SECURITY.md). Không đăng dữ liệu công ty,
  nhật ký sự kiện thật, thông tin đăng nhập hoặc dữ liệu cá nhân lên Issue công khai.
  Dùng ví dụ tổng hợp, đã ẩn danh để tái hiện lỗi.

<a id="vi-setup"></a>

### 2. Chuẩn bị môi trường

Cần Git, **Node.js 22.23 trở lên trong nhánh 22.x** và **pnpm 11.22.0**, đúng trường
`packageManager`. pnpm 11 cần Node.js từ 22.13. Dự án dùng 22.23 trở lên để chạy
cả công cụ xuất demo trên cùng runtime được hỗ trợ. Không cần backend, tài khoản
dịch vụ hoặc file `.env`.

1. Bấm Fork tại [repo gốc](https://github.com/thang-uit/Flowculus).
2. Clone fork của bạn. Thay `YOUR_USERNAME` bằng tài khoản GitHub.

```bash
git clone https://github.com/YOUR_USERNAME/Flowculus.git
cd Flowculus
git remote add upstream https://github.com/thang-uit/Flowculus.git
corepack enable
pnpm install --frozen-lockfile
git switch -c fix/describe-the-problem
pnpm dev
```

Mở <http://localhost:3000>. Chạy các lệnh từ gốc monorepo. Các lệnh này không thay
phiên bản ứng dụng. Nếu chưa có Corepack, làm theo
[hướng dẫn cài pnpm](https://pnpm.io/installation). Dùng đúng phiên bản Node.js và
pnpm đã khai báo, không sửa lockfile để né lỗi runtime không tương thích.

<a id="vi-structure"></a>

### 3. Đặt code đúng chỗ

Đọc [AGENTS.md](AGENTS.md) trước khi sửa. Quy tắc áp dụng cho cả người viết code
và công cụ hỗ trợ. Xem [architecture.md](docs/architecture.md) để hiểu ranh giới module.

| Thay đổi                               | Vị trí                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Editor, canvas và tương tác            | `apps/web/components/`, `apps/web/lib/`                                        |
| Bản dịch Anh/Việt                      | `apps/web/lib/i18n/`                                                           |
| Kiến thức và ví dụ                     | `apps/web/lib/i18n/knowledge/`, `apps/web/lib/knowledge/`                      |
| Công thức và chất lượng kết quả        | `packages/analysis-engine/`                                                    |
| Kiểu dữ liệu và validation             | `packages/process-model/`, `packages/validation/`                              |
| File JSON, CSV, BPMN và draw.io        | `packages/file-formats/`, `packages/bpmn-adapter/`, `packages/drawio-adapter/` |
| Event log, Alpha, Petri và conformance | `packages/process-mining/`                                                     |
| Tự động hóa và tài liệu developer      | `.github/`, `scripts/`, `docs/`                                                |

Package domain là TypeScript thuần, không nhập React, DOM hay code từ `apps/web`.
Tái sử dụng component và design token có sẵn. Giữ page, hook và service tập trung
vào các trách nhiệm có thể bảo trì độc lập. Không đổi kiến trúc hoặc thêm thư viện
ngoài phạm vi đã thống nhất.

Dependency mới cần lý do cụ thể, kiểm tra giấy phép và mô tả tác động đến bundle,
build, bảo trì và bảo mật.

<a id="vi-correctness"></a>

### 4. Giữ đúng nghiệp vụ

- Công thức thuộc engine. UI và exporter hiển thị kết quả engine.
- Nêu rõ giả định, chẩn đoán và ngữ nghĩa chưa hỗ trợ. Giữ trống chỉ số khi chưa
  thể tính đáng tin cậy.
- Giữ kiểm tra xác nhận ngữ nghĩa khi lưu, xuất và chia sẻ, khả năng đọc file cũ
  và công việc người dùng đã lưu.
- Pool/lane là khung trách nhiệm. Message flow không phải sequence flow. Mô hình
  khám phá từ log không tự trở thành quy trình chuẩn để kết luận vi phạm.
- Dữ liệu nhập không đáng tin cậy. Giữ giới hạn file, timeout, cancellation và
  quyền riêng tư. Test dùng dữ liệu tổng hợp, không dùng log sản xuất.
- Thay đổi công thức cần test hồi quy có ý nghĩa và nguồn tham khảo kiểm chứng
  được. Giải thích việc đổi kết quả mẫu đã ghim và cập nhật tài liệu nghiệp vụ.
- Kiểm tra Anh/Việt, sáng/tối, bàn phím và màn hình nhỏ khi sửa UI. Cập nhật
  Knowledge và ảnh minh họa khi thao tác thay đổi.

<a id="vi-verification"></a>

### 5. Kiểm tra trước khi gửi

Chạy lần lượt các lệnh sau. Không chạy typecheck song song với build vì Next.js
tạo lại file kiểu trong `.next`.

```bash
# Tạo kiểu route cho checkout mới, không đổi phiên bản ứng dụng.
pnpm --filter @flowculus/web exec next typegen
pnpm format:check
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm check` chạy test, format, lint, typecheck và build theo thứ tự. Với checkout
mới, tạo kiểu route trước. Khi đang sửa có thể chạy test tập trung, ví dụ:

```bash
pnpm exec vitest run apps/web/lib/collaboration-editing.test.ts
```

Nếu sửa UI, chạy `pnpm start` sau build rồi kiểm tra luồng liên quan ở 320, 390,
430, 768, 1024, 1440 và 1920 px. Bao gồm desktop/mobile, hai ngôn ngữ, hai theme,
bàn phím, nội dung dài, trạng thái lỗi, Undo và console. Nêu rõ phần nào dùng
viewport giả lập và phần nào thử trên thiết bị thật. Lint phải có 0 warning.
Chỉ báo đạt cho kiểm tra đã thực sự chạy. CI hiện chưa có bộ test trình duyệt tự
động, nên build xanh chưa thay thế được kiểm tra tương tác.

GitNexus là công cụ review cục bộ tùy chọn. Nếu dùng, chạy `pnpm graph:index` và
`pnpm graph:check` theo README. Contributor và GitHub Actions không bắt buộc cài
GitNexus. Không commit chỉ mục sinh tự động hoặc dữ liệu riêng tư.

<a id="vi-submit"></a>

### 6. Gửi và cập nhật PR

```bash
git status
git add path/to/your-changed-file
git commit -m "fix: describe the corrected behaviour"
git push -u origin fix/describe-the-problem
```

Chỉ stage file thuộc phần đóng góp của bạn. Mở PR từ nhánh fork sang
`thang-uit/Flowculus:main`. Dùng Draft khi còn làm. Mô tả vấn đề, hành vi sau sửa,
cách kiểm tra và giới hạn còn lại. Chỉ gắn `Fixes #123` khi PR giải quyết Issue
đó. Ảnh trước/sau hữu ích với UI. Cập nhật review trên cùng nhánh và giữ phạm vi
PR tập trung. Dùng kênh bảo mật riêng cho báo cáo nhạy cảm.

CI chạy trên PR và push vào `main`/`dev`. Workflow từ fork có thể cần maintainer
cho phép trước khi chạy. Quyền này chỉ cho chạy kiểm tra, không cấp quyền ghi
repo hay merge. Maintainer có thể yêu cầu sửa hoặc từ chối đóng góp. CI đạt chưa
đồng nghĩa PR chắc chắn được merge.

<a id="vi-licence"></a>

### 7. Giấy phép và ghi nhận

Gửi phần đóng góp nghĩa là bạn đề nghị cấp phép nó theo [MIT](LICENSE) của dự án
và xác nhận bạn có quyền gửi nội dung đó. Bạn vẫn giữ bản quyền. Giữ các thông
báo bản quyền, giấy phép và nguồn của phần tái sử dụng. Không thêm tên tác giả
giả hoặc commit thay người khác.

GitHub ghi nhận contributor qua commit và tài khoản. Khi squash merge,
maintainer cần giữ đúng tác giả và các dòng `Co-authored-by` có thật. Không cam
kết đóng góp sẽ xuất hiện trong mọi bảng thống kê của GitHub.

Tuân theo [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Quy trình maintainer, nhãn và
cấu hình bảo vệ nhánh nằm trong
[hướng dẫn cộng đồng](docs/community-maintenance.md).

[English ↑](#english) · [Về mục lục tiếng Việt](#tieng-viet)
