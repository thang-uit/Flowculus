# Vận hành cộng đồng · Community maintenance

Tài liệu này dành cho maintainer của [thang-uit/Flowculus](https://github.com/thang-uit/Flowculus).
Contributor bắt đầu ở [CONTRIBUTING.md](../CONTRIBUTING.md). Các file cấu hình trong
repo chỉ có hiệu lực trên GitHub sau khi được đưa lên nhánh tương ứng. Branch
protection và cài đặt Actions là thiết lập trên GitHub, không tự bật bởi `CODEOWNERS`.

This is the maintainer runbook. Repository files take effect after publication.
Branch protection and Actions policy are server-side settings, separate from
CODEOWNERS and the workflow file.

## 1. Vai trò và quyền · Roles and permissions

| Vai trò · Role   | Quyền và trách nhiệm · Responsibility                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Contributor      | Fork, mở Issue, gửi PR, cập nhật đề xuất. Không được tự ghi vào repo gốc.                                     |
| Reviewer         | Người có quyền phù hợp xem logic, test, UX và phạm vi. Approval chạy CI không phải approval merge.            |
| Maintainer       | `thang-uit` và `hue-trinh` được chỉ định trong CODEOWNERS. Review, phân loại Issue và merge theo rule đã bật. |
| Repository owner | Quản lý quyền, bảo mật, branch rules và trường hợp khẩn cấp. Không chia sẻ credential với contributor.        |

Hai tên cùng một dòng CODEOWNERS nghĩa là một trong hai có thể đáp ứng code-owner
review, không yêu cầu cả hai. Người tạo PR không tự approve PR của mình. Khi đổi
maintainer, xác minh tài khoản có quyền write trước khi cập nhật CODEOWNERS.

One eligible owner approval satisfies a shared CODEOWNERS line. Authors cannot
approve their own PR. Verify write permission before adding a code owner.

## 2. Bật bộ tiếp nhận đóng góp · Publish the community files

1. Đưa LICENSE, CONTRIBUTING, Code of Conduct, SECURITY, CODEOWNERS, Issue Forms,
   PR template và `.github/workflows/ci.yml` lên `main` qua thay đổi đã review.
2. Chạy CI trên GitHub, đợi job **Quality gates** thành công. Với PR từ fork,
   Actions có thể yêu cầu maintainer cho phép chạy.
3. Kiểm tra trang **Issues → New issue** có bốn mẫu và link báo bảo mật riêng.
   Có thể mở form để kiểm tra, không cần gửi Issue thử.
4. Kiểm tra PR thử ở trạng thái Draft nếu cần, không merge code chỉ để thử rule.

Publish the community files, verify the first GitHub CI run, and inspect the issue
chooser and PR template. Local checks do not prove that a hosted workflow ran.

## 3. Bảo vệ main · Protect main

Mở [Settings → Branches](https://github.com/thang-uit/Flowculus/settings/branches).
Một classic protection rule cho mẫu chính xác `main` là đủ cho repo hiện tại.
Không tạo thêm ruleset trùng phạm vi rồi để hai cơ chế mâu thuẫn nhau.

Thiết lập mục tiêu:

- Require a pull request before merging.
- Require **1** approving review.
- Dismiss stale pull request approvals when new commits are pushed.
- Require review from Code Owners.
- Require conversation resolution before merging.
- Chặn force push và xóa `main`, không thêm ngoại lệ cho contributor.
- Sau lần CI đầu tiên, bật Require status checks to pass before merging và chọn
  check **Quality gates** từ GitHub Actions.
- Bật Require branches to be up to date before merging để kiểm tra phần code sẽ
  được kết hợp với `main` mới nhất.

**Không nhập tên check phỏng đoán khi CI chưa từng chạy.** GitHub cần nhận diện
check thực tế trước. Nếu đổi tên job `Quality gates`, cập nhật branch rule cùng
đợt để PR không bị chờ một check cũ mãi mãi.

Require one reviewed PR, stale-approval dismissal, code-owner review, resolved
conversations, and no force push/deletion. Add the exact **Quality gates** check
only after GitHub has observed it. Keep the branch up to date before merge.

Classic protection mặc định cho repository admin bypass. Trong giai đoạn thiết
lập, owner có thể dùng quyền đó để đưa CI lên và hoàn tất rule. Sau khi CI đã chạy
và cả hai maintainer review được, bật **Do not allow bypassing the above settings**
nếu muốn áp dụng rule cho cả owner. Khi bật, PR của Thắng cần Huê review và ngược lại.
Không dùng bypass như quy trình làm việc thường ngày.

Classic protection permits administrator bypass unless disabled. The owner may
need it for the initial CI bootstrap. After CI and both reviewers are verified,
enable no-bypass enforcement if required. Use reviewed PRs for normal work.

Không bắt buộc deploy Vercel thành công để đóng góp tài liệu hoặc code. Workflow
của repo không deploy và không dùng Vercel token. Thiết lập Vercel hiện có là một
luồng độc lập, không được workflow này thay đổi.

The repository CI does not deploy or consume deployment credentials. Existing
Vercel integration is separate. Do not make Vercel deployment a contribution gate
without a deliberate release-policy decision.

## 4. GitHub Actions và dependency · Workflow security

Mở **Settings → Actions → General**:

- Cho chạy các action chính thức của GitHub và `pnpm/action-setup`. Nếu dùng allow
  list, phải cho phép đúng các action trong `ci.yml`.
- Workflow permissions: **Read repository contents and packages permissions**.
- Không cho GitHub Actions tự tạo hoặc approve PR. Workflow hiện tại không cần quyền đó.
- Fork pull request workflows: yêu cầu approval cho **mọi external contributor**.
  Đọc thay đổi, nhất là `.github/workflows/`, trước khi bấm chạy.
- Không chuyển sang `pull_request_target` để chạy code từ fork. Không truyền secret
  vào build/test của contributor.
- Action được ghim theo SHA. Dependabot có thể đề xuất cập nhật SHA qua PR.

Require approval for external fork workflows, use read-only token defaults and
keep PR creation/approval permissions off. Review automation changes before
running them. The CI uses ephemeral GitHub-hosted Ubuntu runners, explicit time
limits, locked installs and no deployment secrets.

Mở **Settings → Advanced Security** để bật private vulnerability reporting,
dependency graph, Dependabot alerts và security updates. Giữ secret scanning/push
protection đang có. Không cần bật tính năng AI trả phí để nhận đóng góp cộng đồng.

Version-update PR được cấu hình trong `.github/dependabot.yml`: npm theo tuần,
GitHub Actions theo tháng. Bot chỉ đề xuất. Maintainer review và merge, không
auto-merge. Không tắt cảnh báo bảo mật chỉ vì CI xanh.

Enable private reporting and dependency alerts. Dependency updates remain reviewed
PRs. No paid AI scanning feature or automatic merge is part of this setup.

## 5. Phân loại Issue · Triage

Các nhãn mặc định `bug`, `enhancement`, `documentation`, `question`, `good first issue`
và `help wanted` đã có trong repo. Issue Forms gắn bốn nhãn loại tương ứng. Nhãn
`accessibility` dùng cho bàn phím, screen reader, độ tương phản và thao tác cảm ứng.

- Xác nhận lỗi và xin ví dụ tổng hợp tối thiểu nếu chưa tái hiện được.
- Ghi phạm vi, hành vi mong muốn và điều kiện hoàn thành trước khi gắn `good first issue`.
- Dùng `help wanted` khi nhóm đã thống nhất hướng và cần người tham gia.
- Khi đóng Issue không làm, giải thích lý do. Không tự đóng bằng stale bot.
- Nếu có dữ liệu nhạy cảm, hướng người gửi sang kênh riêng. Không sao chép dữ liệu đó
  vào test hoặc commit. Với credential bị lộ, đề nghị thu hồi hoặc xoay khóa.

Use existing labels consistently. A good first issue should be small, explained
and actionable. Do not label broad architecture work as beginner-friendly or
promise a response time the maintainers cannot sustain.

## 6. Review và merge · Review and merge

1. Tái hiện vấn đề và đọc kết quả mới. Ưu tiên correctness, bảo mật và bảo toàn dữ liệu.
2. Kiểm tra các ranh giới package, schema, xác nhận ngữ nghĩa và file cũ.
3. Với công thức, đối soát giả định/đơn vị và test hồi quy. Với UI, kiểm tra cả
   Knowledge, hai locale, hai theme và bàn phím.
4. Đọc kết quả từng check. CI không có browser E2E, test thực tế được ghi trong PR.
5. Ưu tiên squash merge cho một thay đổi gọn. Giữ đúng tác giả và các dòng
   `Co-authored-by` có căn cứ. Không tạo contributor giả.
6. Không merge chỉ vì bot cập nhật dependency. Đọc changelog, ảnh hưởng và giấy phép.
7. Sau merge, xác minh CI trên `main`. Theo dõi deploy riêng nếu có thay đổi web.

Review actual behaviour and evidence, not only green checks. Preserve attribution.
Keep deploy validation separate from repository contribution checks.

## 7. Sự cố pipeline và khôi phục · Pipeline recovery

Nếu check bị treo ở Expected, đối chiếu tên job với branch rule và xem Actions có
bị tắt hoặc đang chờ approval. Nếu install báo lockfile khác, xác minh Node/pnpm
trước khi đổi lockfile. Nếu typecheck báo thiếu `.next/types`, chạy `next typegen`
và tránh typecheck song song với build.

Nếu cấu hình rule sai khóa merge, repository owner sửa rule cụ thể trong Settings,
ghi lý do, khôi phục yêu cầu đúng sau khi pipeline hoạt động. Không force push,
không xóa lịch sử và không bỏ bảo vệ nhánh vĩnh viễn để xử lý lỗi CI.

For stuck checks, inspect the exact check name, approval state and Actions policy.
Correct a broken rule narrowly and restore enforcement after recovery. Never
rewrite history or permanently remove protection to work around a failed check.
