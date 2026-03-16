// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Export Module
// Supports: Pending PO qty, Demand Factor, Adjusted Demand
// ══════════════════════════════════════════════════════════════════

function exportExcel() {
  const data = state.filteredResults || [];
  if (!data.length) return;
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
  const cols = t('exportCols');

  const rows = [
    // Header rows
    [t('exportCompany')],
    [t('exportTitle', { month })],
    [],
    cols
  ];

  // Group by warehouse dynamically (sorted alphabetically)
  const warehouses = [...new Set(data.map(r => r.kho))].sort();
  warehouses.forEach(kho => {
    data.filter(r => r.kho === kho && r.qtyBatch > 0).forEach(r => {
      rows.push([
        '', // PO No
        r.kho,
        '', // Supplier
        r.sku,
        r.name,
        r.qtyBatch, // Batch
        r.quyCach, // Pack size
        r.donVi, // Unit
        r.slNhap, // Import qty
        r.donGia, // Unit price
        r.donGia * r.slNhap * r.quyCach, // Amount -VAT
        state.vat + '%', // VAT
        r.thanhTien, // Amount +VAT
        r.demand, // Demand
        r.demandFactor || 1.0, // Demand Factor
        Math.round(r.adjustedDemand || r.demand), // Adjusted Demand
        r.it, // IT
        r.pendingQty || 0, // Pending PO Qty
        r.pendingInv, // Pending Inventory (from Aging)
        r.stock, // Inventory
        r.doiAfter, // DOI
        r.outbound25, // 25d outbound
        r.doiAfter < 20 ? '⚠️ Urgent' : '', // Notes
      ]);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Styling - column widths
  ws['!cols'] = cols.map((_, i) => ({ wch: i === 4 ? 30 : i === 3 ? 18 : 14 }));

  // Merge company name row
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'PO');

  const filename = `PO_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast(t('toastExported'), 'success');
}

function printReport() {
  window.print();
}
