// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Table Renderer
// Supports: Pending PO column, Demand Adj Factor column
// ══════════════════════════════════════════════════════════════════

const PAGE_SIZE = 50;

function buildFilterSelects() {
  const khoSelect = document.getElementById('filter-kho');
  if (!khoSelect || !state.results) return;
  const khos = [...new Set(state.results.map(r => r.kho))].sort();
  khoSelect.innerHTML = `<option value="">${t('allKho')}</option>` + khos.map(k => `<option value="${k}">${k}</option>`).join('');

  const doiSelect = document.getElementById('filter-doi');
  if (doiSelect) {
    doiSelect.innerHTML = `<option value="">${t('allDOI')}</option>
      <option value="danger">${t('doiDanger')}</option>
      <option value="warn">${t('doiWarn')}</option>
      <option value="ok">${t('doiOk')}</option>`;
  }

  const needSelect = document.getElementById('filter-need');
  if (needSelect) {
    needSelect.innerHTML = `<option value="">${t('allOrder')}</option>
      <option value="yes">${t('needOrder')}</option>
      <option value="no">${t('noOrder')}</option>`;
  }
}

function renderSummary() {
  const r = state.results;
  if (!r || r.length === 0) return;

  const needOrder = r.filter(x => x.qtyBatch > 0);
  const dangerDOI = r.filter(x => x.doiAfter < 20 && x.qtyBatch > 0);
  const totalValue = needOrder.reduce((s, x) => s + x.thanhTien, 0);
  const noPrice = needOrder.filter(x => !x.hasPrice);
  const hasPending = (state.pendingPO || []).length > 0;
  const totalPending = hasPending ? r.reduce((s, x) => s + (x.pendingQty || 0), 0) : 0;

  const khos = [...new Set(r.map(x => x.kho))];
  const locale = t('locale');

  document.getElementById('stat-total').innerHTML = `<div class="stat-label">${t('statTotalSKU')} ${tipIcon('tipStatTotal')}</div>
    <div class="stat-value">${r.length}</div>
    <div class="stat-sub">${needOrder.length} ${t('statNeedOrder')}</div>`;

  document.getElementById('stat-danger').innerHTML = `<div class="stat-label">${t('statDangerDOI')} ${tipIcon('tipStatDanger')}</div>
    <div class="stat-value" style="color:var(--danger)">${dangerDOI.length}</div>
    <div class="stat-sub">${t('statDangerSub')}</div>`;

  document.getElementById('stat-value').innerHTML = `<div class="stat-label">${t('statTotalValue')} ${tipIcon('tipStatValue')}</div>
    <div class="stat-value">${new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(totalValue)}</div>
    <div class="stat-sub">${khos.length} ${t('statAllKho')}</div>`;

  document.getElementById('stat-noprice').innerHTML = `<div class="stat-label">${t('statNoPrice')} ${tipIcon('tipStatNoPrice')}</div>
    <div class="stat-value" style="color:${noPrice.length ? 'var(--warn)' : 'var(--success)'}">${noPrice.length}</div>
    <div class="stat-sub">${t('statNoPriceSub')}</div>`;

  // Pending PO stat card (only show if there's pending data)
  const pendingStat = document.getElementById('stat-pending');
  if (pendingStat) {
    if (hasPending) {
      pendingStat.classList.remove('hidden');
      pendingStat.innerHTML = `<div class="stat-label">${t('statPending')} ${tipIcon('tipPending')}</div>
        <div class="stat-value" style="color:var(--primary)">${new Intl.NumberFormat(locale).format(totalPending)}</div>
        <div class="stat-sub">${t('statPendingSub')}</div>`;
    } else {
      pendingStat.classList.add('hidden');
    }
  }
}

function renderAlerts() {
  const r = state.results;
  if (!r) return;
  const alerts = document.getElementById('alerts');
  let html = '';

  const danger = r.filter(x => x.doiAfter < 20 && x.qtyBatch > 0);
  if (danger.length) {
    html += `<div class="alert alert-danger"><span>⚠️</span><div>${t('alertDanger', { n: danger.length })}<br><strong>${danger.slice(0, 5).map(x => x.sku).join(', ')}${danger.length > 5 ? '...' : ''}</strong></div></div>`;
  }

  const itMax = state.itMax;
  const itOver = r.filter(x => x.it > itMax && x.qtyBatch > 0);
  if (itOver.length) {
    html += `<div class="alert alert-warn"><span>📊</span><div>${t('alertITExceed', { n: itOver.length, max: itMax })}</div></div>`;
  }

  const needNoPrice = r.filter(x => x.qtyBatch > 0 && !x.hasPrice);
  if (needNoPrice.length) {
    html += `<div class="alert alert-warn"><span>💰</span><div>${t('alertNoPrice', { n: needNoPrice.length })}</div></div>`;
  }

  const noDemand = r.filter(x => x.demand === 0);
  if (noDemand.length) {
    html += `<div class="alert alert-info"><span>ℹ️</span><div>${t('alertNoDemand', { n: noDemand.length })}</div></div>`;
  }

  alerts.innerHTML = html;
}

function renderTable() {
  const data = state.filteredResults || [];
  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.currentPage = Math.min(state.currentPage, pages);
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const slice = data.slice(start, start + PAGE_SIZE);
  const locale = t('locale');
  const fmt = v => new Intl.NumberFormat(locale).format(v);
  const fmtCur = v => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v);
  const hasPending = (state.pendingPO || []).length > 0;

  // DOI helper
  const doiClass = v => v < 20 ? 'doi-red' : v < 30 ? 'doi-yellow' : v < 60 ? 'doi-green' : 'doi-blue';

  const itMax = state.itMax;

  let html = '<table class="table"><thead><tr>';
  // Tooltip mapping for columns
  const colTips = { demand: 'tipDemand', qtyBatch: 'tipBatch', doiAfter: 'tipDOI', it: 'tipIT', thanhTien: 'tipThanhTien', pendingQty: 'tipPending', demandFactor: 'tipFactor' };

  const cols = [
    ['kho', t('thKho')], ['name', t('thName')], ['sku', 'SKU'],
    ['demand', t('thDemand')], ['demandFactor', t('thFactor')],
    ['stock', t('thInventory')],
  ];
  // Conditionally add Pending column
  if (hasPending) {
    cols.push(['pendingQty', t('thPending')]);
  }
  cols.push(
    ['qtyBatch', t('thBatch')], ['quyCach', t('thQuyCach')],
    ['slNhap', t('thSLNhap')], ['donGia', t('thDonGia')],
    ['thanhTien', t('thThanhTien')], ['doiAfter', t('thDOI')], ['it', t('thIT')]
  );

  cols.forEach(([col, label]) => {
    const sorted = state.sortCol === col;
    const arrow = sorted ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    const tip = colTips[col] ? ` ${tipIcon(colTips[col])}` : '';
    html += `<th class="${sorted ? 'sorted' : ''}" onclick="sortTable('${col}')">${label}${tip}${arrow}</th>`;
  });
  html += '</tr></thead><tbody>';

  slice.forEach((r, i) => {
    const globalIdx = start + i;
    const rowClass = r.doiAfter < 20 && r.qtyBatch > 0 ? 'danger' : r.doiAfter < 30 && r.qtyBatch > 0 ? 'warn' : '';
    const dc = doiClass(r.doiAfter);
    const changedClass = r.qtyBatch !== r.suggestedBatch ? 'qty-changed' : '';
    const factorChanged = (r.demandFactor || 1.0) !== 1.0;

    html += `<tr class="${rowClass}">
      <td><span class="badge badge-blue">${r.kho}</span></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.name}">${r.name}</td>
      <td><code style="font-size:.75rem">${r.sku}</code></td>
      <td style="text-align:right">${fmt(r.demand)}</td>
      <td><input type="number" class="factor-input ${factorChanged ? 'factor-changed' : ''}" value="${r.demandFactor || 1.0}" min="0" max="5" step="0.05" onchange="onFactorChange(${globalIdx},this.value)"></td>
      <td style="text-align:right">${fmt(r.stock)}</td>`;

    // Pending column (only if pending data exists)
    if (hasPending) {
      const pq = r.pendingQty || 0;
      html += `<td style="text-align:right;color:${pq > 0 ? 'var(--primary)' : 'var(--text-sm)'}">${pq > 0 ? fmt(pq) : '—'}</td>`;
    }

    html += `<td><input type="number" class="qty-input ${changedClass}" value="${r.qtyBatch}" min="0" onchange="onQtyChange(${globalIdx},this.value)"></td>
      <td style="text-align:center">${r.quyCach}${r.donVi ? '/' + r.donVi : ''}</td>
      <td style="text-align:right">${fmt(r.slNhap)}</td>
      <td style="text-align:right">${r.hasPrice ? fmtCur(r.donGia) : '<span class="badge badge-yellow">' + t('noPriceBadge') + '</span>'}</td>
      <td style="text-align:right;font-weight:600">${r.hasPrice ? fmtCur(r.thanhTien) : '—'}</td>
      <td><span class="doi-cell ${dc}"><span class="doi-dot"></span>${r.doiAfter}</span></td>
      <td style="text-align:right;${r.it > itMax ? 'color:var(--danger);font-weight:600' : ''}">${r.it}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  document.getElementById('table-body').innerHTML = html;

  // Table info
  document.getElementById('table-info').textContent = t('tableInfo', { total, page: state.currentPage, pages });

  // Pagination
  let pgHtml = '';
  if (pages > 1) {
    pgHtml += `<button class="page-btn" onclick="goPage(${state.currentPage - 1})" ${state.currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    for (let p = 1; p <= pages; p++) {
      if (pages > 7 && Math.abs(p - state.currentPage) > 2 && p !== 1 && p !== pages) {
        if (p === 2 || p === pages - 1) pgHtml += '<span style="padding:0 .25rem;color:var(--text-sm)">…</span>';
        continue;
      }
      pgHtml += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    }
    pgHtml += `<button class="page-btn" onclick="goPage(${state.currentPage + 1})" ${state.currentPage === pages ? 'disabled' : ''}>›</button>`;
  }
  document.getElementById('pagination').innerHTML = pgHtml;

  // Init tooltips on newly rendered content
  initTooltips();
}

function goPage(p) {
  const pages = Math.max(1, Math.ceil((state.filteredResults || []).length / PAGE_SIZE));
  if (p < 1 || p > pages) return;
  state.currentPage = p;
  renderTable();
  document.getElementById('table-body').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onFilterChange() {
  state.filteredResults = filterAndSort(state.results);
  state.currentPage = 1;
  renderTable();
}
