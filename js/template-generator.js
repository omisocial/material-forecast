// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Template XLSX Generator
// ══════════════════════════════════════════════════════════════════

// Template header definitions per language
const TEMPLATE_HEADERS = {
  inv: {
    vi: ['SKU', 'Tên sản phẩm', 'Warehouse', 'Opening', 'Inbound', 'Outbound', 'Close'],
    en: ['SKU', 'Product Name', 'Warehouse', 'Opening', 'Inbound', 'Outbound', 'Close'],
    th: ['SKU', 'ชื่อสินค้า', 'คลังสินค้า', 'ยอดเปิด', 'ยอดเข้า', 'ยอดออก', 'คงเหลือ'],
  },
  aging: {
    vi: ['Kho', 'Seller SKU', 'Tên sản phẩm', '< 15 days', '15 to 30 days', '30 to 60 days', '60 to 90 days', '> 90 days'],
    en: ['Warehouse', 'Seller SKU', 'Product Name', '< 15 days', '15 to 30 days', '30 to 60 days', '60 to 90 days', '> 90 days'],
    th: ['คลังสินค้า', 'Seller SKU', 'ชื่อสินค้า', '< 15 วัน', '15 ถึง 30 วัน', '30 ถึง 60 วัน', '60 ถึง 90 วัน', '> 90 วัน'],
  },
  price: {
    vi: ['SKU', 'Tên sản phẩm', 'Đơn giá (-VAT)', 'Số lượng / pack', 'Đơn vị tính'],
    en: ['SKU', 'Product Name', 'Unit Price (-VAT)', 'Qty per Pack', 'Unit'],
    th: ['SKU', 'ชื่อสินค้า', 'ราคาต่อหน่วย (-VAT)', 'จำนวนต่อแพ็ค', 'หน่วย'],
  },
  pending: {
    vi: ['SKU', 'Số lượng', 'NCC', 'Ngày dự kiến', 'Kho'],
    en: ['SKU', 'Quantity', 'Supplier', 'Expected Date', 'Warehouse'],
    th: ['SKU', 'จำนวน', 'ผู้จัดจำหน่าย', 'วันที่คาดว่า', 'คลังสินค้า'],
  }
};

// Sample data for each template type
const TEMPLATE_SAMPLE_DATA = {
  inv: [
    ['PKG-BOX-S', 'Small Box (20x15x10)', 'WH-South', 1500, 200, 800, 900],
    ['PKG-TAPE', 'OPP Tape 48mm', 'WH-North', 3000, 500, 1200, 2300],
  ],
  aging: [
    ['WH-South', 'PKG-BOX-S', 'Small Box (20x15x10)', 300, 250, 200, 100, 50],
    ['WH-North', 'PKG-TAPE', 'OPP Tape 48mm', 800, 600, 500, 250, 150],
  ],
  price: [
    ['PKG-BOX-S', 'Small Box (20x15x10)', 3500, 50, 'Pcs'],
    ['PKG-TAPE', 'OPP Tape 48mm', 25000, 6, 'Roll'],
  ],
  pending: [
    ['PKG-BOX-S', 500, 'NCC A', '2025-04-01', 'WH-South'],
    ['PKG-TAPE', 1000, 'NCC B', '2025-04-05', ''],
  ]
};

/**
 * Generate and download a template XLSX file
 * @param {string} type - 'inv' | 'aging' | 'price'
 */
function generateTemplate(type) {
  if (!TEMPLATE_HEADERS[type]) return;

  const lang = currentLang || 'vi';
  const headers = TEMPLATE_HEADERS[type][lang] || TEMPLATE_HEADERS[type]['en'];
  const sampleRows = TEMPLATE_SAMPLE_DATA[type] || [];

  // Build worksheet data
  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style header row width
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }));
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  const sheetName = type === 'inv' ? 'Inventory' : type === 'aging' ? 'Aging Report' : type === 'pending' ? 'Pending PO' : 'Price List';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate filename
  const typeName = type === 'inv' ? 'inventory' : type === 'aging' ? 'aging' : type === 'pending' ? 'pending_po' : 'price';
  const fileName = `template_${typeName}_${lang}.xlsx`;

  // Download
  XLSX.writeFile(wb, fileName);
  toast(t('btnDownloadTemplate') + ' ✓', 'success');
}
