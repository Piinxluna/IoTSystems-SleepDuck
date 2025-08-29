// ================== Mock Data (1 hr, every 5 min) ==================
const mock = [
  { "t": "2025-08-28T23:00:00+07:00", "score": 55, "hr": 66, "motion": 6, "lux": 8, "db": 31, "hum": 56, "temp": 26.5 },
  { "t": "2025-08-28T23:05:00+07:00", "score": 57, "hr": 64, "motion": 5, "lux": 6, "db": 30, "hum": 56, "temp": 26.4 },
  { "t": "2025-08-28T23:10:00+07:00", "score": 60, "hr": 62, "motion": 4, "lux": 5, "db": 28, "hum": 55, "temp": 26.3 },
  { "t": "2025-08-28T23:15:00+07:00", "score": 62, "hr": 61, "motion": 4, "lux": 4, "db": 29, "hum": 55, "temp": 26.3 },
  { "t": "2025-08-28T23:20:00+07:00", "score": 64, "hr": 60, "motion": 3, "lux": 3, "db": 28, "hum": 54, "temp": 26.2 },
  { "t": "2025-08-28T23:25:00+07:00", "score": 66, "hr": 59, "motion": 3, "lux": 3, "db": 27, "hum": 54, "temp": 26.2 },
  { "t": "2025-08-28T23:30:00+07:00", "score": 68, "hr": 58, "motion": 2, "lux": 2, "db": 27, "hum": 53, "temp": 26.1 },
  { "t": "2025-08-28T23:35:00+07:00", "score": 70, "hr": 58, "motion": 2, "lux": 2, "db": 26, "hum": 53, "temp": 26.1 },
  { "t": "2025-08-28T23:40:00+07:00", "score": 69, "hr": 60, "motion": 3, "lux": 2, "db": 35, "hum": 53, "temp": 26.0 },
  { "t": "2025-08-28T23:45:00+07:00", "score": 67, "hr": 63, "motion": 4, "lux": 3, "db": 38, "hum": 52, "temp": 26.0 },
  { "t": "2025-08-28T23:50:00+07:00", "score": 65, "hr": 65, "motion": 5, "lux": 4, "db": 32, "hum": 52, "temp": 26.1 },
  { "t": "2025-08-28T23:55:00+07:00", "score": 66, "hr": 62, "motion": 3, "lux": 3, "db": 29, "hum": 52, "temp": 26.0 }
];

// Format labels as HH:mm for category axis
const labels = mock.map(d => new Date(d.t)).map(d =>
  d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
);

// Extract series
const series = {
  score: mock.map(d => d.score),
  hr: mock.map(d => d.hr),
  motion: mock.map(d => d.motion),
  lux: mock.map(d => d.lux),
  db: mock.map(d => d.db),
  hum: mock.map(d => d.hum),
  temp: mock.map(d => d.temp),
};

// KPI (last point)
const last = mock[mock.length - 1];

// Set header date + KPI numbers
(function setHeaderAndKPI() {
  const today = new Date();
  const todayString = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric'
  });
  document.getElementById('today-date').innerText = todayString;

  document.getElementById('kpi-score').innerText = `${last.score}`;
  document.getElementById('kpi-hr').innerText = `${last.hr}`;
  document.getElementById('kpi-motion').innerText = `${last.motion}`;
  document.getElementById('kpi-light').innerText = `${last.lux}`;
  document.getElementById('kpi-sound').innerText = `${last.db}`;
  document.getElementById('kpi-hum').innerText = `${last.hum}`;
  document.getElementById('kpi-temp').innerText = `${last.temp.toFixed(1)}`;
})();


// ================== Chart Helpers ==================
function movingAverage(arr, windowSize = 3) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = arr.slice(start, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

// Plugin: draw comfort band (yMin..yMax)
const ComfortBandPlugin = {
  id: 'comfortBand',
  beforeDatasetsDraw(chart, args, pluginOptions) {
    const { ctx, chartArea: area, scales: { y } } = chart;
    if (!pluginOptions || pluginOptions.yMin == null || pluginOptions.yMax == null) {
      return;
    }
    ctx.save();
    ctx.fillStyle = pluginOptions.color || 'rgba(56,189,248,0.12)'; // light cyan
    const yTop = y.getPixelForValue(pluginOptions.yMax);
    const yBot = y.getPixelForValue(pluginOptions.yMin);
    ctx.fillRect(area.left, Math.min(yTop, yBot), area.right - area.left, Math.abs(yBot - yTop));
    ctx.restore();
  }
};

// Plugin: draw horizontal lines (thresholds)
const HLinePlugin = {
  id: 'hLines',
  beforeDatasetsDraw(chart, args, pluginOptions) {
    const { ctx, chartArea: area, scales: { y } } = chart;
    if (!pluginOptions || !Array.isArray(pluginOptions.lines)) {
      return;
    }
    ctx.save();
    pluginOptions.lines.forEach(l => {
      const yPix = y.getPixelForValue(l.value);
      ctx.strokeStyle = l.color || 'rgba(148,163,184,0.7)';
      ctx.setLineDash(l.dash || [6, 4]);
      ctx.lineWidth = l.width || 1;
      ctx.beginPath();
      ctx.moveTo(area.left, yPix);
      ctx.lineTo(area.right, yPix);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }
};

// Plugin: put big text in center for gauge
const CenterTextPlugin = {
  id: 'centerText',
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx, chartArea } = chart;
    const v = pluginOptions && pluginOptions.value != null ? pluginOptions.value : 0;
    const label = v >= 75 ? 'Good' : (v >= 50 ? 'Average' : 'Poor');
    const color = v >= 75 ? '#22c55e' : (v >= 50 ? '#eab308' : '#ef4444');
    ctx.save();
    ctx.font = '700 28px system-ui';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = (chartArea.left + chartArea.right) / 2;
    // place a bit lower since semicircle
    const y = chartArea.bottom - 70;
    ctx.fillText(`${v}`, x, y - 28);
    ctx.font = '600 14px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(label, x, y);
    ctx.restore();
  }
};

// Register plugins globally (or pass per-chart)
Chart.register(ComfortBandPlugin, HLinePlugin);


// ================== Charts ==================

// 1) Sleep Gauge (semi-doughnut)
(function initGauge() {
  const ctx = document.getElementById('chart-gauge');
  const { score } = last;
  const bg = '#f1f5f9';
  const color = score >= 75 ? '#22c55e' : (score >= 50 ? '#eab308' : '#ef4444');

  new Chart(ctx, {
    type: 'doughnut',
    plugins: [CenterTextPlugin],
    data: {
      labels: ['Score', 'Remain'],
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [color, bg],
        borderWidth: 0,
        circumference: 180,
        rotation: -90,
        cutout: '70%',
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        centerText: { value: score }
      },
      responsive: true
    }
  });
})();


// 2) Heart Rate line (with moving average)
(function initHR() {
  const ctx = document.getElementById('heart-rate-chart');
  const ma = movingAverage(series.hr, 2);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'HR (BPM)', data: series.hr, borderWidth: 2, tension: 0.2 },
        { label: 'HR (avg)', data: ma, borderWidth: 1, borderDash: [6, 4], tension: 0.2 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' }, beginAtZero: false, suggestedMin: 50, suggestedMax: 80 }
      }
    }
  });
})();


// 3) Motion bar (with thresholds)
(function initMotion() {
  const ctx = document.getElementById('motion-chart');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Motion (events/min)', data: series.motion }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        hLines: {
          lines: [
            { value: 20, color: 'rgba(234,179,8,0.8)', dash: [8, 4], width: 1 },
            { value: 40, color: 'rgba(239,68,68,0.9)', dash: [8, 4], width: 1 },
          ]
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' }, beginAtZero: true, suggestedMax: 50 }
      }
    }
  });
})();


// 4) Light area + thresholds
(function initLight() {
  const ctx = document.getElementById('light-chart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Light (lux)',
        data: series.lux,
        fill: true,
        borderWidth: 2,
        tension: 0.25
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        hLines: {
          lines: [
            { value: 3, color: 'rgba(34,197,94,0.9)', dash: [6, 4] },
            { value: 30, color: 'rgba(234,179,8,0.9)', dash: [6, 4] },
          ]
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' }, beginAtZero: true, suggestedMax: 60 }
      }
    }
  });
})();


// 5) Sound line + thresholds
(function initSound() {
  const ctx = document.getElementById('sound-chart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Sound (dB)', data: series.db, borderWidth: 2, tension: 0.2 }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        hLines: {
          lines: [
            { value: 30, color: 'rgba(34,197,94,0.9)', dash: [6, 4] },
            { value: 70, color: 'rgba(239,68,68,0.9)', dash: [6, 4] }
          ]
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' }, beginAtZero: true, suggestedMax: 80 }
      }
    }
  });
})();


// 6) Humidity with comfort band 40–60%RH
(function initHum() {
  const ctx = document.getElementById('humidity-chart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Humidity (%RH)', data: series.hum, borderWidth: 2, tension: 0.2 }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        comfortBand: { yMin: 40, yMax: 60, color: 'rgba(56,189,248,0.13)' }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' }, beginAtZero: false, suggestedMin: 40, suggestedMax: 65 }
      }
    }
  });
})();


// 7) Temperature with comfort band 24–28°C
(function initTemp() {
  const ctx = document.getElementById('temperature-chart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Temperature (°C)', data: series.temp, borderWidth: 2, tension: 0.2 }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        comfortBand: { yMin: 24, yMax: 28, color: 'rgba(56,189,248,0.13)' }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' }, beginAtZero: false, suggestedMin: 24, suggestedMax: 29 }
      }
    }
  });
})();
