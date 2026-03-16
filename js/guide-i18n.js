// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Guide i18n Module
// ══════════════════════════════════════════════════════════════════

const translations = {
  vi: {
    appTitle: 'Material Smart',
    heroBadge: 'Giới thiệu công cụ',
    heroTitle: 'Đừng đếm Excel thủ công nữa.',
    heroDesc: 'Material Smart tự động đồng bộ tồn kho, aging report, và demand để đưa ra mức đặt hàng tối ưu chuẩn DOI. Tính toán chính xác số lượng PO bạn cần chỉ trong vài giây.',
    btnOpenApp: 'Mở Material Smart →',
    
    // Problems
    probTitle: 'Giải Quyết Nỗi Đau Mua Hàng',
    prob1Title: 'Thiếu Hàng Cục Bộ',
    prob1Desc: 'Không còn tình trạng "out-of-stock" do quên đặt hàng. Hệ thống cảnh báo tự động các mã sắp hết.',
    prob2Title: 'Tồn Kho Ảo (Dead Stock)',
    prob2Desc: 'Kiểm soát chặt Inventory Turnover (IT). Tránh tình trạng đặt batch quá lớn so với tốc độ bán.',
    prob3Title: 'Tính Toán Sai Lệch',
    prob3Desc: 'Loại bỏ sai sót do kéo công thức VLOOKUP thủ công trên file Excel hàng vạn dòng.',

    // How it works
    howTitle: 'Quy Trình 3 Bước Đơn Giản',
    step1Title: '1. Import 3 Báo Cáo',
    step1Desc: 'Upload file Inventory 30 days, Aging Report và Bảng giá. Hệ thống tự nhận diện cột.',
    step2Title: '2. Review & Điều Chỉnh',
    step2Desc: 'Xem gợi ý Batch đặt hàng. Điểu chỉnh lại số lượng nếu có thông tin đặc biệt.',
    step3Title: '3. Xuất PO Excel',
    step3Desc: 'Chỉ 1 click để tải về file Excel chuẩn form PO, sẵn sàng gửi ngay cho Supplier.',

    // Methodology
    methTitle: 'Phương Pháp Tính Toán',
    methDOILabel: 'DOI (Days of Inventory)',
    methDOIDesc: 'Số ngày tồn kho mục tiêu. Hệ thống sẽ gợi ý Batch sao cho Tồn kho + Pending PO + Batch đảm bảo đủ bán trong số ngày này dựa trên Demand 30 ngày qua.',
    methITLabel: 'IT (Inventory Turnover)',
    methITDesc: 'Vòng quay hàng tồn kho. Hệ thống cảnh báo nếu bạn đặt Batch quá lớn khiến chỉ số IT vượt mức an toàn, gây ứ đọng vốn.',

    footerText: 'Phát triển bởi Boxme'
  },
  en: {
    appTitle: 'Material Smart',
    heroBadge: 'Introducing the tool',
    heroTitle: 'Stop manually counting Excel rows.',
    heroDesc: 'Material Smart automatically synchronizes inventory, aging reports, and demand to propose optimal DOI-standard orders. Calculate exact PO quantities in seconds.',
    btnOpenApp: 'Open Material Smart →',
    
    // Problems
    probTitle: 'Solving Purchasing Pains',
    prob1Title: 'Stockouts',
    prob1Desc: 'No more "out-of-stock" situations due to forgotten orders. Automated alerts for low stock items.',
    prob2Title: 'Dead Stock',
    prob2Desc: 'Strictly control Inventory Turnover (IT). Prevent ordering batches that are too large for your sales velocity.',
    prob3Title: 'Calculation Errors',
    prob3Desc: 'Eliminate mistakes from dragging manual VLOOKUP formulas across massive Excel spreadsheets.',

    // How it works
    howTitle: 'Simple 3-Step Process',
    step1Title: '1. Import 3 Reports',
    step1Desc: 'Upload Inventory 30 days, Aging Report, and Price List. The system auto-detects columns.',
    step2Title: '2. Review & Adjust',
    step2Desc: 'Review the suggested order Batch. Adjust quantities manually if there is special context.',
    step3Title: '3. Export PO Excel',
    step3Desc: 'One click to download a standard PO Excel file, ready to be sent to the Supplier.',

    // Methodology
    methTitle: 'Calculation Methodology',
    methDOILabel: 'DOI (Days of Inventory)',
    methDOIDesc: 'Target days of inventory. The system suggests a Batch so that Stock + Pending PO + Batch covers consumption for this many days based on 30-day Demand.',
    methITLabel: 'IT (Inventory Turnover)',
    methITDesc: 'Inventory turnover rate. The system warns you if your Batch is too large, causing the IT index to exceed safe thresholds and tying up capital.',

    footerText: 'Developed by Boxme'
  },
  th: {
    appTitle: 'Material Smart',
    heroBadge: 'แนะนำเครื่องมือ',
    heroTitle: 'หยุดนับยอดใน Excel ด้วยตนเอง',
    heroDesc: 'Material Smart จะซิงโครไนซ์สินค้าคงคลัง รายงานอายุสินค้า และความต้องการโดยอัตโนมัติ เพื่อเสนอคำสั่งซื้อตามมาตรฐาน DOI ที่เหมาะสม คำนวณปริมาณ PO ที่แน่นอนในไม่กี่วินาที',
    btnOpenApp: 'เปิด Material Smart →',
    
    // Problems
    probTitle: 'แก้ไขปัญหาในการจัดซื้อ',
    prob1Title: 'สินค้าขาดสต็อก',
    prob1Desc: 'ไม่มีปัญหาสินค้าหมดเพราะลืมสั่งซื้ออีกต่อไป ระบบจะแจ้งเตือนอัตโนมัติสำหรับสินค้าใกล้หมด',
    prob2Title: 'สต็อกจม (Dead Stock)',
    prob2Desc: 'ควบคุม Inventory Turnover (IT) อย่างเข้มงวด ป้องกันการสั่งล็อตที่ใหญ่เกินความเร็วในการขาย',
    prob3Title: 'ข้อผิดพลาดในการคำนวณ',
    prob3Desc: 'ขจัดข้อผิดพลาดจากการลากสูตร VLOOKUP ใน Excel ที่มีข้อมูลมหาศาล',

    // How it works
    howTitle: 'กระบวนการ 3 ขั้นตอนง่ายๆ',
    step1Title: '1. นำเข้า 3 รายงาน',
    step1Desc: 'อัปโหลดรายงาน Inventory 30 days, Aging Report และรายการราคา ระบบตรวจจับคอลัมน์อัตโนมัติ',
    step2Title: '2. ตรวจสอบและปรับปรุง',
    step2Desc: 'ตรวจสอบยอดล็อตที่แนะนำ สามารถปรับเพิ่มลดตามสถานการณ์พิเศษได้',
    step3Title: '3. ส่งออก PO Excel',
    step3Desc: 'คลิกเดียวดาวน์โหลดไฟล์ PO Excel มาตรฐาน พร้อมส่งต่อให้ซัพพลายเออร์ทันที',

    // Methodology
    methTitle: 'วิธีการคำนวณ',
    methDOILabel: 'DOI (Days of Inventory)',
    methDOIDesc: 'จำนวนวันสินค้าคงคลังเป้าหมาย ระบบจะแนะนำล็อตเพื่อให้ ยอดคงเหลือ + PO รอส่ง + ล็อต เพียงพอสำหรับการขายตามจำนวนวันนี้อิงจากความต้องการ 30 วันที่ผ่านมา',
    methITLabel: 'IT (Inventory Turnover)',
    methITDesc: 'อัตราการหมุนเวียนสินค้าคงคลัง ระบบจะเตือนหากสั่งล็อตใหญ่เกินไปจนทำให้เกณฑ์ IT เกินค่าที่ปลอดภัยและทำให้เงินทุนจม',

    footerText: 'พัฒนาโดย Boxme'
  }
};

let currentLang = localStorage.getItem('nvl-lang') || 'vi';

function t(key, vars) {
  let s = (translations[currentLang] || translations.vi)[key] || key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.replace(new RegExp('{' + k + '}', 'g'), vars[k]);
    }
  }
  return s;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('nvl-lang', lang);
  document.documentElement.lang = lang;
  
  // Update buttons
  ['vi', 'en', 'th'].forEach(l => {
    const btn = document.getElementById('lang-' + l);
    if (btn) btn.classList.toggle('active', l === lang);
  });
  
  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
});
