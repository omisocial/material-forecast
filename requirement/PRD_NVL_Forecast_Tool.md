# PRD: Công Cụ Tự Động Hóa Forecast & Lập Kế Hoạch Mua NVL
**Boxme Vietnam – Material Planning Tool**
Version 1.0 | Tháng 3/2026

---

## Problem Statement

Planner/Buyer tại Boxme Vietnam hiện phải thực hiện thủ công toàn bộ quy trình lập kế hoạch mua nguyên vật liệu (NVL) hàng tháng: copy dữ liệu từ WMS sang Excel, tính DOI, viết công thức VLOOKUP, kiểm tra từng dòng bằng mắt. Với ~57+ SKU trải trên 4–5 kho, quy trình này mất 3–5 giờ/tháng và có nguy cơ lỗi công thức cao. Không có cơ chế cảnh báo tự động khi DOI dưới ngưỡng an toàn, khiến một số SKU bị stockout giữa kỳ mà không ai phát hiện kịp.

---

## Goals

1. **Giảm thời gian lập PR NVL từ 3–5 giờ xuống dưới 30 phút/tháng** bằng cách tự động hóa toàn bộ tính toán sau khi import file.
2. **Loại bỏ 100% lỗi công thức thủ công** – mọi chỉ số DOI, IT, Thành tiền được tính bằng engine chuẩn, đã verify.
3. **Cảnh báo sớm stockout**: 100% SKU có DOI dự kiến < 20 ngày được highlight đỏ và hiển thị trong dashboard.
4. **Planner giữ quyền kiểm soát**: Có thể override Qty_Batch trên bất kỳ dòng nào, tool tính lại DOI real-time.
5. **Xuất file kết quả đúng định dạng PO gốc** có thể dùng ngay không cần chỉnh sửa.

---

## Non-Goals

1. **Không kết nối trực tiếp với WMS/ERP** – v1 chỉ là file-based tool (import CSV/Excel), không cần API integration.
2. **Không quản lý đơn hàng sau khi tạo PO** – tracking shipment, GRN, matching invoice nằm ngoài scope.
3. **Không hỗ trợ multi-user realtime collaboration** – đây là tool single-user, offline-capable.
4. **Không dự báo demand (statistical forecasting)** – v1 dùng actual outbound 30 ngày làm proxy demand, không dùng ARIMA/ML.
5. **Không có user authentication/role management** – phạm vi nội bộ nhỏ, không cần auth layer.

---

## User Stories

### Persona: Planner/Buyer

**Core flow – Import & Review**
- As a Planner, I want to upload 3 files (Inventory 30 days, Aging Report, Bang gia) và nhận ngay bảng kết quả đề xuất, so that tôi không phải tốn thời gian copy-paste thủ công.
- As a Planner, I want to thấy DOI dự kiến của từng SKU được tô màu (đỏ/vàng/xanh), so that tôi biết ngay SKU nào cần ưu tiên review.
- As a Planner, I want to xem dashboard biểu đồ cột DOI theo SKU và kho, so that tôi có cái nhìn tổng thể trước khi đi vào chi tiết.

**Điều chỉnh & Override**
- As a Planner, I want to chỉnh sửa Qty_Batch trực tiếp trên bảng, so that tôi có thể điều chỉnh theo MOQ, safety stock, hoặc phán đoán business.
- As a Planner, I want to thấy DOI và Thành tiền (+VAT) tự động cập nhật ngay khi tôi thay đổi Qty_Batch, so that tôi thấy được impact của quyết định ngay lập tức.
- As a Planner, I want to đặt DOI target (mặc định 30 ngày) cho toàn bảng, so that tool tính gợi ý Qty_Batch phù hợp.

**Filter & Sort**
- As a Planner, I want to filter kết quả theo kho (VSIP / Lê Minh Xuân / Bình Tân / Tân Tạo / Stock), so that tôi tập trung vào từng kho khi làm việc với warehouse manager.
- As a Planner, I want to sort theo DOI tăng dần để thấy SKU nguy hiểm nhất lên đầu, so that tôi review rủi ro stockout trước.
- As a Planner, I want to filter chỉ các SKU cần đặt hàng (Qty_Batch > 0), so that tôi loại bỏ noise khi xuất báo cáo.

**Export**
- As a Planner, I want to export bảng kết quả ra file Excel đúng format PO gốc, so that tôi submit PO ngay không cần format lại.
- As a Planner, I want to in/export PDF báo cáo tổng hợp, so that tôi trình ký cấp trên hoặc lưu hồ sơ.

**Edge cases**
- As a Planner, I want to thấy cảnh báo rõ ràng nếu file upload thiếu cột bắt buộc, so that tôi biết cần fix gì trước khi tính toán.
- As a Planner, I want to thấy danh sách SKU trong file nhưng không có giá (chưa có trong Bang gia), so that tôi bổ sung giá trước khi xuất PO.
- As a Planner, I want to thấy SKU có Demand = 0 (không có lịch sử xuất kho) được đánh dấu riêng, so that tôi không đặt hàng cho SKU đã ngừng dùng.

---

## Requirements

### Must-Have (P0)

**M1 – Import 3 files đầu vào**
- Upload Inventory_30days (CSV/Excel), Aging_Report (CSV/Excel), Bang_gia (CSV/Excel)
- Validate: kiểm tra cột bắt buộc, báo lỗi cụ thể nếu thiếu
- Acceptance: Upload 3 files → hiện preview 5 dòng đầu → confirm → tính toán

**M2 – Engine tính toán chuẩn (100% verified)**
- F1: `SL_nhap_kho = Qty_Batch × Quy_cach`
- F2: `Thanh_tien_truoc_VAT = SL_nhap_kho × Don_gia`
- F3: `Thanh_tien_sau_VAT = Thanh_tien_truoc_VAT × (1 + VAT_rate)`
- F4: `DOI = (Inventory_close + Qty_Batch) × 30 / Demand_30`
- F5: `Inventory_Turnover = DOI / 30`
- F6: `Qty_Batch_suggested = max(0, ceil((DOI_target × Demand/30 − Inventory) / 1))`
- Acceptance: Kết quả khớp 100% với file gốc trên 57 test cases đã verify

**M3 – Bảng kết quả với inline edit**
- Hiển thị: Kho, SKU, Tên SP, Batch (editable), Quy cách, SL nhập, Đơn giá, Thành tiền +VAT, DOI, IT
- Qty_Batch editable → DOI & Thành tiền cập nhật real-time
- DOI coloring: đỏ (<20), vàng (20–29), xanh (30–45), xanh đậm (>45)

**M4 – Filter theo Kho**
- Dropdown filter: Tất cả / VSIP / Lê Minh Xuân / Bình Tân / Tân Tạo / Stock

**M5 – Export Excel**
- Xuất file .xlsx đúng cấu trúc PO sheet gốc
- Bao gồm: header công ty, tiêu đề tháng, dòng tổng cộng, đầy đủ cột

**M6 – Mobile responsive**
- Layout hoạt động tốt trên màn hình 375px (iPhone SE) trở lên
- Table horizontal scroll trên mobile, cards layout cho từng SKU

### Nice-to-Have (P1)

**N1 – DOI Bar Chart Dashboard**
- Biểu đồ cột ngang, màu theo ngưỡng, filter theo kho
- Summary cards: Tổng SKU, Tổng giá trị +VAT, SKU cần đặt, SKU nguy hiểm (<20 DOI)

**N2 – DOI Target slider**
- Planner chỉnh DOI target (15–60 ngày) → Qty_Batch gợi ý tự cập nhật toàn bảng

**N3 – Export PDF/Print**
- Print-friendly layout với logo Boxme
- Tóm tắt tổng hợp: Tổng giá trị, phân tích DOI, danh sách cảnh báo

**N4 – Aging heatmap**
- Hiển thị cột aging (<15d đến >90d) với màu nhiệt
- Cảnh báo rõ nếu SKU có >0 tồn kho >90 ngày

**N5 – SKU flagging**
- "Đặt thêm safety stock" flag cho từng dòng, VH note column

### Future Considerations (P2)

**F1 – Statistical demand forecast**: Dùng moving average hoặc trend analysis thay vì chỉ dùng outbound 30 ngày
**F2 – Multi-period comparison**: So sánh PR tháng này vs tháng trước để phát hiện trend bất thường
**F3 – WMS API integration**: Pull data tự động từ Boxme WMS, không cần manual export/import
**F4 – Approval workflow**: Gửi PO qua email/Slack để quản lý phê duyệt
**F5 – Vendor price negotiation tracker**: So sánh đơn giá qua các kỳ, alert khi giá tăng

---

## Success Metrics

### Leading Indicators (tuần đầu sau launch)
- **Adoption**: ≥1 Planner dùng tool trong tuần đầu (baseline: 0)
- **Task completion**: ≥90% session kết thúc với export file thành công
- **Error rate**: <5% file upload fail do validation lỗi không rõ ràng

### Lagging Indicators (sau 1 tháng)
- **Time savings**: Thời gian lập PR NVL giảm từ 3–5h xuống <30 phút (verify bằng planner self-report)
- **Stockout prevention**: 0 SKU bị stockout giữa kỳ do không phát hiện DOI thấp
- **Adoption rate**: 100% PR NVL tháng tiếp theo được tạo qua tool (không dùng file Excel thủ công)

---

## Open Questions

| # | Câu hỏi | Owner | Blocking? |
|---|---------|-------|-----------|
| Q1 | MOQ (Minimum Order Quantity) có được chuẩn hóa trong Bang gia không, hay Planner tự nhớ? | Planner | Có – ảnh hưởng F6 |
| Q2 | VAT rate luôn là 8% hay có SKU khác rate? | Finance | Có – ảnh hưởng F3 |
| Q3 | Tên cột trong file WMS export có thay đổi theo version không? | IT/WMS | Có – ảnh hưởng validation |
| Q4 | Có cần hỗ trợ file .xls (Excel 97) hay chỉ .xlsx và .csv? | Planner | Không – có thể convert |
| Q5 | DOI target 30 ngày có đúng cho tất cả kho/SKU, hay khác nhau theo loại hàng? | Operations | Không – v1 dùng 1 target toàn cục |

---

## Timeline Considerations

| Phase | Nội dung | Timeline | Ghi chú |
|-------|---------|----------|---------|
| **v1.0** | Import + Calc engine + Bảng kết quả + Filter + Export Excel | Sprint 1 (1 tuần) | File HTML/JS đơn lẻ, không cần backend |
| **v1.1** | DOI Chart + DOI Target slider + Export PDF | Sprint 2 (1 tuần) | Thêm Chart.js |
| **v2.0** | Statistical forecast + Multi-period + API integration | TBD | Cần backend |

---

## Technical Notes (Implementation)

**Stack v1.0:**
- Single file HTML + vanilla JS (không cần build tool, không cần server)
- SheetJS (xlsx.js) để đọc/ghi Excel
- Chart.js cho biểu đồ DOI
- Tailwind CDN + shadcn-inspired component style (thuần CSS variables)
- Responsive: CSS Grid + Flexbox, breakpoint mobile 375px / tablet 768px

**Key design decisions:**
- State management: vanilla JS object `state = { inventory, aging, pricing, poLines }`
- Table render: phân trang 50 dòng/page để tránh lag trên mobile với 200+ SKU
- Calculation: pure functions, dễ unit test và tái sử dụng trong v2
