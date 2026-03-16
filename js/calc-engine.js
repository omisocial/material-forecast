// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Calculation Engine
// ══════════════════════════════════════════════════════════════════

function runCalculation() {
  const inv = state.inv, aging = state.aging, price = state.price;
  const period = state.period, doiTarget = state.doiTarget, vat = state.vat;

  // Build price map: SKU → { donGia, quyCach, donVi }
  const priceMap = {};
  price.forEach(r => {
    const sku = String(r.SKU).trim();
    if (!sku) return;
    priceMap[sku] = { donGia: parseFloat(r['Đơn giá (-VAT)']) || 0, quyCach: parseFloat(r['Số lượng / pack']) || 1, donVi: r['Đơn vị tính'] || '' };
  });

  // Build aging map: SKU|Kho → agingBuckets
  const agingMap = {};
  aging.forEach(r => {
    const sku = String(r['Seller SKU']).trim();
    const kho = String(r['Kho']).trim();
    if (!sku) return;
    const key = sku + '|' + kho;
    const buckets = {};
    for (const [k, v] of Object.entries(r)) {
      if (k === 'Seller SKU' || k === 'Kho' || k === 'Tên sản phẩm' || k === 'Product name') continue;
      if (typeof v === 'number' || !isNaN(Number(v))) {
        buckets[k] = parseFloat(v) || 0;
      }
    }
    agingMap[key] = buckets;
  });

  // Build result rows
  const results = [];
  inv.forEach(r => {
    const sku = String(r.SKU).trim();
    if (!sku) return;
    const kho = String(r.Warehouse || r.Kho || '').trim();
    const demand = parseFloat(r.Outbound) || 0;
    const stock = parseFloat(r.Close) || 0;
    const name = r['Product name'] || sku;

    const dailyDemand = demand / period;
    const doiFact = dailyDemand > 0 ? stock / dailyDemand : 999;
    const doiFactRound = Math.round(doiFact * 10) / 10;

    // PO quantity based on DOI target
    let suggestedBatch = Math.max(0, Math.round(dailyDemand * doiTarget - stock));
    if (demand === 0) suggestedBatch = 0;

    // Price info
    const pi = priceMap[sku] || null;
    const donGia = pi ? pi.donGia : 0;
    const quyCach = pi ? pi.quyCach : 1;
    const donVi = pi ? pi.donVi : '';
    const slNhap = quyCach > 0 ? Math.ceil(suggestedBatch / quyCach) : suggestedBatch;
    const thanhTien = donGia * slNhap * quyCach * (1 + vat / 100);

    // Inventory turnover
    const avgInventory = 0.5 * (stock + stock + suggestedBatch); // Approx
    const it = avgInventory > 0 ? (demand / avgInventory) : 0;
    const itRound = Math.round(it * 100) / 100;

    // DOI after PO
    const newStock = stock + suggestedBatch;
    const doiAfter = dailyDemand > 0 ? newStock / dailyDemand : 999;

    // Pending inventory (from aging)
    const agingKey = sku + '|' + kho;
    const aBuckets = agingMap[agingKey] || {};
    const pendingInv = Object.values(aBuckets).reduce((a, b) => a + b, 0);

    // 25 days check
    const outbound25 = Math.round(dailyDemand * 25);

    results.push({
      kho, sku, name, demand, stock,
      suggestedBatch, qtyBatch: suggestedBatch,
      quyCach, donVi, slNhap,
      donGia, thanhTien,
      doiFact: doiFactRound, doiAfter: Math.round(doiAfter * 10) / 10,
      it: itRound,
      pendingInv,
      outbound25,
      hasPrice: !!pi,
      dailyDemand,
    });
  });

  state.results = results;
  state.filteredResults = [...results];
  state.currentPage = 1;
  state.sortCol = '';
  state.sortDir = 'asc';
}

function recalcRow(row) {
  const demand = row.demand, period = state.period, vat = state.vat;
  const dailyDemand = demand / period;
  const quyCach = row.quyCach || 1;
  row.slNhap = quyCach > 0 ? Math.ceil(row.qtyBatch / quyCach) : row.qtyBatch;
  row.thanhTien = row.donGia * row.slNhap * quyCach * (1 + vat / 100);
  const newStock = row.stock + row.qtyBatch;
  row.doiAfter = dailyDemand > 0 ? Math.round(newStock / dailyDemand * 10) / 10 : 999;
  const avgInv = 0.5 * (row.stock + newStock);
  row.it = avgInv > 0 ? Math.round(row.demand / avgInv * 100) / 100 : 0;
}

function applyDOI() {
  state.results.forEach(r => {
    const daily = r.demand / state.period;
    r.qtyBatch = Math.max(0, Math.round(daily * state.doiTarget - r.stock));
    if (r.demand === 0) r.qtyBatch = 0;
    recalcRow(r);
  });
  state.filteredResults = filterAndSort(state.results);
  renderSummary(); renderAlerts(); renderTable();
  toast(t('toastAppliedDOI'), 'success');
}

function resetQty() {
  state.results.forEach(r => {
    r.qtyBatch = r.suggestedBatch;
    recalcRow(r);
  });
  state.filteredResults = filterAndSort(state.results);
  renderSummary(); renderAlerts(); renderTable();
  toast(t('toastReset'), 'info');
}

function filterAndSort(data) {
  let out = data;
  const fKho = document.getElementById('filter-kho').value;
  const fDOI = document.getElementById('filter-doi').value;
  const fNeed = document.getElementById('filter-need').value;
  const fSearch = document.getElementById('filter-search').value.toLowerCase();

  if (fKho) out = out.filter(r => r.kho === fKho);
  if (fDOI === 'danger') out = out.filter(r => r.doiAfter < 20);
  else if (fDOI === 'warn') out = out.filter(r => r.doiAfter >= 20 && r.doiAfter < 30);
  else if (fDOI === 'ok') out = out.filter(r => r.doiAfter >= 30);
  if (fNeed === 'yes') out = out.filter(r => r.qtyBatch > 0);
  else if (fNeed === 'no') out = out.filter(r => r.qtyBatch === 0);
  if (fSearch) out = out.filter(r => r.sku.toLowerCase().includes(fSearch) || r.name.toLowerCase().includes(fSearch));

  if (state.sortCol) {
    const dir = state.sortDir === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      let va = a[state.sortCol], vb = b[state.sortCol];
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return ((va || 0) - (vb || 0)) * dir;
    });
  }
  return out;
}

function onQtyChange(idx, value) {
  const r = state.filteredResults[idx];
  if (!r) return;
  r.qtyBatch = Math.max(0, parseInt(value) || 0);
  recalcRow(r);
  renderSummary(); renderAlerts(); renderTable();
}

function sortTable(col) {
  if (state.sortCol === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  else { state.sortCol = col; state.sortDir = 'asc'; }
  state.filteredResults = filterAndSort(state.results);
  state.currentPage = 1;
  renderTable();
}
