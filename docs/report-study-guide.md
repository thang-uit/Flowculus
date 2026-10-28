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
6. Upload `12_to_be_deviations.csv`, vẫn dùng mô hình To-Be. FEAT_301 thiếu QA; FEAT_302 thay bàn giao bằng bước ngoài chuẩn; FEAT_304 chưa UAT/ký; FEAT_303 khớp. Fitness theo alignment là 92,31%, còn tỷ lệ ca hoàn toàn khớp chỉ 1/4. Đây là hai cách đọc khác nhau.
7. Kiểm tra Petri từ BPMN: duyệt hoàn tất 20 marking As-Is và 27 marking To-Be; safe/bounded/sound trong phạm vi mô hình. Khi chạm giới hạn, ứng dụng phải trả chưa xác định.
8. Đổi **Thời gian lịch liên tục** để giải thích khác biệt với giờ làm việc. Timestamp/thứ tự và conformance giữ nguyên; không gán mọi buổi tối/cuối tuần thành lãng phí.

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
