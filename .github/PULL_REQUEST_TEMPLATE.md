## Vấn đề và thay đổi · Problem and resulting behaviour

<!-- Nêu tình huống trước/sau và lý do. Vietnamese or English is welcome. -->

## Issue liên quan · Related issue

<!-- Chỉ dùng Fixes #123 khi giải quyết toàn bộ Issue. Remove this section if unrelated. -->

## Kiểm tra đã chạy · Actual verification

<!-- Ghi lệnh và kết quả thật. Nêu lý do nếu chưa chạy. -->

- [ ] `pnpm format:check`
- [ ] `pnpm test`
- [ ] `pnpm lint` — 0 warnings
- [ ] `pnpm typecheck` — run `pnpm --filter @flowculus/web exec next typegen` first on a fresh checkout
- [ ] `pnpm build`

## Bằng chứng và giới hạn · Evidence and limitations

<!--
UI: ảnh trước/sau, kích thước màn hình, sáng/tối, Anh/Việt, bàn phím, console.
Domain: test hồi quy, công thức/nguồn và lý do nếu kết quả mẫu thay đổi.
Files/storage: khả năng đọc file cũ, import/export, Undo, dữ liệu không hợp lệ.
Distinguish actual-device tests from viewport emulation. State material limitations.
-->

## Tự rà soát · Self-review

- [ ] Đã đọc `AGENTS.md` và `CONTRIBUTING.md` · I followed project rules.
- [ ] Thay đổi tập trung, tái sử dụng logic/UI có sẵn · The change is focused and reuses existing code.
- [ ] Đã bổ sung test hồi quy khi cần · Meaningful regression coverage is included where appropriate.
- [ ] Đã cập nhật bản dịch, Knowledge/README khi liên quan, hoặc không áp dụng · Relevant copy and documentation are current, or not applicable.
- [ ] Có quyền đóng góp nội dung theo MIT và giữ thông báo bên thứ ba · I can contribute this work under MIT and preserved third-party notices.

<!-- Không đính kèm log sản xuất, dữ liệu cá nhân, secret hoặc ảnh có thông tin riêng tư. -->
