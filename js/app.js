// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — App Orchestrator
// ══════════════════════════════════════════════════════════════════

// Central state object
const state = {
  inv: [], aging: [], price: [],
  pendingPO: [],                // NEW: Pending PO data
  results: [], filteredResults: [],
  filesReady: { inv: false, aging: false, price: false },
  doiTarget: 45, itMax: 6, vat: 8, period: 30,
  leadTime: 7, safetyStock: 3, budgetCap: 0, // NEW: Smart parameters
  optimizationGoal: 'balance',              // NEW: 'balance' or 'min_cost'
  showExpandedCols: false,                  // Progressive disclosure
  currentPage: 1, sortCol: '', sortDir: 'asc',
  _parseData: {},
};

// ── Toggle: Advanced Config ─────────────────────────────────────
function toggleAdvancedConfig() {
  const btn = document.getElementById('btn-config-toggle');
  const panel = document.getElementById('config-advanced');
  const isOpen = panel.classList.toggle('expanded');
  btn.classList.toggle('expanded', isOpen);
}

// ── Toggle: Expanded Columns ────────────────────────────────────
function toggleExpandedCols() {
  state.showExpandedCols = !state.showExpandedCols;
  localStorage.setItem('ms_expandedCols', state.showExpandedCols ? '1' : '0');
  renderTable(state);
}

// ── Toast notifications ─────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ── Config Management ───────────────────────────────────────────
function loadConfig() {
  ['doiTarget', 'itMax', 'vat', 'period', 'leadTime', 'safetyStock', 'budgetCap'].forEach(k => {
    const el = document.getElementById('cfg-' + k);
    if (el) {
      state[k] = parseFloat(el.value) || state[k];
      el.addEventListener('change', () => {
        state[k] = parseFloat(el.value) || state[k];
        if (state.results.length) { applyDOI(); }
      });
    }
  });

  // Load expanded columns preference
  state.showExpandedCols = localStorage.getItem('ms_expandedCols') === '1';

  // Handle Goal Selector
  const goalBtns = document.querySelectorAll('.goal-btn');
  goalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      goalBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.optimizationGoal = btn.dataset.goal;
      if (state.results.length) { applyDOI(); }
    });
  });
}

// ── Demo Data (sample only — actual warehouses come from import files) ──
function loadDemo() {
  // Mix of warehouse names to demonstrate multi-country flexibility
  const khos = ['WH-South', 'WH-North', 'WH-Central', 'WH-East'];
  const skus = ['PKG-BOX-S', 'PKG-BOX-M', 'PKG-BOX-L', 'PKG-TAPE', 'PKG-WRAP', 'PKG-LABEL'];
  const names = ['Small Box (20x15x10)', 'Medium Box (30x25x20)', 'Large Box (40x30x25)', 'OPP Tape 48mm', 'Bubble Wrap 1m x 100m', 'Thermal Label 100x70'];

  state.inv = [];
  state.aging = [];

  khos.forEach(kho => {
    skus.forEach((sku, idx) => {
      const demand = Math.round(500 + Math.random() * 2000);
      const stock = Math.round(200 + Math.random() * 1500);
      state.inv.push({
        SKU: sku, 'Product name': names[idx],
        Opening: stock + Math.round(Math.random() * 200),
        Inbound: Math.round(Math.random() * 500), Return: 0,
        Outbound: demand, Close: stock,
        Warehouse: kho, _rawWarehouse: kho,
      });
      state.aging.push({
        'Kho': kho, 'Seller SKU': sku,
        '< 15 days': Math.round(stock * 0.3),
        '15 to 30 days': Math.round(stock * 0.25),
        '30 to 60 days': Math.round(stock * 0.2),
        '60 to 90 days': Math.round(stock * 0.15),
        '> 90 days': Math.round(stock * 0.1)
      });
    });
  });

  state.price = skus.map((sku, i) => ({
    SKU: sku,
    'Đơn giá (-VAT)': [3500, 5200, 7800, 25000, 180000, 45000][i],
    'Số lượng / pack': [50, 30, 20, 6, 1, 1][i],
    'Đơn vị tính': ['Pcs', 'Pcs', 'Pcs', 'Roll', 'Roll', 'Roll'][i]
  }));

  state.filesReady = { inv: true, aging: true, price: true };
  ['inv', 'aging', 'price'].forEach(type => {
    const zone = document.getElementById('zone-' + type);
    zone.classList.add('done');
    const labelId = type === 'inv' ? 'inv-label' : type === 'aging' ? 'aging-label' : 'price-label';
    const statusId = type === 'inv' ? 'inv-status' : type === 'aging' ? 'aging-status' : 'price-status';
    document.getElementById(labelId).textContent = t('demoLabel');
    document.getElementById(statusId).innerHTML = `<span style="color:var(--success)">${t('demoRecords', { n: type === 'price' ? 6 : 24 })}</span>`;
  });

  document.getElementById('btn-calculate').disabled = false;
  document.getElementById('import-hint').textContent = t('importReady');
  toast(t('toastDemoLoaded'), 'success');
}

// ── Calculate & Show Results ────────────────────────────────────
function calculate() {
  if (!state.filesReady.inv || !state.filesReady.aging || !state.filesReady.price) return;

  initSeasonalConfig();  // Initialize seasonal ratio lift
  runCalculation();
  buildFilterSelects();
  state.filteredResults = filterAndSort(state.results);

  // Switch to results phase
  document.getElementById('phase-import').classList.add('hidden');
  document.getElementById('phase-results').classList.remove('hidden');
  document.getElementById('step-1').classList.remove('active');
  document.getElementById('step-1').classList.add('done');
  document.getElementById('step-2').classList.add('active');

  renderSummary();
  renderAlerts();
  renderTable();

  toast(t('toastCalculated', { n: state.results.length }), 'success');
}

function backToImport() {
  document.getElementById('phase-results').classList.add('hidden');
  document.getElementById('phase-import').classList.remove('hidden');
  document.getElementById('step-2').classList.remove('active');
  document.getElementById('step-1').classList.add('active');
  document.getElementById('step-1').classList.remove('done');

  // Reset state
  state.inv = []; state.aging = []; state.price = [];
  state.pendingPO = [];  // Reset pending PO
  state.results = []; state.filteredResults = [];
  state.filesReady = { inv: false, aging: false, price: false };
  state._parseData = {};

  ['inv', 'aging', 'price'].forEach(type => {
    const zone = document.getElementById('zone-' + type);
    zone.classList.remove('done', 'error');
    const labelId = type + '-label';
    const statusId = type + '-status';
    const titleKey = type === 'inv' ? 'invTitle' : type === 'aging' ? 'agingTitle' : 'priceTitle';
    document.getElementById(labelId).textContent = t(titleKey);
    document.getElementById(statusId).innerHTML = `<span class="text-xs text-muted">${t(type === 'inv' ? 'invHint' : type === 'aging' ? 'agingHint' : 'priceHint')}</span>`;
    const mp = document.getElementById(type + '-mapping');
    if (mp) mp.remove();
    const vp = document.getElementById('val-panel-' + type);
    if (vp) vp.remove();
  });

  // Reset pending upload zone
  const pendingZone = document.getElementById('zone-pending');
  if (pendingZone) pendingZone.classList.remove('done', 'error');
  const pendingStatus = document.getElementById('pending-status');
  if (pendingStatus) pendingStatus.innerHTML = '';

  document.getElementById('btn-calculate').disabled = true;
  document.getElementById('import-hint').textContent = t('importHint');
}

// ── Initialization ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setLang(currentLang);
  initTooltips();
  showOnboarding();

  // Table scroll shadow: hide gradient when scrolled to end
  const tableBody = document.getElementById('table-body');
  if (tableBody) {
    tableBody.addEventListener('scroll', () => {
      const atEnd = tableBody.scrollLeft + tableBody.clientWidth >= tableBody.scrollWidth - 2;
      tableBody.classList.toggle('scrolled-end', atEnd);
    });
  }
});

// ══════════════════════════════════════════════════════════════════
// Pending PO Modal Functions
// ══════════════════════════════════════════════════════════════════

function openPendingModal() {
  const modal = document.getElementById('pending-modal');
  modal.classList.remove('hidden');
  const rows = document.getElementById('pending-rows');
  // Pre-populate from existing manual entries if any, otherwise add 3 empty rows
  if (rows.children.length === 0) {
    for (let i = 0; i < 3; i++) addPendingRow();
  }
}

function closePendingModal() {
  document.getElementById('pending-modal').classList.add('hidden');
}

function addPendingRow() {
  const tbody = document.getElementById('pending-rows');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="SKU" class="pending-sku"></td>
    <td><input type="number" placeholder="0" min="0" class="pending-qty"></td>
    <td><input type="text" placeholder="${t('pendingColNCC')}" class="pending-ncc"></td>
    <td><input type="date" class="pending-date"></td>
    <td><input type="text" placeholder="${t('pendingColWH')}" class="pending-wh"></td>
    <td><button class="btn-delete-row" onclick="deletePendingRow(this)">×</button></td>
  `;
  tbody.appendChild(tr);
}

function deletePendingRow(btn) {
  btn.closest('tr').remove();
}

function savePendingManual() {
  const rows = document.querySelectorAll('#pending-rows tr');
  const manualEntries = [];
  rows.forEach(tr => {
    const sku = tr.querySelector('.pending-sku')?.value?.trim();
    const qty = parseFloat(tr.querySelector('.pending-qty')?.value) || 0;
    const supplier = tr.querySelector('.pending-ncc')?.value?.trim() || '';
    const expectedDate = tr.querySelector('.pending-date')?.value || '';
    const warehouse = tr.querySelector('.pending-wh')?.value?.trim() || '';
    if (sku && qty > 0) {
      manualEntries.push({ sku, qty, supplier, expectedDate, warehouse });
    }
  });

  // Merge with existing pending data (from file upload)
  // Remove previous manual entries (keep file-sourced ones)
  state.pendingPO = state.pendingPO.filter(p => p._source === 'file');
  manualEntries.forEach(e => {
    e._source = 'manual';
    state.pendingPO.push(e);
  });

  closePendingModal();

  // Update pending status display
  const total = state.pendingPO.length;
  if (total > 0) {
    const zone = document.getElementById('zone-pending');
    if (zone) zone.classList.add('done');
    const statusEl = document.getElementById('pending-status');
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--success)">${t('pendingSaved', { n: total })}</span>`;
  }

  toast(t('pendingSaved', { n: manualEntries.length }), 'success');
}
