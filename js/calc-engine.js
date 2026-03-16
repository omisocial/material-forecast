// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Calculation Engine
// Supports: Pending PO, Demand Adjustment Factor
// ══════════════════════════════════════════════════════════════════

/**
 * Build a pending PO map from state.pendingPO
 * If warehouse is missing on a pending row, auto-allocate pro-rata by demand ratio
 * Returns: Map<"SKU|Kho", qty>
 */
function buildPendingMap(invData, period) {
  const pendingMap = {};
  const pendingData = state.pendingPO || [];
  if (!pendingData.length) return pendingMap;

  // Build demand ratio per SKU per warehouse (for auto-allocation)
  const demandBySKU = {}; // SKU → { total, byWH: { kho: demand } }
  invData.forEach(r => {
    const sku = String(r.SKU).trim();
    const kho = String(r.Warehouse || r.Kho || '').trim();
    const demand = parseFloat(r.Outbound) || 0;
    if (!sku) return;
    if (!demandBySKU[sku]) demandBySKU[sku] = { total: 0, byWH: {} };
    demandBySKU[sku].total += demand;
    demandBySKU[sku].byWH[kho] = (demandBySKU[sku].byWH[kho] || 0) + demand;
  });

  pendingData.forEach(p => {
    const sku = String(p.sku).trim();
    const qty = parseFloat(p.qty) || 0;
    if (!sku || qty <= 0) return;

    if (p.warehouse && String(p.warehouse).trim()) {
      // Has warehouse → direct assignment
      const key = sku + '|' + String(p.warehouse).trim();
      pendingMap[key] = (pendingMap[key] || 0) + qty;
    } else {
      // No warehouse → auto-allocate by demand ratio
      const dInfo = demandBySKU[sku];
      if (dInfo && dInfo.total > 0) {
        for (const [kho, whDemand] of Object.entries(dInfo.byWH)) {
          const ratio = whDemand / dInfo.total;
          const allocated = Math.round(qty * ratio);
          const key = sku + '|' + kho;
          pendingMap[key] = (pendingMap[key] || 0) + allocated;
        }
      } else {
        // No demand data → assign to generic key, will be picked up if any match
        const key = sku + '|_unallocated';
        pendingMap[key] = (pendingMap[key] || 0) + qty;
      }
    }
  });

  return pendingMap;
}

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

  // Build pending PO map
  const pendingMap = buildPendingMap(inv, period);

  // Build result rows
  const results = [];
  inv.forEach(r => {
    const sku = String(r.SKU).trim();
    if (!sku) return;
    const kho = String(r.Warehouse || r.Kho || '').trim();
    const demand = parseFloat(r.Outbound) || 0;
    const stock = parseFloat(r.Close) || 0;
    const name = r['Product name'] || sku;

    // Pending PO qty for this SKU+Warehouse
    const pendingKey = sku + '|' + kho;
    const pendingQty = (pendingMap[pendingKey] || 0) + (pendingMap[sku + '|_unallocated'] || 0);

    // Adjusted inventory includes pending
    const adjustedStock = stock + pendingQty;

    // Demand factor (default 1.0)
    const demandFactor = 1.0;
    const adjustedDemand = demand * demandFactor;
    const dailyDemand = adjustedDemand / period;

    const doiFact = dailyDemand > 0 ? stock / dailyDemand : 999;
    const doiFactRound = Math.round(doiFact * 10) / 10;

    // PO quantity based on DOI target (uses adjusted stock)
    let suggestedBatch = Math.max(0, Math.round(dailyDemand * doiTarget - adjustedStock));
    if (adjustedDemand === 0) suggestedBatch = 0;

    // Price info
    const pi = priceMap[sku] || null;
    const donGia = pi ? pi.donGia : 0;
    const quyCach = pi ? pi.quyCach : 1;
    const donVi = pi ? pi.donVi : '';
    const slNhap = quyCach > 0 ? Math.ceil(suggestedBatch / quyCach) : suggestedBatch;
    const thanhTien = donGia * slNhap * quyCach * (1 + vat / 100);

    // Inventory turnover
    const avgInventory = 0.5 * (adjustedStock + adjustedStock + suggestedBatch); // Approx
    const it = avgInventory > 0 ? (adjustedDemand / avgInventory) : 0;
    const itRound = Math.round(it * 100) / 100;

    // DOI after PO (includes pending)
    const newStock = adjustedStock + suggestedBatch;
    const doiAfter = dailyDemand > 0 ? newStock / dailyDemand : 999;

    // Aging pending inventory
    const agingKey = sku + '|' + kho;
    const aBuckets = agingMap[agingKey] || {};
    const pendingInv = Object.values(aBuckets).reduce((a, b) => a + b, 0);

    // 25 days check
    const outbound25 = Math.round(dailyDemand * 25);

    results.push({
      kho, sku, name, demand, stock,
      pendingQty,          // NEW: Pending PO qty
      adjustedStock,       // NEW: stock + pendingQty
      demandFactor,        // NEW: Demand adjustment factor (default 1.0)
      adjustedDemand,      // NEW: demand * factor
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
  const period = state.period, vat = state.vat;
  const factor = row.demandFactor || 1.0;
  const adjustedDemand = row.demand * factor;
  const dailyDemand = adjustedDemand / period;
  const adjustedStock = row.stock + (row.pendingQty || 0);

  row.adjustedDemand = adjustedDemand;
  row.dailyDemand = dailyDemand;
  row.adjustedStock = adjustedStock;

  const quyCach = row.quyCach || 1;
  row.slNhap = quyCach > 0 ? Math.ceil(row.qtyBatch / quyCach) : row.qtyBatch;
  row.thanhTien = row.donGia * row.slNhap * quyCach * (1 + vat / 100);
  const newStock = adjustedStock + row.qtyBatch;
  row.doiAfter = dailyDemand > 0 ? Math.round(newStock / dailyDemand * 10) / 10 : 999;
  const avgInv = 0.5 * (adjustedStock + newStock);
  row.it = avgInv > 0 ? Math.round(adjustedDemand / avgInv * 100) / 100 : 0;
}

function applyDOI() {
  state.results.forEach(r => {
    const factor = r.demandFactor || 1.0;
    const adjustedDemand = r.demand * factor;
    const daily = adjustedDemand / state.period;
    const adjustedStock = r.stock + (r.pendingQty || 0);
    r.qtyBatch = Math.max(0, Math.round(daily * state.doiTarget - adjustedStock));
    if (adjustedDemand === 0) r.qtyBatch = 0;
    recalcRow(r);
  });
  state.filteredResults = filterAndSort(state.results);
  renderSummary(); renderAlerts(); renderTable();
  toast(t('toastAppliedDOI'), 'success');
}

function resetQty() {
  state.results.forEach(r => {
    r.demandFactor = 1.0;
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

function onFactorChange(idx, value) {
  const r = state.filteredResults[idx];
  if (!r) return;
  r.demandFactor = Math.max(0, parseFloat(value) || 1.0);
  // Recalc suggested batch with new factor
  const adjustedDemand = r.demand * r.demandFactor;
  const daily = adjustedDemand / state.period;
  const adjustedStock = r.stock + (r.pendingQty || 0);
  r.qtyBatch = Math.max(0, Math.round(daily * state.doiTarget - adjustedStock));
  if (adjustedDemand === 0) r.qtyBatch = 0;
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
