// ══════════════════════════════════════════════════════════════════
// Material Smart — Seasonal Ratio Lift Module
// Configurable monthly demand multiplier per warehouse/country
// ══════════════════════════════════════════════════════════════════

// ── Seasonal Presets ─────────────────────────────────────────────
const SEASONAL_PRESETS = {
  VN: {
    label: 'Vietnam 🇻🇳',
    flag: '🇻🇳',
    months: [1.35, 1.15, 1.0, 1.05, 1.05, 1.05, 1.0, 1.1, 1.15, 1.15, 1.35, 1.3],
    events: ['Tết Nguyên Đán', 'Sau Tết', '', 'Lễ 30/4', 'Lễ 1/5', 'Mid-Year Sale', '', 'Back to School', '9.9 Sale', '10.10', '11.11 / Singles Day', '12.12 / Noel']
  },
  TH: {
    label: 'Thailand 🇹🇭',
    flag: '🇹🇭',
    months: [1.05, 1.0, 1.0, 1.25, 1.0, 1.1, 1.1, 1.0, 1.15, 1.1, 1.3, 1.25],
    events: ['New Year / CNY Prep', '', '', 'Songkran', '', 'Mid-Year Sale', 'Mid-Year Sale', '', '9.9 Sale', '10.10', '11.11 / Singles Day', '12.12 / Year-End']
  },
  PH: {
    label: 'Philippines 🇵🇭',
    flag: '🇵🇭',
    months: [1.05, 1.0, 1.05, 1.05, 1.05, 1.1, 1.0, 1.0, 1.15, 1.15, 1.35, 1.4],
    events: ['After-Christmas', '', 'Summer / Holy Week', 'Summer / Holy Week', 'Summer', 'Mid-Year Sale', '', '', 'BER Months / 9.9', 'BER / 10.10', 'BER / 11.11', 'Christmas / Pasko']
  },
  DEFAULT: {
    label: 'Default',
    flag: '🌐',
    months: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    events: ['', '', '', '', '', '', '', '', '', '', '', '']
  }
};

// ── Country Detection Keywords ──────────────────────────────────
const COUNTRY_KEYWORDS = {
  VN: ['vn', 'vietnam', 'việt', 'viet', 'hcm', 'sgn', 'han', 'hn', 'south', 'north', 'central', 'bmt', 'hue', 'danang', 'đà nẵng'],
  TH: ['th', 'thai', 'bkk', 'bangkok', 'cnx', 'chiangmai', 'phuket', 'siam'],
  PH: ['ph', 'phil', 'mnl', 'manila', 'cebu', 'davao', 'clark']
};

const MONTH_NAMES_SHORT = {
  vi: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
};

// ── Detection ───────────────────────────────────────────────────
function detectCountry(warehouseName) {
  const lower = (warehouseName || '').toLowerCase();
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return country;
  }
  return 'DEFAULT';
}

// ── Init & Config ───────────────────────────────────────────────
function initSeasonalConfig() {
  // Auto-detect countries for all unique warehouses
  const warehouses = [...new Set((state.results || state.inv || []).map(r => r.kho || r.Warehouse || '').filter(Boolean))];
  const warehouseCountry = {};
  warehouses.forEach(wh => {
    // Keep existing mapping if user already set it
    warehouseCountry[wh] = (state.seasonalConfig && state.seasonalConfig.warehouseCountry[wh]) || detectCountry(wh);
  });

  // Load saved custom ratios from localStorage
  let savedConfig = {};
  try {
    savedConfig = JSON.parse(localStorage.getItem('nvl-seasonal-config') || '{}');
  } catch (e) { /* ignore */ }

  state.seasonalConfig = {
    enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : true,
    currentMonth: new Date().getMonth(), // 0-indexed
    warehouseCountry: { ...warehouseCountry, ...(savedConfig.warehouseCountry || {}) },
    customRatios: savedConfig.customRatios || {},
  };
}

function saveSeasonalConfigToStorage() {
  try {
    localStorage.setItem('nvl-seasonal-config', JSON.stringify({
      enabled: state.seasonalConfig.enabled,
      warehouseCountry: state.seasonalConfig.warehouseCountry,
      customRatios: state.seasonalConfig.customRatios,
    }));
  } catch (e) { /* storage full — ignore */ }
}

// ── Get Ratio Lift for a Warehouse ──────────────────────────────
function getRatioLift(warehouse, monthIdx) {
  if (!state.seasonalConfig || !state.seasonalConfig.enabled) return 1.0;
  const country = (state.seasonalConfig.warehouseCountry || {})[warehouse] || detectCountry(warehouse);
  const mi = monthIdx !== undefined ? monthIdx : (state.seasonalConfig.currentMonth || new Date().getMonth());
  const ratios = (state.seasonalConfig.customRatios || {})[country]
    || (SEASONAL_PRESETS[country] && SEASONAL_PRESETS[country].months)
    || SEASONAL_PRESETS.DEFAULT.months;
  return ratios[mi] || 1.0;
}

function getCountryForWarehouse(warehouse) {
  if (!state.seasonalConfig) return detectCountry(warehouse);
  return (state.seasonalConfig.warehouseCountry || {})[warehouse] || detectCountry(warehouse);
}

function getEventForMonth(country, monthIdx) {
  const preset = SEASONAL_PRESETS[country] || SEASONAL_PRESETS.DEFAULT;
  return (preset.events || [])[monthIdx] || '';
}

// ── Modal ────────────────────────────────────────────────────────
function openSeasonalModal() {
  // Ensure config is initialized
  if (!state.seasonalConfig) initSeasonalConfig();

  const modal = document.getElementById('seasonal-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderSeasonalModal();
}

function closeSeasonalModal() {
  const modal = document.getElementById('seasonal-modal');
  if (modal) modal.classList.add('hidden');
}

function renderSeasonalModal() {
  const cfg = state.seasonalConfig;
  const monthIdx = cfg.currentMonth;
  const months = MONTH_NAMES_SHORT[currentLang] || MONTH_NAMES_SHORT.en;
  const warehouses = Object.keys(cfg.warehouseCountry).sort();
  const countries = ['VN', 'TH', 'PH', 'DEFAULT'];
  // Which countries are actually in use
  const activeCountries = [...new Set(Object.values(cfg.warehouseCountry))].sort();

  // ── Enable toggle + Month selector ──
  let html = `<div class="seasonal-controls">
    <label class="seasonal-toggle">
      <input type="checkbox" id="seasonal-enabled" ${cfg.enabled ? 'checked' : ''} onchange="onSeasonalToggle(this.checked)">
      <span data-i18n="seasonalEnable">${t('seasonalEnable')}</span>
    </label>
    <div class="seasonal-month-select">
      <label data-i18n="seasonalMonth">${t('seasonalMonth')}</label>
      <select id="seasonal-month" onchange="onSeasonalMonthChange(this.value)">
        ${months.map((m, i) => `<option value="${i}" ${i === monthIdx ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
    </div>
  </div>`;

  // ── Warehouse → Country Mapping ──
  if (warehouses.length > 0) {
    // Quick action buttons
    html += `<div class="seasonal-section">
      <h4 data-i18n="seasonalWHMapping">${t('seasonalWHMapping')}</h4>
      <div class="seasonal-quick-actions">
        <span class="seasonal-quick-label">${t('seasonalSetAll') || 'Set All'}:</span>
        ${countries.filter(c => c !== 'DEFAULT').map(c => {
          const p = SEASONAL_PRESETS[c];
          return `<button class="btn-seasonal-quick" onclick="applyCountryToAll('${c}')">${p.flag} All ${c}</button>`;
        }).join('')}
        <button class="btn-seasonal-quick btn-seasonal-quick-default" onclick="applyCountryToAll('DEFAULT')">🌐 Default</button>
      </div>
      <table class="seasonal-wh-table">
        <thead><tr>
          <th data-i18n="seasonalColWH">${t('seasonalColWH')}</th>
          <th data-i18n="seasonalColDetected">${t('seasonalColDetected')}</th>
          <th data-i18n="seasonalColCountry">${t('seasonalColCountry')}</th>
        </tr></thead>
        <tbody>`;
    warehouses.forEach(wh => {
      const detected = detectCountry(wh);
      const current = cfg.warehouseCountry[wh] || detected;
      const detectedPreset = SEASONAL_PRESETS[detected] || SEASONAL_PRESETS.DEFAULT;
      html += `<tr>
        <td><code>${wh}</code></td>
        <td>${detectedPreset.flag} ${detected}</td>
        <td class="seasonal-country-cell">
          <select class="seasonal-country-select" data-wh="${wh}" onchange="onSeasonalCountryChange('${wh}',this.value)">
            ${countries.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${SEASONAL_PRESETS[c].flag} ${c}</option>`).join('')}
          </select>
          <button class="btn-apply-all" onclick="onApplyAllCountry('${wh}')" title="${t('seasonalApplyAll') || 'Apply to all warehouses'}">↓ All</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // ── Monthly Ratios Table ──
  html += `<div class="seasonal-section">
    <h4 data-i18n="seasonalRatioTitle">${t('seasonalRatioTitle')}</h4>
    <div class="seasonal-ratio-table-wrapper">
    <table class="seasonal-ratio-table">
      <thead><tr>
        <th data-i18n="seasonalColMonth">${t('seasonalColMonth')}</th>`;
  activeCountries.forEach(c => {
    const p = SEASONAL_PRESETS[c] || SEASONAL_PRESETS.DEFAULT;
    html += `<th>${p.flag} ${c}</th>`;
  });
  html += `<th data-i18n="seasonalColEvent">${t('seasonalColEvent')}</th>
      </tr></thead><tbody>`;

  months.forEach((m, i) => {
    const isCurrentMonth = i === monthIdx;
    html += `<tr class="${isCurrentMonth ? 'seasonal-current-month' : ''}">
      <td class="seasonal-month-label">${m} ${isCurrentMonth ? '◀' : ''}</td>`;
    activeCountries.forEach(c => {
      const ratios = cfg.customRatios[c] || (SEASONAL_PRESETS[c] && SEASONAL_PRESETS[c].months) || SEASONAL_PRESETS.DEFAULT.months;
      const val = ratios[i];
      const colorClass = val > 1.0 ? 'ratio-up' : val < 1.0 ? 'ratio-down' : '';
      html += `<td class="seasonal-ratio-cell ${colorClass}">
        <input type="number" class="seasonal-ratio-input" value="${val}" min="0.1" max="3" step="0.05"
          data-country="${c}" data-month="${i}"
          onchange="onSeasonalRatioEdit('${c}',${i},this.value)">
      </td>`;
    });
    // Events — show all events for this month across active countries
    const events = activeCountries.map(c => {
      const e = getEventForMonth(c, i);
      return e ? `${(SEASONAL_PRESETS[c] || {}).flag || ''} ${e}` : '';
    }).filter(Boolean).join(', ');
    html += `<td class="seasonal-event-cell">${events}</td>`;
    html += `</tr>`;
  });
  html += `</tbody></table></div></div>`;

  document.getElementById('seasonal-modal-body').innerHTML = html;
}

// ── Modal Event Handlers ────────────────────────────────────────
function onSeasonalToggle(enabled) {
  state.seasonalConfig.enabled = enabled;
}

function onSeasonalMonthChange(monthStr) {
  state.seasonalConfig.currentMonth = parseInt(monthStr) || 0;
  renderSeasonalModal();
}

function onSeasonalCountryChange(warehouse, country) {
  state.seasonalConfig.warehouseCountry[warehouse] = country;
  renderSeasonalModal();
}

// Apply a specific country to ALL warehouses (from quick-action buttons)
function applyCountryToAll(country) {
  const warehouses = Object.keys(state.seasonalConfig.warehouseCountry);
  warehouses.forEach(wh => {
    state.seasonalConfig.warehouseCountry[wh] = country;
  });
  renderSeasonalModal();
}

// Apply the current country of a warehouse to ALL other warehouses (from ↓ All button)
function onApplyAllCountry(sourceWarehouse) {
  const country = state.seasonalConfig.warehouseCountry[sourceWarehouse] || detectCountry(sourceWarehouse);
  applyCountryToAll(country);
}

function onSeasonalRatioEdit(country, monthIdx, value) {
  const val = Math.max(0.1, Math.min(3, parseFloat(value) || 1.0));
  // Clone preset into customRatios if first edit
  if (!state.seasonalConfig.customRatios[country]) {
    const preset = SEASONAL_PRESETS[country] || SEASONAL_PRESETS.DEFAULT;
    state.seasonalConfig.customRatios[country] = [...preset.months];
  }
  state.seasonalConfig.customRatios[country][monthIdx] = val;
}

function saveSeasonalConfig() {
  saveSeasonalConfigToStorage();
  closeSeasonalModal();

  // If results exist, recalculate
  if (state.results && state.results.length) {
    runCalculation();
    state.filteredResults = filterAndSort(state.results);
    renderSummary();
    renderAlerts();
    renderTable();
  }

  toast(t('toastSeasonalApplied'), 'success');
}

function resetSeasonalDefaults() {
  state.seasonalConfig.customRatios = {};
  // Re-init country detection
  const warehouses = Object.keys(state.seasonalConfig.warehouseCountry);
  warehouses.forEach(wh => {
    state.seasonalConfig.warehouseCountry[wh] = detectCountry(wh);
  });
  state.seasonalConfig.enabled = true;
  state.seasonalConfig.currentMonth = new Date().getMonth();
  renderSeasonalModal();
  toast(t('toastSeasonalReset'), 'info');
}
