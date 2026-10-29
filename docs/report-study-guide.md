# Demo báo cáo IS6003 theo lịch làm việc

Lịch chung: **thứ 2–thứ 6, 08:00–12:00 và 13:00–17:00, UTC+07:00**. Chưa cấu hình ngày lễ. Mỗi bộ log chuẩn có **20 ca tổng hợp**, không phải dữ liệu trích xuất Jira/Git. Sprint hai tuần có 10 ngày làm việc và 80 giờ danh nghĩa/người; CT tính năng được tính riêng. Các ca phát hành tuần tự để tránh trùng lịch một resource giữa hai ca. To-Be có ba vai trò làm đồng thời trong cùng ca.

## Tệp sử dụng

| Tệp                                          | Công dụng                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `10_as_is.flowculus.json`                    | Mở mô hình As-Is, giữ thông số theo phút làm việc                        |
| `11_to_be.flowculus.json`                    | Mở mô hình To-Be, giữ thông số theo phút làm việc                        |
| `10_as_is.bpmn`, `11_to_be.bpmn`             | Minh họa nhập/xuất BPMN trong tập con hỗ trợ                             |
| `10_as_is_events.csv`, `11_to_be_events.csv` | Upload log 20 ca tương ứng                                               |
| `12_to_be_deviations.csv`                    | Log 4 ca, trong đó 3 ca sai lệch chủ động tạo                            |
| `12a_skip_qa.csv`                            | Một ca bỏ bước Kiểm thử tích hợp để chỉ rõ model move trong alignment    |
| `12b_bypass_handover.csv`                    | Một ca thay Bàn giao UAT bằng hoạt động ngoài BPMN để chỉ rõ log move    |
| `00_image_samples/*.png`                     | Ảnh có số giờ trong task để trình diễn Image Trace và rà lại thời lượng  |
| `13_service_standards.csv`                   | Ngưỡng xử lý QA/UAT 240 phút, dùng lịch đang chọn                        |
| `14_work_calendar.json`                      | Mô tả lịch để đối soát; cấu hình lịch qua UI, không upload như event log |
| `expected/study_metrics.json`                | Kết quả tính từ engine, cả thời gian liên tục và giờ làm việc            |
| `expected/*.pnml`                            | Mạng Petri chuẩn xuất từ BPMN                                            |
| `study-manifest.json`                        | SHA-256 tệp sinh tự động                                                 |

## Thao tác trình bày

1. Mở Flowculus local bằng `pnpm dev`, truy cập `http://localhost:3000/`. Import hai tệp `.flowculus.json`, mỗi tệp mở trong một tab mới. Kiểm tra CT, TCT, CTE.
2. Chuyển `/mining`. Upload `10_as_is_events.csv`. Gán Mã ca với `case_id`, Hoạt động với `activity`, giờ hoàn thành với `timestamp`, giờ bắt đầu với `start_timestamp` và người thực hiện với `resource`. Chọn **Giờ làm việc**, kiểm tra lịch UTC+07 và hai ca làm.
3. Đọc CT trung bình 101,2 giờ, 20 ca, 160 sự kiện. Xem biến thể, DFG, thời lượng và mạng nhân sự. Betweenness chuẩn hóa cao nhất là Trịnh Thuận Huê (đội BackEnd), bằng 0,50; điều này chưa chứng minh thiếu năng lực.
4. Đối chiếu với mô hình As-Is đúng tab tham chiếu: 20/20 ca khớp, fitness 1 vì đây là dữ liệu tổng hợp từ cùng kịch bản.
5. Upload To-Be, đối chiếu mô hình To-Be. CT trung bình 49,6 giờ, 20 ca, 166 sự kiện. Các nhánh AND đồng thời có thứ tự hoàn thành cố định; Alpha cổ điển có thể không khôi phục đủ AND từ log này. Ví dụ footprint hai thứ tự trong slide là ví dụ giáo khoa riêng.
6. Upload `12a_skip_qa.csv`, vẫn dùng mô hình To-Be. Trong **Kết luận** và **Đối chiếu BPMN**, FEAT_301 có model move “Kiểm thử tích hợp”, nghĩa là mô hình yêu cầu bước này nhưng log không có sự kiện khớp. Đây là bằng chứng ứng viên cho nhảy bước hoặc thiếu ghi log; cần xem ca gốc để xác minh. Upload `12b_bypass_handover.csv` để xem model move “Bàn giao UAT” đi cùng log move “Gửi bản thử ngoài chuẩn”.
7. Có thể upload `12_to_be_deviations.csv` để trình bày tập tổng hợp: FEAT_301 thiếu QA; FEAT_302 thay bàn giao bằng bước ngoài chuẩn; FEAT_304 chưa UAT/ký; FEAT_303 khớp. Fitness theo alignment là 92,31%, còn tỷ lệ ca hoàn toàn khớp chỉ 1/4. Đây là hai cách đọc khác nhau.
8. Kiểm tra Petri từ BPMN: duyệt hoàn tất 20 marking As-Is và 27 marking To-Be; safe/bounded/sound trong phạm vi mô hình. Khi chạm giới hạn, ứng dụng phải trả chưa xác định.
9. Đổi **Thời gian lịch liên tục** để giải thích khác biệt với giờ làm việc. Timestamp/thứ tự và conformance giữ nguyên; không gán mọi buổi tối/cuối tuần thành lãng phí.

## Demo Image Trace

Mở một tab quy trình trống, chọn **Mở tệp → ảnh** rồi tải `00_image_samples/01_as_is_hours.png` hoặc `02_to_be_hours.png`. OpenCV tìm hình, đường nối và nhãn thời lượng dạng số nguyên có hậu tố `h`. Ở bước **Rà lại hình đã nhận dạng**, trường **Thời gian xử lý (giờ)** được điền sẵn khi độ tin cậy vượt ngưỡng. Hãy kiểm tra hoặc sửa số giờ, loại hình và tên trước khi bấm **Tạo bản nháp có thể sửa**. Bản nháp giữ `processingMinutes` theo phút để công thức CT/TCT dùng cùng đơn vị. Việc nhận dạng số là hỗ trợ có kiểm soát, không thay thế bước rà của người dùng.

| Ảnh                  | Số giờ trong bốn task | CT và TCT kỳ vọng |
| -------------------- | --------------------- | ----------------- |
| `01_as_is_hours.png` | 8, 24, 16, 8          | 56 giờ            |
| `02_to_be_hours.png` | 24, 16, 5, 3          | 48 giờ            |

Hai ảnh là bài kiểm tra nhận dạng gồm bốn task nối tuần tự, chưa có thời gian chờ, gateway hoặc nhánh làm lại. Chúng dùng một số hoạt động của kịch bản để trình diễn thao tác nhập ảnh, không phải sơ đồ As-Is và To-Be đầy đủ. Khi trình bày số liệu 101,2 và 49,6 giờ, hãy mở hai tệp `.flowculus.json` tương ứng.

### Demo với nét vẽ tay

Các tệp sau có đường viền không đều và chữ dùng font viết tay. Đây là ảnh tổng hợp để kiểm thử, không phải ảnh chụp của người thật. Mẫu scan thêm góc nghiêng, bóng nhẹ và nhiễu. Hình học và nhiễu có seed cố định, còn font khi render lại có thể thay đổi theo hệ điều hành. Dùng PNG đã xuất nếu muốn các máy nhận cùng một đầu vào.

| Tệp                          | Bài kiểm tra                         | Hình / đường nối tìm được | Nhập sau khi rà                         |
| ---------------------------- | ------------------------------------ | ------------------------- | --------------------------------------- |
| `03_hand_drawn_sequence.png` | Ba task nối bằng nét bút             | 3 / 2                     | A=2h, B=3h, C=4h                        |
| `04_hand_drawn_xor.png`      | Hai sự kiện, ba task và hai gateway  | 7 / 7                     | A=2h, B=3h, C=5h, hai nhánh XOR 50%/50% |
| `05_hand_drawn_photo.png`    | Mô phỏng scan nghiêng, bóng và nhiễu | 3 / 2                     | A=2h, B=3h, C=4h                        |
| `06_hand_drawn_decimal.png`  | Số thập phân viết tay                | 3 / 2                     | A=2.5h, B=3h, C=4h                      |

Số hình và đường nối trên được kiểm tra bằng cùng bước tiền xử lý và bộ nhận dạng OpenCV của ứng dụng trên PNG xuất tại macOS ngày 29/10/2026. Đây là kết quả của bộ mẫu này, chưa phải độ chính xác trên ảnh vẽ tay bất kỳ. Ở cả bốn mẫu, số giờ viết tay để trống và cần nhập trong màn rà soát. Bộ hiện tại nhận dạng hình học tốt hơn đọc chữ viết tay.

Khi demo, có thể nói: “Ứng dụng đã tìm được các hình và đường nối để tạo bản nháp. Chữ viết tay chưa được đọc ổn định nên người dùng rà và nhập lại thời gian. Sau khi xác nhận cấu trúc và số liệu, engine mới dùng mô hình để phân tích.”

Với mẫu 03 hoặc 05, nhập thời gian rồi tạo bản nháp sẽ cho CT/TCT 9 giờ. Mẫu 06 cho 9,5 giờ sau khi nhập A=2,5 giờ. Với mẫu 04, phải rà hai gateway là XOR, chiều các đường nối và đặt xác suất 50% cho mỗi nhánh trước khi đọc kết quả 6 giờ. Các tên A, B, C cần nhập lại vì chức năng hiện tại không đọc tên task từ chữ viết tay.

## Số liệu chính

| Chỉ số                         |  As-Is |  To-Be |
| ------------------------------ | -----: | -----: |
| CT, giờ làm việc               |  101,2 |   49,6 |
| TCT theo cấu trúc              |   69,2 |   41,6 |
| CTE                            | 68,38% | 83,87% |
| Chờ trong lịch                 |     32 |      8 |
| Tổng giờ công, giờ-người       |   69,2 |   62,6 |
| Nhánh sửa nội bộ, tối đa 1 lần |    30% |    10% |
| Nhánh sửa UAT, tối đa 1 lần    |    20% |     5% |

CT giảm 50,99% theo giả định thiết kế. TCT cũng giảm do AND và thời lượng QA/bàn giao, không quy toàn bộ cải thiện cho chờ. Kết quả chưa chứng minh hiệu quả tại doanh nghiệp.

Hai mô hình là **phép chiếu phân tích một process** có vai trò UAT. Trong collaboration BPMN, khách là pool riêng và trao đổi bằng message flow; Flowculus chưa thực thi message giữa hai participant. BPMN xuất từ Flowculus giữ thời gian và xác suất qua extension riêng. Công cụ BPMN khác có thể bỏ qua các extension này. Ưu tiên JSON để giữ cả cấu hình phân tích khi demo.

## Tái tạo

Trong thư mục Flowculus, Node 22.23.1 trở lên trong dòng 22, pnpm theo `packageManager`:

```bash
pnpm install --frozen-lockfile
pnpm demo:export
pnpm test
```

Lệnh export sinh các tệp trên trong `output/demo/report-study/`, được Git bỏ qua. Có thể chọn thư mục khác bằng `pnpm demo:export /absolute/path/to/demo-kit`. Không xuất vào thư mục đang chứa tài liệu khác. Lệnh không sửa bản nháp trong trình duyệt.

Bộ kiểm thử nhỏ riêng được xuất bằng `pnpm demo:export:small-fixture` vào `output/demo/small-fixture/`. Bộ này có 8 ca, dùng để kiểm tra hành vi ứng dụng, không dùng để trình bày số liệu báo cáo.
