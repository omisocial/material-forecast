# Seasonal Ratio Lift — Design Document

## Problem

Material Forecast tool hiện tại chỉ có `demandFactor` per-row (thủ công). Planner không có cách nào áp dụng hệ số mùa vụ tự động theo tháng và quốc gia. Mỗi nước (PH, TH, VN) có lịch mua sắm khác nhau — cần hệ thống ratio lift riêng biệt.

## Decisions

| Quyết định | Lựa chọn |
|---|---|
| Cấp áp dụng | Warehouse/Quốc gia |
| Nhận diện quốc gia | Auto-detect keyword + manual override |
| UI | Modal riêng với nút "⚙️ Seasonal Ratio" |
| Preset | Hardcode cho VN/TH/PH |
| Tích hợp | `adjustedDemand = demand × ratioLift × demandFactor` |

## Architecture

### Data Model

```javascript
// Seasonal presets per country — stored in calc-engine.js
const SEASONAL_PRESETS = {
  VN: {
    label: 'Vietnam',
    months: [1.3, 1.2, 0.9, 0.9, 1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 1.4, 1.3]
    // Jan-Feb: Tết, Nov: 11.11, Dec: 12.12 + Noel
  },
  TH: {
    label: 'Thailand',
    months: [1.0, 1.0, 1.0, 1.3, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.3, 1.2]
    // Apr: Songkran, Nov: 11.11, Dec: Year-end
  },
  PH: {
    label: 'Philippines',
    months: [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.0, 1.0, 1.2, 1.1, 1.3, 1.4]
    // Jun: Mid-year sale, Sep: BER months start, Nov: 11.11, Dec: Christmas
  },
  DEFAULT: {
    label: 'Default',
    months: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
  }
};
```

### State Extension

```javascript
// In state object (app.js)
state.seasonalConfig = {
  enabled: true,
  currentMonth: new Date().getMonth(), // 0-indexed
  warehouseCountry: {},  // { "WH-South": "VN", "WH-BKK": "TH" }
  customRatios: {},      // { "VN": [1.3, 1.2, ...], "TH": [...] } — user overrides
};
```

### Country Auto-Detection

```javascript
// Keywords for auto-detection
const COUNTRY_KEYWORDS = {
  VN: ['vn', 'vietnam', 'hcm', 'hn', 'sgn', 'han', 'south', 'north', 'central'],
  TH: ['th', 'thai', 'bkk', 'bangkok', 'cnx'],
  PH: ['ph', 'phil', 'mnl', 'manila', 'cebu']
};

function detectCountry(warehouseName) {
  const lower = warehouseName.toLowerCase();
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return country;
  }
  return 'DEFAULT';
}
```

### Calculation Integration

In `runCalculation()` (calc-engine.js):

```javascript
// Get ratio lift for this warehouse
const country = state.seasonalConfig.warehouseCountry[kho] || detectCountry(kho);
const monthIdx = state.seasonalConfig.currentMonth;
const ratios = state.seasonalConfig.customRatios[country] 
  || SEASONAL_PRESETS[country]?.months 
  || SEASONAL_PRESETS.DEFAULT.months;
const ratioLift = state.seasonalConfig.enabled ? ratios[monthIdx] : 1.0;

// Final formula
const adjustedDemand = demand * ratioLift * demandFactor;
```

## UI Design

### Modal Layout

```
┌──────────────────────────────────────────────────┐
│ ⚙️ Seasonal Ratio Lift Configuration        [✕] │
├──────────────────────────────────────────────────┤
│ ☑ Enable Seasonal Ratio    Month: [March ▼]     │
├──────────────────────────────────────────────────┤
│ Warehouse → Country Mapping                      │
│ ┌────────────┬──────────┬──────────┐             │
│ │ Warehouse  │ Detected │ Country  │             │
│ ├────────────┼──────────┼──────────┤             │
│ │ WH-South   │ 🇻🇳 VN   │ [VN ▼]  │             │
│ │ WH-BKK     │ 🇹🇭 TH   │ [TH ▼]  │             │
│ │ WH-Manila  │ 🇵🇭 PH   │ [PH ▼]  │             │
│ └────────────┴──────────┴──────────┘             │
├──────────────────────────────────────────────────┤
│ Monthly Ratios by Country                        │
│ ┌─────┬──────┬──────┬──────┬─────────────┐      │
│ │ Mon │  VN  │  TH  │  PH  │    Event    │      │
│ ├─────┼──────┼──────┼──────┼─────────────┤      │
│ │ Jan │ 1.30 │ 1.00 │ 1.00 │ 🎆 Tết     │      │
│ │ Feb │ 1.20 │ 1.00 │ 1.00 │             │      │
│ │ Mar │ 0.90 │ 1.00 │ 1.00 │ ← current  │      │
│ │ ... │      │      │      │             │      │
│ │ Dec │ 1.30 │ 1.20 │ 1.40 │ 🎄 Xmas    │      │
│ └─────┴──────┴──────┴──────┴─────────────┘      │
│                                                  │
│ [Reset to Defaults]           [Cancel] [Apply]   │
└──────────────────────────────────────────────────┘
```

### Key UI Behaviors

1. **Modal trigger:** Nút "⚙️ Seasonal Ratio" trong Config Card, bên cạnh Goal selector
2. **Highlight current month:** Dòng tháng hiện tại highlight màu xanh nhạt
3. **Editable cells:** User click vào số ratio để sửa trực tiếp (inline edit)
4. **Visual feedback:** Ratio > 1.0 hiện xanh lá, < 1.0 hiện cam, = 1.0 trắng
5. **Country override:** Dropdown cho từng warehouse, auto-detect hiện icon cờ

### Table Results Integration

Thêm cột "Ratio Lift" trong bảng kết quả, giữa "Demand" và "Demand Factor":

```
| SKU | Demand | Ratio ↕ | Factor | Adj.Demand | ... |
|     |  1000  |  1.30   |  1.0   |    1300    | ... |
```

- Cột "Ratio ↕" read-only (không edit tại bảng, chỉ edit trong modal)
- Tooltip hiện: "Vietnam - January: Tết season"

## Components

### New File: `js/seasonal-ratio.js`
- `SEASONAL_PRESETS` — preset data
- `COUNTRY_KEYWORDS` — auto-detection keywords
- `detectCountry(warehouseName)` — auto-detect function
- `getRatioLift(warehouse, monthIdx)` — get ratio for a warehouse
- `openSeasonalModal()` / `closeSeasonalModal()` — modal control
- `saveSeasonalConfig()` — save config to state
- `resetSeasonalDefaults()` — reset to presets
- `initSeasonalConfig()` — called after file import to auto-detect countries

### Modified Files
- **`calc-engine.js`** — integrate `ratioLift` into `runCalculation()`, `recalcRow()`, `applyDOI()`
- **`table-renderer.js`** — add "Ratio Lift" column
- **`app.js`** — add `seasonalConfig` to state, load/save config
- **`index.html`** — add modal HTML, add trigger button in Config Card
- **`css/styles.css`** — modal styles, ratio cell colors
- **`js/i18n.js`** — add translations for modal labels
- **`js/export.js`** — include ratio lift in Excel export

## Verification Plan

### Manual Testing (via browser)
1. Load demo data → open Seasonal Ratio modal → verify preset values display
2. Change warehouse country dropdown → verify ratio updates
3. Edit a ratio cell → Apply → verify calculation results change
4. Toggle "Enable Seasonal Ratio" off → verify all ratios revert to 1.0
5. Reset to Defaults → verify presets restore
6. Export Excel → verify ratio lift column present
