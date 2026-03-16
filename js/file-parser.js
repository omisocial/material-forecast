// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — File Parser, Validation & Mapping UI
// Dynamic warehouse architecture — no hardcoded warehouse names.
// Any warehouse value from import files is accepted automatically.
// Users can override via localStorage if they want to rename warehouses.
// ══════════════════════════════════════════════════════════════════

// Load user warehouse overrides from localStorage (user-defined renames)
function getWarehouseMap() {
  return JSON.parse(localStorage.getItem('nvl-wh-map') || '{}');
}

function saveWarehouseMap(userOverrides) {
  localStorage.setItem('nvl-wh-map', JSON.stringify(userOverrides));
}

// Default Boxme Warehouse mappings
const DEFAULT_WH_MAP = {
  'BMVN_HCM_BTN': 'Boxme Binh Tan - Ho Chi Minh',
  'BMVN_HCM_TT': 'Boxme Tan Tao - Ho Chi Minh',
  'BMVN_HCM_TP': 'Boxme Tan Phu - Ho Chi Minh',
  'BMVN_HN_LB': 'Boxme Long Bien - Ha Noi',
  'BMVN_HN_DA': 'Boxme Dong Anh - Ha Noi',
  'BMPH_MNL_TG': 'Boxme Taguig - Manila',
  'BMTH_BKK_SP': 'Boxme Samut Prakan - Bangkok'
};

// Clean number parser to handle comma formats like "1,000"
function parseCleanFloat(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Resolve warehouse name: user overrides → raw value (auto-accept)
// Never returns null — any warehouse from import is valid
function resolveWarehouse(code) {
  if (!code) return '';
  const trimmed = String(code).trim();
  if (!trimmed) return '';
  const map = getWarehouseMap();
  
  // 1. Check exact match in user overrides
  if (map[trimmed]) return map[trimmed];
  // 2. Check partial match in user overrides (for coded warehouse names like BMVN_HCM_BTN)
  for (const [key, val] of Object.entries(map)) {
    if (trimmed.toLowerCase() === key.toLowerCase()) return val;
  }
  
  // 3. Fallback to default Boxme Mappings
  if (DEFAULT_WH_MAP[trimmed]) return DEFAULT_WH_MAP[trimmed];
  for (const [key, val] of Object.entries(DEFAULT_WH_MAP)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || val.toLowerCase().includes(trimmed.toLowerCase())) {
        return val;
    }
  }

  // Auto-accept: use the raw value as-is (trimmed)
  return trimmed;
}

// ── Drag & Drop helpers ─────────────────────────────────────────
function dragOver(e, zoneId) { e.preventDefault(); document.getElementById(zoneId).classList.add('drag'); }
function dragLeave(zoneId) { document.getElementById(zoneId).classList.remove('drag'); }
function drop(e, type) {
  e.preventDefault(); dragLeave('zone-' + type);
  const file = e.dataTransfer.files[0];
  if (file) parseFile(file, type);
}
function handleFile(event, type) { parseFile(event.target.files[0], type); }

// ── Parse File ──────────────────────────────────────────────────
function parseFile(file, type) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Read as array of arrays for header detection
      const rawAOA = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rawAOA.length < 2) {
        showFileError(type, t('errReadFile', { msg: 'File has no data rows' }));
        return;
      }

      // Detect header row (handles bilingual headers)
      const headerInfo = detectHeaderRow(rawAOA);
      const headers = rawAOA[headerInfo.headerRow].map(h => String(h || '').trim());

      // If bilingual: merge with secondary header for detection
      let allHeaders = [...headers];
      if (headerInfo.secondaryHeaderRow !== undefined) {
        const secondary = rawAOA[headerInfo.secondaryHeaderRow].map(h => String(h || '').trim());
        // Use secondary headers where primary is empty or '#'
        allHeaders = headers.map((h, i) => {
          if (!h || h === '#' || h === 'STT') return secondary[i] || h;
          return h;
        });
      }

      // Run smart column detection
      const detection = detectColumns(allHeaders, type);

      // Parse data rows using original headers
      const dataRows = rawAOA.slice(headerInfo.dataStartRow);
      const jsonRows = dataRows
        .filter(row => row.some(cell => cell !== '' && cell != null))
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => { if (h) obj[h] = row[i] !== undefined ? row[i] : ''; });
          return obj;
        });

      // Store detection result and show mapping UI
      showMappingUI(type, detection, jsonRows, file.name, allHeaders, headers);

    } catch (err) {
      showFileError(type, t('errReadFile', { msg: err.message }));
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Mapping UI ──────────────────────────────────────────────────
function showMappingUI(type, detection, rows, filename, displayHeaders, originalHeaders) {
  const zoneId = { inv: 'zone-inv', aging: 'zone-aging', price: 'zone-price', pending: 'zone-pending' }[type];
  const statusId = { inv: 'inv-status', aging: 'aging-status', price: 'price-status', pending: 'pending-status' }[type];
  const labelId = { inv: 'inv-label', aging: 'aging-label', price: 'price-label', pending: 'pending-label' }[type];
  const mappingId = { inv: 'inv-mapping', aging: 'aging-mapping', price: 'price-mapping', pending: 'pending-mapping' }[type];

  // Update zone visual
  const zone = document.getElementById(zoneId);
  zone.classList.remove('error');
  zone.classList.add('done');
  document.getElementById(labelId).textContent = type === 'pending' ? t('pendingTitle') + ' — ' + filename : t('fileLabel', { name: filename });
  document.getElementById(statusId).innerHTML =
    `<span style="color:var(--success)">${t('fileRecords', { n: rows.length })}</span>`;

  // Store temporary parse data (originalHeaders for data key lookup, displayHeaders for UI)
  if (!state._parseData) state._parseData = {};
  state._parseData[type] = { rows, detection, displayHeaders, originalHeaders: originalHeaders || displayHeaders, filename };

  // Build mapping panel
  const confClass = detection.confidence >= 80 ? 'confidence-high' : detection.confidence >= 50 ? 'confidence-med' : 'confidence-low';
  const aliases = COLUMN_ALIASES[type === 'inv' ? 'inventory' : type];

  let html = `<details class="mapping-panel" id="${mappingId}" ${detection.confidence < 100 ? 'open' : ''}>`;
  html += `<summary class="mapping-header" style="cursor:pointer; user-select:none; outline:none; list-style:none;">
    <span style="font-size:.75rem;font-weight:600">${t('mappingTitle')}</span>
    <span class="confidence ${confClass}">${t('mappingConfidence')}: ${detection.confidence}%</span>
  </summary>`;

  for (const [fieldName, config] of Object.entries(aliases)) {
    const mapped = detection.mapping[fieldName];
    const status = mapped ? '✅' : (config.required ? '❌' : '➖');

    html += `<div class="mapping-row">
      <span class="field-name">${fieldName}${config.required ? ' *' : ''}</span>
      <select id="map-${type}-${fieldName}" onchange="onMappingChange('${type}')">
        <option value="">${t('mappingSelectCol')}</option>
        ${displayHeaders.map((h, i) => `<option value="${i}" ${mapped && mapped.columnIndex === i ? 'selected' : ''}>${h}</option>`).join('')}
      </select>
      <span class="status-icon">${status}</span>
    </div>`;
  }

  html += `<div class="mapping-actions">
    <button class="btn btn-primary btn-sm" onclick="confirmMapping('${type}')">${t('mappingConfirm')}</button>
    <button class="btn btn-outline btn-sm" onclick="resetMapping('${type}')">${t('mappingReset')}</button>
  </div>`;
  html += '</details>';

  // Insert/replace mapping panel
  const existingPanel = document.getElementById(mappingId);
  if (existingPanel) existingPanel.remove();
  document.getElementById(statusId).insertAdjacentHTML('afterend', html);

  // Auto-confirm if confidence is 100%
  if (detection.confidence === 100) {
    setTimeout(() => confirmMapping(type), 50);
  }
}

function onMappingChange(type) {
  // Update status icons based on current selections
  const aliases = COLUMN_ALIASES[type === 'inv' ? 'inventory' : type];
  for (const [fieldName, config] of Object.entries(aliases)) {
    const select = document.getElementById(`map-${type}-${fieldName}`);
    if (!select) continue;
    const icon = select.parentElement.querySelector('.status-icon');
    if (select.value) {
      icon.textContent = '✅';
    } else {
      icon.textContent = config.required ? '❌' : '➖';
    }
  }
}

function resetMapping(type) {
  if (!state._parseData || !state._parseData[type]) return;
  const { rows, detection, displayHeaders, originalHeaders, filename } = state._parseData[type];
  showMappingUI(type, detection, rows, filename, displayHeaders, originalHeaders);
}

function confirmMapping(type) {
  if (!state._parseData || !state._parseData[type]) return;
  const { rows, detection, originalHeaders } = state._parseData[type];
  const aliases = COLUMN_ALIASES[type === 'inv' ? 'inventory' : type];

  // Read current mapping from UI
  const finalMapping = {};
  for (const [fieldName, config] of Object.entries(aliases)) {
    const select = document.getElementById(`map-${type}-${fieldName}`);
    if (!select) continue;
    if (select.value !== '') {
      finalMapping[fieldName] = {
        columnIndex: parseInt(select.value),
        columnName: originalHeaders[parseInt(select.value)],
      };
    } else if (config.required) {
      showFileError(type, t('errMissingCol', { col: fieldName }));
      return;
    }
  }

  // Carry over aging buckets
  if (detection.mapping._agingBuckets) {
    finalMapping._agingBuckets = detection.mapping._agingBuckets;
  }

  // Apply mapping to normalize data (use originalHeaders for data key lookup)
  let normalized = applyColumnMapping(rows, finalMapping, originalHeaders);

  // Quick cleanup: Ignore summary/total rows with empty SKUs
  normalized = normalized.filter(r => r.sku && String(r.sku).trim() !== '');

  // Run data validation
  const validation = validateData(normalized, type);
  showValidationPanel(type, validation);

  // If no blocking errors, process data
  if (validation.errors.length === 0) {
    processNormalizedData(normalized, type);
  }
}

// ── Data Validation Engine ──────────────────────────────────────
function validateData(rows, type) {
  const errors = [];
  const warnings = [];
  const info = [];

  if (type === 'inv') {
    // Check for empty SKUs
    rows.forEach((r, i) => {
      if (!r.sku || String(r.sku).trim() === '') {
        errors.push(t('valEmptySKU', { row: i + 1 }));
      }
    });

    // Check numeric fields
    const numericFields = ['outbound', 'close', 'opening', 'inbound'];
    rows.forEach((r, i) => {
      for (const field of numericFields) {
        if (r[field] !== undefined && r[field] !== '') {
          const cleanVal = String(r[field]).replace(/,/g, '').trim();
          if (isNaN(Number(cleanVal))) {
            errors.push(t('valNotNumber', { row: i + 1, col: field, val: r[field] }));
          }
        }
      }
    });

    // Check for negative values
    rows.forEach((r, i) => {
      for (const field of numericFields) {
        const val = parseCleanFloat(r[field]);
        if (!isNaN(val) && val < 0) {
          warnings.push(t('valNegativeStock', { row: i + 1, col: field, val: val }));
        }
      }
    });

    // Check duplicate SKU + Warehouse
    const seen = new Set();
    let dupes = 0;
    rows.forEach(r => {
      const key = `${String(r.sku).trim()}|${String(r.warehouse).trim()}`;
      if (seen.has(key)) dupes++;
      seen.add(key);
    });
    if (dupes > 0) warnings.push(t('valDuplicateSKU', { n: dupes }));

    // Zero demand
    const zeroDemand = rows.filter(r => parseCleanFloat(r.outbound) === 0).length;
    if (zeroDemand > 0) info.push(t('valZeroDemand', { n: zeroDemand }));

  } else if (type === 'aging') {
    rows.forEach((r, i) => {
      if (!r.sku || String(r.sku).trim() === '') {
        errors.push(t('valEmptySKU', { row: i + 1 }));
      }
    });

  } else if (type === 'price') {
    rows.forEach((r, i) => {
      if (!r.sku || String(r.sku).trim() === '') {
        errors.push(t('valEmptySKU', { row: i + 1 }));
      }
      if (r.unitPrice !== undefined && r.unitPrice !== '') {
        const cleanVal = String(r.unitPrice).replace(/,/g, '').trim();
        if (isNaN(Number(cleanVal))) {
          errors.push(t('valNotNumber', { row: i + 1, col: 'unitPrice', val: r.unitPrice }));
        }
      }
    });

  } else if (type === 'pending') {
    rows.forEach((r, i) => {
      if (!r.sku || String(r.sku).trim() === '') {
        errors.push(t('valEmptySKU', { row: i + 1 }));
      }
      const qty = parseCleanFloat(r.qty);
      if (qty <= 0) {
        warnings.push(`Row ${i + 1}: Quantity is zero or negative (${r.qty})`);
      }
    });
  }

  return { errors, warnings, info };
}

function showValidationPanel(type, validation) {
  const panelId = `val-panel-${type}`;
  const existingPanel = document.getElementById(panelId);
  if (existingPanel) existingPanel.remove();

  const { errors, warnings, info } = validation;
  if (errors.length === 0 && warnings.length === 0 && info.length === 0) {
    const html = `<div class="validation-panel all-good" id="${panelId}">
      <span>${t('valAllGood')}</span>
    </div>`;
    insertAfterMapping(type, html);
    return;
  }

  const panelClass = errors.length > 0 ? 'has-errors' : warnings.length > 0 ? 'has-warnings' : 'all-good';
  let html = `<div class="validation-panel ${panelClass}" id="${panelId}">`;
  html += `<h4>${t('validationTitle')}</h4>`;

  if (errors.length > 0) {
    html += `<div style="margin-bottom:.375rem;font-weight:600">❌ ${t('valErrors', { n: errors.length })}</div>`;
    html += errors.slice(0, 5).map(e => `<div class="validation-item"><span class="v-icon">❌</span>${e}</div>`).join('');
    if (errors.length > 5) html += `<div class="text-xs text-muted">...và ${errors.length - 5} lỗi khác</div>`;
  }
  if (warnings.length > 0) {
    html += `<div style="margin-bottom:.375rem;margin-top:.375rem;font-weight:600">⚠️ ${t('valWarnings', { n: warnings.length })}</div>`;
    html += warnings.slice(0, 3).map(w => `<div class="validation-item"><span class="v-icon">⚠️</span>${w}</div>`).join('');
  }
  if (info.length > 0) {
    html += `<div style="margin-bottom:.375rem;margin-top:.375rem;font-weight:600">ℹ️ ${t('valInfo', { n: info.length })}</div>`;
    html += info.map(i => `<div class="validation-item"><span class="v-icon">ℹ️</span>${i}</div>`).join('');
  }

  html += '</div>';
  insertAfterMapping(type, html);
}

function insertAfterMapping(type, html) {
  const mappingId = { inv: 'inv-mapping', aging: 'aging-mapping', price: 'price-mapping', pending: 'pending-mapping' }[type];
  const mappingPanel = document.getElementById(mappingId);
  if (mappingPanel) {
    mappingPanel.insertAdjacentHTML('afterend', html);
  } else {
    const statusId = { inv: 'inv-status', aging: 'aging-status', price: 'price-status', pending: 'pending-status' }[type];
    document.getElementById(statusId).insertAdjacentHTML('afterend', html);
  }
}

// ── Process Normalized Data ─────────────────────────────────────
function processNormalizedData(normalized, type) {
  if (type === 'inv') {
    // Resolve warehouse names — all warehouses are auto-accepted
    const processed = normalized.map(r => {
      const whRaw = String(r.warehouse || '').trim();
      const resolved = resolveWarehouse(whRaw);
      return {
        SKU: String(r.sku || '').trim(),
        'Product name': String(r.name || r.sku || '').trim(),
        Opening: parseCleanFloat(r.opening),
        Inbound: parseCleanFloat(r.inbound),
        Return: 0,
        Outbound: parseCleanFloat(r.outbound),
        Close: parseCleanFloat(r.close),
        Warehouse: resolved,
        _rawWarehouse: whRaw,
      };
    });

    state.inv = processed;
    state.filesReady.inv = true;

  } else if (type === 'aging') {
    const processed = normalized.map(r => {
      const whRaw = String(r.warehouse || '').trim();
      const resolved = resolveWarehouse(whRaw);
      const row = {
        'Kho': resolved || whRaw,
        'Seller SKU': String(r.sku || '').trim(),
      };
      // Map aging buckets
      if (r._agingBuckets) {
        for (const [name, val] of Object.entries(r._agingBuckets)) {
          row[name] = parseCleanFloat(val);
        }
      }
      return row;
    });
    state.aging = processed;
    state.filesReady.aging = true;

  } else if (type === 'price') {
    const processed = normalized.map(r => ({
      SKU: String(r.sku || '').trim(),
      'Đơn giá (-VAT)': parseCleanFloat(r.unitPrice),
      'Số lượng / pack': parseCleanFloat(r.packQty) || 1,
      'Đơn vị tính': String(r.unit || 'Cái'),
    }));
    state.price = processed;
    state.filesReady.price = true;

  } else if (type === 'pending') {
    // Parse pending PO data from file upload
    const processed = normalized.map(r => ({
      sku: String(r.sku || '').trim(),
      qty: parseCleanFloat(r.qty),
      supplier: String(r.supplier || '').trim(),
      expectedDate: String(r.expectedDate || '').trim(),
      warehouse: r.warehouse ? resolveWarehouse(String(r.warehouse).trim()) : '',
      _source: 'file',
    })).filter(r => r.sku && r.qty > 0);

    // Merge with manual entries (keep both)
    state.pendingPO = [
      ...state.pendingPO.filter(p => p._source === 'manual'),
      ...processed,
    ];

    // Update UI
    const zone = document.getElementById('zone-pending');
    if (zone) zone.classList.add('done');
    const statusEl = document.getElementById('pending-status');
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--success)">${t('pendingSaved', { n: processed.length })}</span>`;
    toast(t('pendingSaved', { n: processed.length }), 'success');
  }

  checkAllReady();
}

// ── Warehouse Mapping Modal ─────────────────────────────────────
function showWarehouseMappingModal(unmappedCodes, invData) {
  const existing = document.getElementById('wh-modal');
  if (existing) existing.remove();

  let html = `<div class="modal-overlay" id="wh-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>${t('whMappingTitle')}</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeWarehouseModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:.8125rem;color:var(--text-muted);margin-bottom:.75rem">${t('whMappingDesc')}</p>`;

  unmappedCodes.forEach(code => {
    html += `<div class="wh-mapping-row">
      <span class="wh-code">${code}</span>
      <span class="wh-arrow">→</span>
      <input type="text" id="wh-input-${btoa(code).replace(/[^a-zA-Z0-9]/g, '')}" placeholder="Tên kho..." value="${code}">
    </div>`;
  });

  html += `</div>
      <div class="modal-footer">
        <button class="btn btn-outline btn-sm" onclick="closeWarehouseModal()">${t('whMappingCancel')}</button>
        <button class="btn btn-primary btn-sm" onclick="saveWarehouseModalMapping()">${t('whMappingSave')}</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Store reference to inv data for after modal save
  state._pendingInvData = invData;
  state._unmappedCodes = unmappedCodes;
}

function closeWarehouseModal() {
  const modal = document.getElementById('wh-modal');
  if (modal) modal.remove();
}

function saveWarehouseModalMapping() {
  const userOverrides = JSON.parse(localStorage.getItem('nvl-wh-map') || '{}');

  state._unmappedCodes.forEach(code => {
    const inputId = `wh-input-${btoa(code).replace(/[^a-zA-Z0-9]/g, '')}`;
    const input = document.getElementById(inputId);
    if (input && input.value.trim()) {
      userOverrides[code] = input.value.trim();
    }
  });

  saveWarehouseMap(userOverrides);

  // Re-resolve warehouse names in pending data
  state._pendingInvData.forEach(row => {
    const resolved = resolveWarehouse(row._rawWarehouse);
    if (resolved) row.Warehouse = resolved;
  });

  state.inv = state._pendingInvData;
  state.filesReady.inv = true;
  delete state._pendingInvData;
  delete state._unmappedCodes;

  closeWarehouseModal();
  checkAllReady();
  toast(t('whMappingSave'), 'success');
}

function checkAllReady() {
  const all = state.filesReady.inv && state.filesReady.aging && state.filesReady.price;
  document.getElementById('btn-calculate').disabled = !all;
  document.getElementById('import-hint').textContent = all ? t('importReady') : t('importHint');
}

function showFileError(type, msg) {
  const zone = document.getElementById('zone-' + type);
  zone.classList.remove('done');
  zone.classList.add('error');
  const statusId = { inv: 'inv-status', aging: 'aging-status', price: 'price-status', pending: 'pending-status' }[type];
  document.getElementById(statusId).innerHTML =
    `<span style="color:var(--danger)">❌ ${msg}</span>`;
  toast(msg, 'error');
}
