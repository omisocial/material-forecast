# UX Step-by-Step Redesign — Material Smart

## Mục tiêu
Cải tiến UX thành dạng step-by-step trực quan, dễ hiểu. Giữ nguyên 3 steps, cải tiến nội dung bên trong mỗi step. Không tăng steps dư thừa.

## Nguyên tắc thiết kế
1. **Localize đầy đủ** — Viết từ không viết tắt (DOI → "Số ngày tồn kho", IT → "Vòng quay tồn kho")
2. **Progressive disclosure** — Ẩn dữ liệu phụ, hiện khi cần
3. **Focus on value** — Chỉ hiện cột/dữ liệu có giá trị quyết định

---

## Step 1: Nhập dữ liệu (Import Files)

### Thay đổi chính:
- **Thu gọn Config** → Collapsible "⚙️ Cài đặt nâng cao" (default collapsed)
  - Chỉ hiện 2 tham số chính inline: DOI Target + Mục tiêu tối ưu
  - 7 tham số còn lại (Lead Time, Safety Stock, IT Max, VAT, Kỳ báo cáo, Ngân sách, Seasonal) → ẩn trong panel mở rộng
- **Upload zone** — giữ nguyên layout 3 cards + Pending PO optional
- **Labels localize** — thay tất cả viết tắt bằng từ đầy đủ trong label

### Localize labels (Step 1):
| Hiện tại | Sau khi đổi (VI) | EN |
|----------|------------------|----|
| DOI Target (ngày) | Số ngày tồn kho mục tiêu | Target days of inventory |
| IT tối đa (ngưỡng) | Giới hạn vòng quay tồn kho | Max inventory turnover |
| Lead Time (ngày) | Thời gian giao hàng (ngày) | Delivery lead time (days) |
| Safety Stock (ngày) | Tồn kho dự phòng (ngày) | Safety stock buffer (days) |
| VAT mặc định (%) | Thuế giá trị gia tăng (%) | Value added tax (%) |
| Kỳ báo cáo (ngày) | Chu kỳ phân tích (ngày) | Analysis period (days) |
| Ngân sách tối đa (VND) | Ngân sách tối đa | Budget cap |
| Seasonal Ratio | Hệ số mùa vụ | Seasonal adjustment |

---

## Step 2: Kết quả phân tích (Review Results)

### A. Bảng kết quả — Progressive Disclosure

**Cột chính (luôn hiện) — 7 cột:**

| # | Key | Header (VI) | Header (EN) |
|---|-----|-------------|-------------|
| 1 | kho | Kho | Warehouse |
| 2 | sku | Mã sản phẩm | Product code |
| 3 | name | Tên sản phẩm | Product name |
| 4 | doiAfter | Số ngày tồn kho | Days of inventory |
| 5 | qtyBatch | Số lượng đặt hàng | Order quantity |
| 6 | thanhTien | Thành tiền (đã thuế) | Total (incl. tax) |
| 7 | insight | Gợi ý | Recommendation |

**Cột mở rộng (ẩn, toggle bằng nút "📊 Xem thêm dữ liệu"):**

| Key | Header (VI) | Header (EN) |
|-----|-------------|-------------|
| demand | Nhu cầu 30 ngày | 30-day demand |
| ratioLift | Hệ số mùa vụ | Seasonal factor |
| demandFactor | Hệ số điều chỉnh | Demand adjustment |
| stock | Tồn kho hiện tại | Current inventory |
| pendingQty | Hàng chờ giao | Pending delivery |
| quyCach | Quy cách đóng gói | Pack size |
| slNhap | Số lượng nhập kho | Import quantity |
| donGia | Đơn giá (chưa thuế) | Unit price (excl. tax) |
| it | Vòng quay tồn kho | Inventory turnover |

### B. Toggle UI
- Nút `📊 Xem thêm dữ liệu` / `📊 Thu gọn` trên toolbar
- State lưu vào `localStorage` để nhớ preference

### C. Stats Cards — Localize
| Hiện tại | Sau khi đổi (VI) |
|----------|------------------|
| DOI nguy hiểm | Tồn kho nguy hiểm |
| statTotalSKU | Tổng sản phẩm |
| statTotalValue | Tổng giá trị đơn hàng |
| statNoPrice | Chưa có giá |

---

## Step 3: Xuất đơn hàng (Export PO)

Giữ nguyên (nút Export + Print nằm trong thanh action bar). Step 3 tự động active khi user ở phase results.

---

## Tổng hợp files cần sửa

| File | Thay đổi |
|------|----------|
| `index.html` | Thu gọn config section, thêm toggle button |
| `js/i18n.js` | Cập nhật tất cả labels viết tắt → đầy đủ (3 ngôn ngữ) |
| `js/table-renderer.js` | Chia 2 nhóm cột, toggle show/hide |
| `js/app.js` | Quản lý state expandedColumns, localStorage |
| `css/styles.css` | Style cho collapsible config, toggle button |

## Verification Plan

### Manual Testing
1. Mở `index.html` trên browser → confirm Step 1 config thu gọn
2. Upload 3 files hoặc load demo → confirm bảng chỉ hiện 7 cột chính
3. Bấm "Xem thêm dữ liệu" → confirm 9 cột phụ xuất hiện
4. Bấm "Thu gọn" → confirm trở về 7 cột
5. Reload page → confirm toggle state được nhớ từ localStorage
6. Chuyển ngôn ngữ VI/EN/TH → confirm labels localize đầy đủ, không viết tắt
7. Export Excel → confirm header Excel cũng dùng tên đầy đủ
