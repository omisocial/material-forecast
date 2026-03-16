// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Chart Renderer (DOI Chart)
// ══════════════════════════════════════════════════════════════════

let doiChart = null;

function renderChart() {
  const data = state.filteredResults || [];
  const topN = parseInt(document.getElementById('chart-top').value) || 0;
  const sorted = [...data].sort((a, b) => a.doiAfter - b.doiAfter);
  const chartData = topN > 0 ? sorted.slice(0, topN) : sorted;

  const labels = chartData.map(r => r.sku);
  const values = chartData.map(r => r.doiAfter);
  const colors = values.map(v => v < 20 ? '#ef4444' : v < 30 ? '#f59e0b' : v < 60 ? '#22c55e' : '#3b82f6');

  const ctx = document.getElementById('doi-chart').getContext('2d');
  if (doiChart) doiChart.destroy();

  doiChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'DOI (days)', data: values, backgroundColor: colors, borderRadius: 4, maxBarThickness: 40 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        annotation: {
          annotations: {
            dangerLine: { type: 'line', yMin: 20, yMax: 20, borderColor: '#ef4444', borderWidth: 1.5, borderDash: [4, 4], label: { display: true, content: 'DOI=20', position: 'start', backgroundColor: '#ef4444', font: { size: 10 } } },
            warnLine: { type: 'line', yMin: 30, yMax: 30, borderColor: '#f59e0b', borderWidth: 1.5, borderDash: [4, 4], label: { display: true, content: 'DOI=30', position: 'start', backgroundColor: '#f59e0b', font: { size: 10 } } },
            targetLine: { type: 'line', yMin: state.doiTarget, yMax: state.doiTarget, borderColor: '#3b82f6', borderWidth: 2, label: { display: true, content: `Target=${state.doiTarget}`, position: 'end', backgroundColor: '#3b82f6', font: { size: 10 } } },
          }
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `DOI: ${ctx.parsed.y} days`,
            afterLabel: ctx => {
              const r = chartData[ctx.dataIndex];
              return `Inv: ${r.stock} | Demand: ${r.demand} | Batch: ${r.qtyBatch}`;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
        x: { ticks: { maxRotation: 45, font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function toggleView(view) {
  const tableView = document.getElementById('view-table');
  const chartView = document.getElementById('view-chart');
  const tabTable = document.getElementById('tab-table');
  const tabChart = document.getElementById('tab-chart');

  if (view === 'table') {
    tableView.classList.remove('hidden');
    chartView.classList.add('hidden');
    tabTable.classList.add('active');
    tabChart.classList.remove('active');
  } else {
    tableView.classList.add('hidden');
    chartView.classList.remove('hidden');
    tabTable.classList.remove('active');
    tabChart.classList.add('active');
    renderChart();
  }
}
