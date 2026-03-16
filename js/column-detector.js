// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Smart Column Detection Engine
// ══════════════════════════════════════════════════════════════════

// Multi-language column alias dictionaries
const COLUMN_ALIASES = {
  inventory: {
    sku: {
      required: true,
      aliases: ['SKU', 'Sku', 'sku', 'Mã sản phẩm', 'Mã SP', 'Seller SKU',
                'รหัสสินค้า', 'Product Code', 'Item Code', 'Codigo'],
    },
    outbound: {
      required: true,
      aliases: ['Outbound', 'outbound', 'Xuất kho', 'Số lượng xuất', 'SL xuất',
                'ยอดออก', 'Shipped', 'Shipped Qty', 'Qty Out'],
    },
    close: {
      required: true,
      aliases: ['Close', 'close', 'Closing', 'Tồn cuối', 'Tồn kho', 'Closing Stock',
                'คงเหลือ', 'ยอดปิด', 'End Stock', 'Inv Close'],
    },
    warehouse: {
      required: true,
      aliases: ['Warehouse', 'warehouse', 'Kho', 'Kho hàng', 'Fulfillment Center',
                'คลังสินค้า', 'Bodega', 'FC', 'WH', 'Storage'],
    },
    name: {
      required: false,
      aliases: ['Product name', 'Product Name', 'Tên sản phẩm', 'Tên SP', 'Tên Sản Phẩm',
                'ชื่อสินค้า', 'Item Name', 'Description', 'Pangalan'],
    },
    opening: {
      required: false,
      aliases: ['Opening', 'opening', 'Tồn đầu', 'ยอดเปิด', 'Begin Stock', 'Inv Open'],
    },
    inbound: {
      required: false,
      aliases: ['Inbound', 'inbound', 'Nhập kho', 'ยอดเข้า', 'Received', 'Qty In'],
    },
  },
  aging: {
    warehouse: {
      required: true,
      aliases: ['Kho', 'Kho hàng', 'Warehouse', 'Warehouse name', 'คลังสินค้า',
                'WH', 'FC', 'Fulfillment Center'],
    },
    sku: {
      required: true,
      aliases: ['Seller SKU', 'SKU', 'Sku', 'sku', 'Mã SP', 'รหัสสินค้า',
                'Product Code', 'Item Code'],
    },
    name: {
      required: false,
      aliases: ['Tên sản phẩm', 'Product name', 'Product Name', 'ชื่อสินค้า', 'Item Name'],
    },
  },
  price: {
    sku: {
      required: true,
      aliases: ['SKU', 'Sku', 'sku', 'Mã SP', 'Mã sản phẩm', 'รหัสสินค้า',
                'Product Code', 'Item Code'],
    },
    unitPrice: {
      required: true,
      aliases: ['Đơn giá (-VAT)', 'Đơn giá', 'Don gia (-VAT)', 'Don gia', 'don_gia',
                'Unit Price', 'Unit Price (-VAT)', 'Price', 'ราคาต่อหน่วย', 'ราคา'],
    },
    packQty: {
      required: false,
      aliases: ['Số lượng / pack', 'Số lượng/pack', 'So luong pack', 'quy_cach',
                'Pack Qty', 'Qty per Pack', 'จำนวนต่อแพ็ค', 'Pack Size'],
    },
    unit: {
      required: false,
      aliases: ['Đơn vị tính', 'Đơn vị', 'don_vi', 'Unit', 'หน่วย', 'UOM'],
    },
  },
  pending: {
    sku: {
      required: true,
      aliases: ['SKU', 'Sku', 'sku', 'Mã sản phẩm', 'Mã SP', 'Seller SKU',
                'รหัสสินค้า', 'Product Code', 'Item Code'],
    },
    qtyPending: {
      required: true,
      aliases: ['Qty Pending', 'Qty_Pending', 'SL chờ', 'Số lượng chờ', 'Pending Qty',
                'จำนวนรอ', 'Quantity Pending', 'PO Qty', 'SL PO'],
    },
    supplier: {
      required: false,
      aliases: ['NCC', 'Supplier', 'Nhà cung cấp', 'ผู้จัดจำหน่าย', 'Vendor'],
    },
    expectedDate: {
      required: false,
      aliases: ['Expected Date', 'Ngày dự kiến', 'วันที่คาดว่า', 'ETA', 'Delivery Date',
                'Ngày giao', 'Due Date'],
    },
    warehouse: {
      required: false,
      aliases: ['Warehouse', 'Kho', 'Kho hàng', 'คลังสินค้า', 'WH', 'FC'],
    },
  }
};

// Aging bucket column patterns (detect dynamically)
const AGING_BUCKET_PATTERNS = [
  /^<\s*\d+\s*(days?|ngày|วัน)?$/i,
  /^\d+\s*(to|đến|-)\s*\d+\s*(days?|ngày|วัน)?$/i,
  /^>\s*\d+\s*(days?|ngày|วัน)?$/i,
];

/**
 * Detect if a row looks like a header (>50% non-numeric string cells)
 */
function isLikelyHeaderRow(row) {
  if (!row || !Array.isArray(row)) return false;
  const nonEmpty = row.filter(v => v != null && String(v).trim() !== '');
  if (nonEmpty.length === 0) return false;
  const nonNumeric = nonEmpty.filter(v => {
    const s = String(v).trim();
    return isNaN(Number(s)) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s);
  });
  return nonNumeric.length / nonEmpty.length > 0.5;
}

/**
 * Detect the actual header row index (0-based) and data start row
 * Handles bilingual headers (e.g., row 0 = VN, row 1 = EN)
 */
function detectHeaderRow(rawRows) {
  if (!rawRows || rawRows.length === 0) return { headerRow: 0, dataStartRow: 1 };

  // Check first 5 rows
  const checks = rawRows.slice(0, 5).map(row => isLikelyHeaderRow(row));

  // If row 0 and row 1 are both headers (bilingual) → use row 0 as header, data from row 2
  if (checks[0] && checks[1]) {
    return { headerRow: 0, secondaryHeaderRow: 1, dataStartRow: 2 };
  }
  // Normal: row 0 is header
  if (checks[0]) {
    return { headerRow: 0, dataStartRow: 1 };
  }
  // Sometimes data starts at row 1 with header at row 0
  return { headerRow: 0, dataStartRow: 1 };
}

/**
 * Match file columns against alias dictionary
 * Returns: { mapping, confidence, unmatched }
 */
function detectColumns(fileHeaders, fileType) {
  const actualType = fileType === 'inv' ? 'inventory' : fileType;
  const aliases = COLUMN_ALIASES[actualType];
  if (!aliases) return { mapping: {}, confidence: 0, unmatched: [] };

  const normalizedHeaders = fileHeaders.map(h => String(h || '').trim());
  const mapping = {};
  const matched = new Set();
  const unmatched = [];

  // Phase 1: Exact match (case-insensitive)
  for (const [fieldName, config] of Object.entries(aliases)) {
    for (const alias of config.aliases) {
      const idx = normalizedHeaders.findIndex((h, i) =>
        !matched.has(i) && h.toLowerCase() === alias.toLowerCase()
      );
      if (idx !== -1) {
        mapping[fieldName] = { columnIndex: idx, columnName: normalizedHeaders[idx], matchType: 'exact', confidence: 100 };
        matched.add(idx);
        break;
      }
    }
  }

  // Phase 2: Partial/contains match for unmatched fields
  for (const [fieldName, config] of Object.entries(aliases)) {
    if (mapping[fieldName]) continue;
    for (const alias of config.aliases) {
      const idx = normalizedHeaders.findIndex((h, i) =>
        !matched.has(i) && (
          h.toLowerCase().includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(h.toLowerCase())
        )
      );
      if (idx !== -1) {
        mapping[fieldName] = { columnIndex: idx, columnName: normalizedHeaders[idx], matchType: 'partial', confidence: 70 };
        matched.add(idx);
        break;
      }
    }
  }

  // Phase 3: Check for aging bucket columns
  if (fileType === 'aging') {
    const agingBuckets = [];
    normalizedHeaders.forEach((h, i) => {
      if (matched.has(i)) return;
      if (AGING_BUCKET_PATTERNS.some(p => p.test(h))) {
        agingBuckets.push({ index: i, name: h });
      }
    });
    if (agingBuckets.length > 0) {
      mapping._agingBuckets = agingBuckets;
    }
  }

  // Check unmatched required fields
  for (const [fieldName, config] of Object.entries(aliases)) {
    if (!mapping[fieldName] && config.required) {
      unmatched.push(fieldName);
    }
  }

  // Calculate overall confidence
  const totalFields = Object.keys(aliases).length;
  const matchedFields = Object.keys(mapping).filter(k => !k.startsWith('_')).length;
  const confidence = Math.round((matchedFields / totalFields) * 100);

  return { mapping, confidence, unmatched, availableColumns: normalizedHeaders };
}

/**
 * Apply column mapping to normalize raw data rows into standard format
 */
function applyColumnMapping(rawRows, mapping, headers) {
  return rawRows.map(row => {
    const normalized = {};
    for (const [fieldName, mapInfo] of Object.entries(mapping)) {
      if (fieldName.startsWith('_')) continue;
      const val = row[headers[mapInfo.columnIndex]];
      normalized[fieldName] = val !== undefined ? val : '';
    }
    // For aging buckets
    if (mapping._agingBuckets) {
      normalized._agingBuckets = {};
      for (const bucket of mapping._agingBuckets) {
        normalized._agingBuckets[bucket.name] = row[headers[bucket.index]] || 0;
      }
    }
    return normalized;
  });
}
