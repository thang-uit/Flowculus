# Rà soát Flowculus bằng GitNexus · GitNexus review

Ngày · Date: 2026-10-25. Phạm vi · Scope: các thay đổi phát triển trên `main`, gồm những đợt sửa trước đó. Đây là báo cáo kết quả kiểm tra cục bộ; commit/push thuộc bước phát hành được người dùng yêu cầu riêng. Chưa triển khai lên Vercel. · This report records local verification of the accumulated main-branch changes. Commit/push belongs to the separately authorized release step; no hosted deployment is verified here.

## Phương pháp · Method

- GitNexus 1.6.9: index-only + PDG, 2 parser workers; query, context, impact, control-dependence queries, import-cycle checks and change detection.
- Đọc trực tiếp các đường nhập/xuất, schema, bản nháp, worker và nội dung Kiến thức; kiểm tra dependency/audit/peer compatibility. · Source verification of file boundaries, schema, drafts, workers and knowledge content, plus dependency/audit/peer checks.
- Production build cục bộ và Chromium Playwright trên desktop/mobile, Anh/Việt, sáng/tối. · Local production build and Chromium browser checks across viewport, language and theme variants.
- GitNexus ban đầu chỉ ra hai vòng import **kiểu dữ liệu**, không phải vòng chạy JavaScript. Báo cáo change-impact áp dụng toàn bộ worktree bẩn, nên mức rủi ro tổng hợp không đại diện riêng các sửa đổi của đợt này. Phân tích tĩnh có thể không nối được mọi import alias/callback động. · The initial two cycles were type-only. Diff impact covers the entire dirty worktree; unresolved dynamic references require source review.

## Lỗi đã sửa · Corrected findings

| Mức · Priority | Phát hiện · Finding                                                                                                                         | Sửa đổi · Correction                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1             | Bản nháp tải chậm có thể ghi đè chỉnh sửa/nhập file mới. · Slow hydration could overwrite newer work.                                       | Chỉ phục hồi khi model, lựa chọn phân tích và nguồn draw.io chưa đổi; bắt đầu lưu sau khi hydration hoàn tất. · Restore only an unchanged workspace; make hydration completion reactive.                             |
| P1             | Tệp XLSX/CSV đọc chậm có thể mở lại màn ánh xạ sau hủy hoặc đổi nguồn. · Late reads could reopen mapping after cancellation/source changes. | AbortSignal, terminate worker, kiểm tra yêu cầu mới nhất và cleanup khi unmount; dùng chung luồng Mở tệp/kéo thả để tệp cũ không ghi đè tệp mới. · Abort extraction, terminate workers and discard superseded reads. |
| P1             | Khóa bảng node/edge khác ID bên trong tạo trạng thái không nhất quán. · Mismatched record keys/IDs could break editing.                     | Schema từ chối trước khi tải canvas, clipboard hoặc bản nháp. · Reject at schema boundaries.                                                                                                                         |
| P2             | Mining dùng “Luồng chuẩn” cho biến thể quan sát được. · Observed route labelled as normative.                                               | “Luồng phổ biến / Common route”, giải thích rõ quan sát khác mô hình chuẩn.                                                                                                                                          |
| P2             | Toolbar laptop chồng nút ở 1024–1366px dù body không tràn.                                                                                  | Header gọn dưới 1280px; điều khiển vẽ dùng thanh nổi dưới 1440px. Kiểm tra bấm từng nút thay vì chỉ đo scrollWidth. · Compact header and floating canvas actions below desktop width.                                |
| P2             | Chip thời gian/chi phí trên shape bị cắt mất. · Task metadata clipped.                                                                      | Vùng cuộn ngang có focus, giữ thao tác node tách biệt với cuộn thông tin. · Focusable scroll region with canvas gesture exclusions.                                                                                  |
| P2             | Mục lục chọn sai bài khi ví dụ làm lại nằm ngoài article; focus trên di động có thể còn trong mục lục đã đóng.                              | Đưa ví dụ vào article; theo dõi toàn bộ bài đang giao vùng nhìn; trả focus về bài. · Own the playground within its topic and focus the selected article.                                                             |
| P2             | Chữ đọc nhỏ, đoạn thao tác dài, ví dụ chỉ nêu kết quả.                                                                                      | Body 16px, chia hướng dẫn theo thao tác, diễn giải tự nhiên và công thức số từ engine có thể sao chép. · Readable type, focused subsections and engine-backed worked steps.                                          |
| P2             | Hai luồng song song trong hình bài học chập vào cùng cạnh join.                                                                             | Nối vào các đỉnh riêng của gateway; chia sẻ marker BPMN hiện có. · Distinct join ports with shared BPMN markers.                                                                                                     |
| P2             | Build guard chỉ kiểm tra hai trong bốn worker.                                                                                              | Kiểm tra đủ analysis, mining, Image Trace và XLSX; thiếu bundle/raw TypeScript sẽ làm build thất bại.                                                                                                                |
| P3             | Hai vòng phụ thuộc qua barrel chứa kiểu dữ liệu.                                                                                            | Tách geometry-types và gateway-kind, giữ nguyên API xuất công khai. · Extract leaf type modules without breaking public exports.                                                                                     |

## Các tệp chính · Main files

- `apps/web/lib/use-local-draft.ts`: phục hồi/lưu nháp; `use-workspace-import.ts`: điều phối nhập tệp mới nhất; `import-process-file.ts` và test: hủy tại biên đọc file.
- `apps/web/lib/use-mining-upload.ts`, `use-mining-session.ts`, `read-event-log-file.ts` và test: đọc file/worker có hủy và bỏ kết quả cũ.
- `packages/validation/src/schema.ts` và `index.test.ts`: đồng nhất khóa/ID.
- `packages/graph-layout/src/geometry-types.ts`, `packages/process-model/src/gateway-kind.ts`: kiểu dùng chung không tạo vòng qua barrel.
- `apps/web/components/knowledge/`, `apps/web/lib/i18n/knowledge/`, `apps/web/lib/knowledge/`, `apps/web/app/styles/knowledge.css`: bài học, công thức, hình minh họa và mục lục; `rework-example.test.ts`: biên số liệu.
- `apps/web/components/WorkspaceHeader.tsx`, `canvas/CanvasFloatingControls.tsx`, `canvas/TaskChips.tsx`, `mining/VariantExplorer.tsx`, `mining/ResourceCentralityTable.tsx`: thao tác responsive, thông tin shape và thuật ngữ Mining.
- `package.json`, `apps/web/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.gitnexusignore`, `.gitignore`, `.prettierignore`, `apps/web/scripts/verify-worker-bundle.mjs`: tooling, dependency và kiểm tra worker.
- `README.md`, `AGENTS.md`, `docs/surfaces/knowledge-and-about.md`, `docs/images/`, `apps/web/public/demo/`: hướng dẫn song ngữ, quy tắc, ảnh và provenance.

## Dependency và phần thừa · Dependencies and cleanup

- Zustand 5.0.16, PostCSS 8.5.31, Prettier 3.9.10; `@types/node` 22.20.5 phù hợp runtime Node 22.
- Xóa selector `.knowledge-intro-heading` không còn sử dụng và ngoại lệ tuổi phát hành ESLint không còn cần thiết. · Remove unused CSS and an obsolete release-age exception.
- Không tìm thấy dependency runtime trực tiếp nào có thể bỏ mà vẫn giữ toàn bộ tính năng. OpenCV lớn nhưng chỉ tải khi nhận dạng ảnh; không xóa thư viện đang dùng để làm số lượng dependency đẹp hơn. · Every direct runtime dependency has a current use; OpenCV stays on demand.
- ESLint 9.39.5 là ngoại lệ đã biết: registry đánh dấu hết hỗ trợ, nhưng các plugin React/a11y/import hiện chưa hỗ trợ peer ESLint 10. Thử đối chiếu peer xác nhận xung đột; giữ bản tương thích, không ép override. Đây là công cụ dev, không vào bundle production. · ESLint 9 is a documented development-tool compatibility exception.
- Không nâng major React, TypeScript, Vitest hay pnpm trong đợt sửa lỗi này. · Major migrations are separate work.

## Xác minh và giới hạn · Verification and limits

- Vitest: 270 test / 43 file, gồm kiểm tra ID, biên số liệu ví dụ và vòng đời đọc file (thành công/lỗi/timeout/hủy).
- ESLint: 0 warning; TypeScript và production build đạt. Bốn worker đều được đóng gói JavaScript.
- Format:check đạt; frozen-lockfile install từ `apps/web` chạy thành công trên Node 22.23.1/pnpm 11.22.0. · Formatting and Vercel-root install pass.
- GitNexus: 0 circular imports sau tách kiểu; không có import từ packages ngược lên apps.
- Dependency audit: 0 advisory tại thời điểm kiểm tra; peer dependency check không báo xung đột. Audit không phải bảo đảm không có lỗ hổng chưa công bố.
- Kiểm tra race trên Chromium: giữ kết quả IndexedDB, chỉnh sửa rồi mới trả bản nháp cũ; xác nhận thay đổi mới vẫn được lưu. Mở liên tiếp hai tệp qua header/kéo thả, bỏ kết quả và lỗi từ tệp cũ. Giữ nội dung CSV rồi hủy/đổi preset; xác nhận hộp ánh xạ không mở lại. Mục lục giữ đúng bài làm lại và chip task cuộn được bằng bàn phím. Kiểm tra copy công thức ký hiệu/số bằng clipboard adapter giả lập. · Delayed hydration/read integration checks preserve newer work and reject stale uploads.
- Cập nhật bốn ảnh workspace Anh/Việt sáng/tối, trang Kiến thức, ví dụ làm lại và công thức OR từ production cục bộ; lưu provenance cạnh ảnh. · Recaptured seven demo assets with provenance.
- Cỡ màn hình kiểm tra: 320, 390, 430, 768, 1024, 1440, 1920px; toolbar kiểm tra thêm 1100, 1200, 1280, 1366, 1439px với từng nút còn bấm được. Cảm ứng mô phỏng Chromium không thay cho thử trên iPhone/Android thật, Safari, Firefox hoặc kiểm định trình đọc màn hình đầy đủ.
- Chưa tạo Vercel Preview; chưa đánh giá CDN/độ trễ mạng thực hoặc load test production. Không tuyên bố parity đầy đủ với draw.io, toàn bộ BPMN hoặc không còn bug.

Đã dọn các cache Next/Turbo/TypeScript/Vitest/Playwright trong phạm vi repository (các thư mục lớn đo trước khi dọn khoảng 1,8 GiB). Sau build/test cuối, dọn thêm 1.029.436 KiB (khoảng 1 GiB) cache được tạo lại rồi khởi động lại production server thành công. Giữ nguyên dependency, graph GitNexus, source, ảnh demo và bản nháp trình duyệt. · Scoped generated-cache cleanup preserves installed dependencies, graph, source and user drafts.

## Chuẩn bị Vercel · Vercel preparation

1. Node 22.x, pnpm 11.22.0; đã chạy thành công `CI=true pnpm install --frozen-lockfile` từ `apps/web`.
2. Root Directory `apps/web`, bật Include files outside the root directory; giữ config `apps/web/vercel.json`.
3. Build `pnpm run build`, output `.next` do Next.js quản lý. Không cần biến môi trường ứng dụng.
4. Commit phát hành cần chứa đầy đủ source mới, ví dụ và ảnh demo đã kiểm tra. Không gửi `.gitnexus`, `.next`, `.tmp`, logs hay cache lên repository. · Include reviewed source, examples and demo assets; exclude local indexes and generated caches.
5. Kiểm tra Preview: `/`, `/mining`, `/knowledge`, `/about`; nhập file, worker, xác nhận ngữ nghĩa, xuất/nhập, lưu nháp, theme, ngôn ngữ và màn nhỏ. Chỉ promote sau khi Preview đạt.
6. Sau rebuild cục bộ, dừng server cũ trước build và tải lại trang đầy đủ để tránh tab đang giữ tên chunk của bản cũ. · Stop the old local server before rebuilding and reload the browser to avoid stale chunk references.
