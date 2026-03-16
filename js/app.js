// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — App Orchestrator
// ══════════════════════════════════════════════════════════════════

// Central state object
const state = {
  inv: [], aging: [], price: [],
  results: [], filteredResults: [],
  filesReady: { inv: false, aging: false, price: false },
  doiTarget: 45, itMax: 6, vat: 8, period: 30,
  currentPage: 1, sortCol: '', sortDir: 'asc',
  _parseData: {},
};

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
  ['doiTarget', 'itMax', 'vat', 'period'].forEach(k => {
    const el = document.getElementById('cfg-' + k);
    if (el) {
      state[k] = parseFloat(el.value) || state[k];
      el.addEventListener('change', () => {
        state[k] = parseFloat(el.value) || state[k];
        if (state.results.length) { applyDOI(); }
      });
    }
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
    // Remove mapping and validation panels
    const mp = document.getElementById(type + '-mapping');
    if (mp) mp.remove();
    const vp = document.getElementById('val-panel-' + type);
    if (vp) vp.remove();
  });

  document.getElementById('btn-calculate').disabled = true;
  document.getElementById('import-hint').textContent = t('importHint');
}

// ── Initialization ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setLang(currentLang);
  initTooltips();
  showOnboarding();
});
