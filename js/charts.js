/**
 * ChartsManager - Real-Time Dark Neon Industrial Waveform Charts
 * Uses Chart.js with a high-contrast cyber theme and streaming buffers.
 *
 * Axis rules
 *  - Every axis starts at 0.
 *  - Every chart has a generous default upper limit, and the limit grows
 *    automatically if the data ever goes higher, so a line can never leave the box.
 */

// Round a value UP to a "nice" axis limit (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 x 10^n)
function niceCeil(v) {
  if (!isFinite(v) || v <= 0) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / base;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const s of steps) {
    if (f <= s + 1e-9) return +(s * base).toPrecision(12);
  }
  return 10 * base;
}

class ChartsManager {
  constructor(dataService) {
    this.dataService = dataService;
    this.charts = {};
    this.isPaused = false;
    this.currentRange = 'live';

    // Samples shown per time window (one sample every 1.5 s)
    this.WINDOWS = { live: 20, '5m': 200, '15m': 600, '1h': 2400 };

    // Chart definitions. `max` = default upper limit (axis always starts at 0).
    this.defs = [
      { key: 'power',      canvas: 'chartPower',      val: 'chartValPower',      unit: 'W',   color: '#818cf8', fill: 'rgba(129, 140, 248, 0.12)', max: 6,     dynamic: true,  fmt: v => `${Number(v).toFixed(2)} W` },
      { key: 'current',    canvas: 'chartCurrent',    val: 'chartValCurrent',    unit: 'mA',  color: '#38bdf8', fill: 'rgba(56, 189, 248, 0.12)',  max: 1000,  dynamic: true,  fmt: v => `${v} mA` },
      { key: 'voltage',    canvas: 'chartVoltage',    val: 'chartValVoltage',    unit: 'V',   color: '#00e5ff', fill: 'rgba(0, 229, 255, 0.12)',   max: 8,     dynamic: true,  fmt: v => `${Number(v).toFixed(2)} V` },
      { key: 'brightness', canvas: 'chartBrightness', val: 'chartValBrightness', unit: '%',   color: '#fbbf24', fill: 'rgba(251, 191, 36, 0.12)',  max: 105,   dynamic: false, fmt: v => `${v} %` },
      { key: 'ldr',        canvas: 'chartLdr',        val: 'chartValLdr',        unit: 'Lux', color: '#a855f7', fill: 'rgba(168, 85, 247, 0.12)',  max: 1000,  dynamic: true,  fmt: v => `${Number(v).toFixed(1)} Lux` },
      { key: 'energy',     canvas: 'chartEnergy',     val: 'chartValEnergy',     unit: 'kWh', color: '#34d399', fill: 'rgba(52, 211, 153, 0.12)',  max: 0.100, dynamic: true,  fmt: v => `${Number(v).toFixed(4)} kWh` }
    ];

    this.initCharts();
    this.attachDataListener();
  }

  // Base styling for dark cyber theme
  getBaseChartOptions(unit, color, max) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300,
        easing: 'easeOutQuart'
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(10, 18, 32, 0.95)',
          titleColor: '#ffffff',
          bodyColor: color,
          borderColor: 'rgba(0, 229, 255, 0.3)',
          borderWidth: 1,
          padding: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => {
              if (unit === 'kWh') {
                return `${Number(ctx.parsed.y).toFixed(4)} ${unit}`;
              }
              return `${ctx.parsed.y} ${unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            maxTicksLimit: 6
          }
        },
        y: {
          min: 0,
          max: max,
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            callback: (val) => {
              if (unit === 'kWh') {
                return Number(val).toFixed(3);
              }
              return `${val}`;
            }
          }
        }
      }
    };
  }

  initCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library not yet loaded. Will retry...');
      setTimeout(() => this.initCharts(), 500);
      return;
    }

    const history = this.dataService.history;

    this.defs.forEach(d => {
      const ctx = document.getElementById(d.canvas)?.getContext('2d');
      if (!ctx) return;
      this.charts[d.key] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [...history.labels],
          datasets: [{
            label: d.key,
            data: [...history[d.key]],
            borderColor: d.color,
            borderWidth: 2,
            backgroundColor: d.fill,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: d.color,
            pointHoverBorderColor: '#ffffff'
          }]
        },
        options: this.getBaseChartOptions(d.unit, d.color, d.max)
      });
    });

    this.refresh(true);
  }

  // Are the charts currently on screen? (the panel is hidden in "All Nodes" view)
  isVisible() {
    const panel = document.getElementById('chartsPanel');
    return !panel || panel.offsetParent !== null;
  }

  // Redraw every chart from the selected node's history
  refresh(force = false) {
    if (!force && (this.isPaused || !this.isVisible())) return;

    const history = this.dataService.history;
    const n = this.WINDOWS[this.currentRange] || this.WINDOWS.live;
    const labels = history.labels.slice(-n);

    this.defs.forEach(d => {
      const chart = this.charts[d.key];
      if (!chart) return;

      const data = history[d.key].slice(-n);
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;

      // Auto-grow the upper limit if the data ever exceeds the default
      if (d.dynamic) {
        const peak = data.length ? Math.max(...data) : 0;
        chart.options.scales.y.max = Math.max(d.max, niceCeil(peak * 1.1));
      }
      chart.options.scales.y.min = 0;
      chart.update('none');

      const last = data.length ? data[data.length - 1] : 0;
      const el = document.getElementById(d.val);
      if (el) el.textContent = d.fmt(last);
    });
  }

  // Needed after the panel was hidden (canvases measure 0px while display:none)
  resizeAll() {
    Object.values(this.charts).forEach(c => c.resize());
  }

  attachDataListener() {
    this.dataService.on('telemetry', () => this.refresh());
    this.dataService.on('selectionChange', () => this.refresh(true));
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  setTimeRange(range) {
    this.currentRange = range;
    this.refresh(true);
  }
}

window.ChartsManager = ChartsManager;
