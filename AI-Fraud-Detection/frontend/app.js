// ============================================================
// app.js — ShieldAI Frontend JavaScript
// Handles: routing, API calls, Chart.js rendering, live sim
// ============================================================

const API = '';  // same-origin (FastAPI serves both)

// ── Chart instances (kept for update/destroy) ──────────────
let riskPieChart   = null;
let probLineChart  = null;
let typeBarChart   = null;
let simPieChart    = null;
let simBarChart    = null;
let gaugeChart     = null;

// ── Simulation state ───────────────────────────────────────
let simRunning = false;
let simData    = [];

// ============================================================
// ROUTER — show/hide pages via nav buttons
// ============================================================
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${page}`).classList.add('active');
    if (page === 'dashboard') loadDashboard();
  });
});

// ============================================================
// THEME TOGGLE
// ============================================================
const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  document.body.classList.toggle('light', !isDark);
  themeBtn.textContent = isDark ? '🌙' : '☀️';
  // Re-render charts with new palette
  loadDashboard();
});

// ============================================================
// HEALTH CHECK — model status indicator
// ============================================================
async function checkHealth() {
  const pill = document.getElementById('modelStatus');
  const dot  = pill.querySelector('.status-dot');
  const txt  = pill.querySelector('.status-text');
  try {
    const res  = await fetch(`${API}/health`);
    const data = await res.json();
    if (data.models_loaded) {
      pill.classList.add('ready');
      txt.textContent = 'Models Ready';
    } else {
      pill.classList.add('error');
      txt.textContent = 'Models Missing';
    }
  } catch {
    pill.classList.add('error');
    txt.textContent = 'API Offline';
  }
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'info', ms = 3000) {
  const t = document.getElementById('toast');
  t.textContent   = msg;
  t.className     = `toast ${type}`;
  setTimeout(() => { t.classList.add('hidden'); }, ms);
}

// ============================================================
// DASHBOARD — load stats + charts
// ============================================================
async function loadDashboard() {
  try {
    const [statsRes, histRes] = await Promise.all([
      fetch(`${API}/stats`),
      fetch(`${API}/history?limit=50`),
    ]);
    const stats   = await statsRes.json();
    const histObj = await histRes.json();
    const history = histObj.transactions || [];

    // Update stat cards
    document.getElementById('val-total').textContent = stats.total || 0;
    document.getElementById('val-high').textContent  = stats.high_risk || 0;
    document.getElementById('val-med').textContent   = stats.medium_risk || 0;
    document.getElementById('val-low').textContent   = stats.low_risk || 0;
    document.getElementById('val-avg').textContent   =
      stats.avg_fraud_probability ? `${stats.avg_fraud_probability}%` : '—';

    // ── Pie chart — risk distribution
    renderPie('riskPieChart', riskPieChart, [
      stats.high_risk   || 0,
      stats.medium_risk || 0,
      stats.low_risk    || 0,
    ], ['High Risk', 'Medium Risk', 'Low Risk'],
       ['#ef4444', '#f59e0b', '#10b981']);

    // ── Line chart — fraud prob timeline (last 40)
    const recent  = [...history].reverse().slice(0, 40);
    const labels  = recent.map((_, i) => `#${i + 1}`);
    const probs   = recent.map(h => h.fraud_probability);
    const colors  = recent.map(h =>
      h.status.startsWith('HIGH')   ? '#ef4444' :
      h.status.startsWith('MEDIUM') ? '#f59e0b' : '#10b981'
    );
    renderLine('probLineChart', probLineChart, labels, probs, colors);

    // ── Bar chart — transaction types
    const typeCounts = stats.type_breakdown || {};
    renderTypeBar('typeBarChart', typeBarChart, typeCounts);

    // ── History table
    renderHistoryTable(history);

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// ============================================================
// CHART HELPERS
// ============================================================
function chartDefaults() {
  const isDark = document.body.classList.contains('dark');
  return {
    textColor : isDark ? '#9ea3c0' : '#475569',
    gridColor : isDark ? 'rgba(45,51,80,0.6)' : 'rgba(203,213,225,0.6)',
    bgCard    : isDark ? '#1e2235' : '#ffffff',
  };
}

function destroyChart(instance) {
  if (instance) { try { instance.destroy(); } catch {} }
}

function renderPie(id, instance, data, labels, colors) {
  destroyChart(instance);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  const { textColor } = chartDefaults();
  return new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, padding: 16, font: { size: 12 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } },
      },
      cutout: '60%',
    },
  });
}

function renderLine(id, instance, labels, data, pointColors) {
  destroyChart(instance);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  const { textColor, gridColor } = chartDefaults();
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Fraud Probability (%)',
        data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        pointBackgroundColor: pointColors,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
        annotation: {},
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: {
          min: 0, max: 100,
          ticks: { color: textColor, callback: v => `${v}%` },
          grid: { color: gridColor },
        },
      },
    },
  });
}

function renderTypeBar(id, instance, typeCounts) {
  destroyChart(instance);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  const { textColor, gridColor } = chartDefaults();
  const labels = Object.keys(typeCounts);
  const data   = Object.values(typeCounts);
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Count',
        data,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderRadius: 6,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } },
      },
    },
  });
}

function renderHistoryTable(history) {
  const tbody = document.getElementById('historyBody');
  if (!history.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No transactions yet — run a simulation or analyze one.</td></tr>`;
    return;
  }
  tbody.innerHTML = history.slice(0, 20).map((h, i) => {
    const badge = statusBadge(h.status);
    const anom  = h.anomaly ? '<span class="badge badge-warning">Yes</span>' : '—';
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${h.type || '—'}</td>
        <td>$${Number(h.amount || 0).toLocaleString()}</td>
        <td style="font-weight:600">${h.fraud_probability}%</td>
        <td>${anom}</td>
        <td>${badge}</td>
        <td style="font-size:11px;color:var(--text-muted)">${h.action || ''}</td>
      </tr>`;
  }).join('');
}

function statusBadge(status) {
  if (status.startsWith('HIGH'))   return `<span class="badge badge-danger">${status}</span>`;
  if (status.startsWith('MEDIUM')) return `<span class="badge badge-warning">${status}</span>`;
  if (status.includes('CONTEXT'))  return `<span class="badge badge-info">${status}</span>`;
  return `<span class="badge badge-success">${status}</span>`;
}

// ============================================================
// ANALYZE PAGE — scenario prefill
// ============================================================
const SCENARIOS = {
  normal     : { amount: 500,   type: 'PAYMENT',  oldBal: 10000,  newBal: 9500,   custAvg: 2000,  familiar: true  },
  suspicious : { amount: 90000, type: 'TRANSFER',  oldBal: 100000, newBal: 10000,  custAvg: 2000,  familiar: false },
  highvalue  : { amount: 80000, type: 'TRANSFER',  oldBal: 200000, newBal: 120000, custAvg: 90000, familiar: true  },
};

function fillScenario(key) {
  const s = SCENARIOS[key];
  if (!s) return;
  document.getElementById('f-amount').value   = s.amount;
  document.getElementById('f-type').value     = s.type;
  document.getElementById('f-old-bal').value  = s.oldBal;
  document.getElementById('f-new-bal').value  = s.newBal;
  document.getElementById('f-cust-avg').value = s.custAvg;
  document.getElementById('f-familiar').checked = s.familiar;
  showToast(`Loaded: ${key} scenario`, 'info', 1500);
}

// ── Form submit ─────────────────────────────────────────────
document.getElementById('txForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('analyzeBtn');

  // Show loading state
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Analyzing...`;

  const payload = {
    amount                  : parseFloat(document.getElementById('f-amount').value),
    transaction_type        : document.getElementById('f-type').value,
    old_balance             : parseFloat(document.getElementById('f-old-bal').value) || 0,
    new_balance             : parseFloat(document.getElementById('f-new-bal').value) || 0,
    destination_old_balance : parseFloat(document.getElementById('f-dest-old').value) || 0,
    destination_new_balance : parseFloat(document.getElementById('f-dest-new').value) || 0,
    customer_avg_amount     : parseFloat(document.getElementById('f-cust-avg').value) || null,
    familiar_pattern        : document.getElementById('f-familiar').checked,
  };

  try {
    const res  = await fetch(`${API}/predict`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const result = await res.json();
    renderResult(result);
    showToast('Transaction analyzed', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error', 5000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon">🔍</span><span class="btn-text">Analyze Transaction</span>`;
  }
});

function renderResult(r) {
  // Show result panel
  document.getElementById('resultEmpty').classList.add('hidden');
  const content = document.getElementById('resultContent');
  content.classList.remove('hidden');

  // Risk banner
  const banner = document.getElementById('riskBanner');
  banner.className = 'risk-banner';
  const riskClass = r.status.startsWith('HIGH') ? 'high' :
                    r.status.startsWith('MEDIUM') ? 'medium' : 'low';
  banner.classList.add(riskClass);

  document.getElementById('riskEmoji').textContent =
    r.status.startsWith('HIGH') ? '🔴' : r.status.startsWith('MEDIUM') ? '🟡' : '🟢';
  document.getElementById('riskStatus').textContent = r.status;
  document.getElementById('riskAction').textContent = r.action;

  // Gauge
  renderGauge(r.fraud_probability);
  document.getElementById('gaugeValue').textContent = r.fraud_probability;

  // Chips
  const probChip = document.getElementById('chip-prob');
  probChip.className = `chip ${riskClass}`;
  document.getElementById('detail-prob').textContent = `${r.fraud_probability}%`;

  const anomChip = document.getElementById('chip-anomaly');
  anomChip.className = `chip ${r.anomaly ? 'anom' : ''}`;
  document.getElementById('detail-anomaly').textContent = r.anomaly ? '⚠️ YES' : '✅ NO';
  document.getElementById('detail-score').textContent = r.anomaly_score;

  // Reasons
  const list = document.getElementById('reasonsList');
  list.innerHTML = (r.reasons || []).map(reason =>
    `<li>${reason}</li>`
  ).join('');
}

function renderGauge(prob) {
  destroyChart(gaugeChart);
  const ctx = document.getElementById('gaugeChart');
  if (!ctx) return;

  const color = prob >= 80 ? '#ef4444' : prob >= 30 ? '#f59e0b' : '#10b981';
  const remaining = 100 - prob;

  gaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data            : [prob, remaining],
        backgroundColor : [color, 'rgba(255,255,255,0.05)'],
        borderWidth     : 0,
        circumference   : 180,
        rotation        : 270,
      }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

// ============================================================
// SIMULATE PAGE
// ============================================================
async function startSimulation() {
  if (simRunning) return;

  const n   = parseInt(document.getElementById('sim-count').value) || 20;
  const mix = parseFloat(document.getElementById('sim-mix').value) || 20;

  simRunning = true;
  simData    = [];
  document.getElementById('simStartBtn').disabled = true;
  document.getElementById('simStartBtn').innerHTML = `<span class="spinner"></span> Running...`;
  document.getElementById('simLiveStats').classList.remove('hidden');

  // Reset counters
  updateSimCounters(0, 0, 0, 0);

  // Clear table
  document.getElementById('simBody').innerHTML =
    `<tr><td colspan="6" class="empty-row">Running simulation...</td></tr>`;

  try {
    const res  = await fetch(`${API}/simulate`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ n_transactions: n, fraud_mix_pct: mix }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    simData = data.transactions || [];

    // Render results with animated row-by-row display
    await animateSimResults(simData);
    showToast(`Simulation complete — ${simData.length} transactions scored`, 'success');

  } catch (err) {
    showToast(`Simulation error: ${err.message}`, 'error', 5000);
  } finally {
    simRunning = false;
    document.getElementById('simStartBtn').disabled = false;
    document.getElementById('simStartBtn').innerHTML = `▶ Run Simulation`;
  }
}

async function animateSimResults(transactions) {
  const tbody  = document.getElementById('simBody');
  tbody.innerHTML = '';

  let high = 0, med = 0, low = 0;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    // Count
    if (tx.status.startsWith('HIGH'))   high++;
    else if (tx.status.startsWith('MEDIUM')) med++;
    else                                 low++;

    updateSimCounters(high, med, low, i + 1);

    // Add row to table (prepend = newest first)
    const row = document.createElement('tr');
    row.style.opacity = '0';
    row.style.transition = 'opacity 0.3s ease';
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${tx.type}</td>
      <td>$${Number(tx.amount).toLocaleString()}</td>
      <td style="font-weight:600">${tx.fraud_probability}%</td>
      <td>${tx.anomaly ? '<span class="badge badge-warning">Yes</span>' : '—'}</td>
      <td>${statusBadge(tx.status)}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
    // Fade in
    setTimeout(() => { row.style.opacity = '1'; }, 10);

    // Update charts every 5 rows or on last
    if ((i + 1) % 5 === 0 || i === transactions.length - 1) {
      updateSimCharts(transactions.slice(0, i + 1), high, med, low);
    }

    // Small visual delay between rows
    if (i < transactions.length - 1) {
      await sleep(60);
    }
  }
}

function updateSimCounters(high, med, low, total) {
  document.getElementById('simHighCount').textContent  = high;
  document.getElementById('simMedCount').textContent   = med;
  document.getElementById('simLowCount').textContent   = low;
  document.getElementById('simTotalCount').textContent = total;
}

function updateSimCharts(txs, high, med, low) {
  // Pie
  simPieChart = renderPie(
    'simPieChart', simPieChart,
    [high, med, low],
    ['High Risk', 'Medium Risk', 'Low Risk'],
    ['#ef4444', '#f59e0b', '#10b981']
  );

  // Bar
  destroyChart(simBarChart);
  const ctx = document.getElementById('simBarChart');
  if (!ctx) return;
  const { textColor, gridColor } = chartDefaults();
  const labels = txs.map((_, i) => `#${i + 1}`);
  const data   = txs.map(t => t.fraud_probability);
  const bgColors = txs.map(t =>
    t.status.startsWith('HIGH')   ? '#ef4444' :
    t.status.startsWith('MEDIUM') ? '#f59e0b' : '#10b981'
  );

  simBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Fraud Probability (%)',
        data,
        backgroundColor: bgColors,
        borderRadius: 4,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: textColor, maxTicksLimit: 15 }, grid: { display: false } },
        y: {
          min: 0, max: 100,
          ticks: { color: textColor, callback: v => `${v}%` },
          grid: { color: gridColor },
        },
      },
    },
  });
}

// ============================================================
// CLEAR HISTORY
// ============================================================
async function clearHistory() {
  try {
    await fetch(`${API}/history`, { method: 'DELETE' });
    showToast('History cleared', 'info');
    loadDashboard();
  } catch (err) {
    showToast('Could not clear history', 'error');
  }
}

// ============================================================
// UTILITY
// ============================================================
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// ============================================================
// INIT
// ============================================================
(async function init() {
  await checkHealth();
  loadDashboard();

  // Auto-refresh dashboard stats every 30 seconds
  setInterval(() => {
    const activePage = document.querySelector('.page.active');
    if (activePage && activePage.id === 'page-dashboard') {
      loadDashboard();
    }
  }, 30_000);
})();
