# Live Demo

Interactive examples of `@sourcentis/chartjs-gauge` — all loaded via CDN, no build step required.

<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@sourcentis/chartjs-gauge@latest/dist/chartjs-gauge.min.js"></script>

<style>
.demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    margin: 24px 0;
}
.demo-card {
    background: #fff;
    border: 1px solid #e1e4e5;
    border-radius: 8px;
    padding: 20px 16px 24px;
}
.demo-card h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 4px;
    color: #333;
    border: none;
}
.demo-card p {
    font-size: 0.78rem;
    color: #888;
    margin: 0 0 14px;
}
.demo-card canvas { display: block; }
.slider-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
}
.slider-row label { font-size: 0.8rem; color: #555; white-space: nowrap; }
input[type=range] {
    flex: 1;
    -webkit-appearance: none;
    height: 5px;
    border-radius: 3px;
    background: #ddd;
    outline: none;
    cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #2980b9;
    cursor: pointer;
}
.slider-val { font-size: 0.82rem; font-weight: 700; color: #2980b9; min-width: 32px; text-align: right; }
.demo-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 12px;
    margin-top: 8px;
    justify-content: center;
}
.demo-legend span {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.74rem;
    color: #777;
}
.demo-legend i {
    width: 8px; height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}
</style>

<div class="demo-grid">

  <!-- 1. Interactive -->
  <div class="demo-card">
    <h3>Interactive</h3>
    <p>Move the slider to animate the needle</p>
    <canvas id="d-interactive"></canvas>
    <div class="slider-row">
      <label>Value</label>
      <input type="range" id="d-slider" min="0" max="100" value="65">
      <span class="slider-val" id="d-slider-val">65</span>
    </div>
    <div class="demo-legend">
      <span><i style="background:#E15759"></i>Low (0–33)</span>
      <span><i style="background:#F28E2B"></i>Medium (33–66)</span>
      <span><i style="background:#59A14F"></i>Good (66–100)</span>
    </div>
  </div>

  <!-- 2. Maturity score -->
  <div class="demo-card">
    <h3>Maturity score</h3>
    <p>4 zones · text formatter</p>
    <canvas id="d-maturity"></canvas>
    <div class="demo-legend">
      <span><i style="background:#d32f2f"></i>Critical</span>
      <span><i style="background:#f57c00"></i>At risk</span>
      <span><i style="background:#fbc02d"></i>Acceptable</span>
      <span><i style="background:#388e3c"></i>Mastered</span>
    </div>
  </div>

  <!-- 3. Negative minValue -->
  <div class="demo-card">
    <h3>Temperature — negative minValue</h3>
    <p>From −30 °C to +50 °C</p>
    <canvas id="d-temp"></canvas>
    <div class="demo-legend">
      <span><i style="background:#4e79a7"></i>Frost</span>
      <span><i style="background:#76b7b2"></i>Cold</span>
      <span><i style="background:#59a14f"></i>Mild</span>
      <span><i style="background:#f28e2b"></i>Warm</span>
      <span><i style="background:#e15759"></i>Hot</span>
    </div>
  </div>

  <!-- 4. 360° -->
  <div class="demo-card">
    <h3>Full-circle 360° gauge</h3>
    <p>circumference: 360 · cutout: 70%</p>
    <canvas id="d-360"></canvas>
  </div>

  <!-- 5. Thin ring -->
  <div class="demo-card">
    <h3>Thin ring — cutout 80%</h3>
    <p>Minimalist style</p>
    <canvas id="d-thin"></canvas>
  </div>

  <!-- 6. Hidden label -->
  <div class="demo-card">
    <h3>Hidden label · Thin needle</h3>
    <p>valueLabel: { display: false } · widthPercentage: 1.5</p>
    <canvas id="d-nolabel"></canvas>
  </div>

</div>

<script>
(function () {
    const DUR = 1200;

    function mkGauge(id, value, data, colors, opts) {
        opts = opts || {};
        return new Chart(document.getElementById(id), {
            type: 'gauge',
            data: { datasets: [{ value: value, data: data, backgroundColor: colors, ...(opts.ds || {}) }] },
            options: {
                responsive: true,
                needle: Object.assign({ radiusPercentage: 2, widthPercentage: 3.2, lengthPercentage: 80, color: 'rgba(20,20,20,.85)' }, opts.needle || {}),
                valueLabel: Object.assign({ display: true, color: '#fff', borderRadius: 5, padding: { top: 5, right: 10, bottom: 5, left: 10 } }, opts.label || {}),
                animation: { duration: DUR },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                ...(opts.chart || {}),
            }
        });
    }

    /* 1 - Interactive */
    var interChart = mkGauge('d-interactive', 65, [33, 66, 100],
        ['#E15759', '#F28E2B', '#59A14F'],
        { label: { formatter: function(v) { return typeof v === 'number' ? v + ' %' : ''; } } }
    );
    var slider = document.getElementById('d-slider');
    var sliderVal = document.getElementById('d-slider-val');
    slider.addEventListener('input', function () {
        var v = +slider.value;
        sliderVal.textContent = v;
        interChart.data.datasets[0].value = v;
        interChart.update();
    });

    /* 2 - Maturity */
    mkGauge('d-maturity', 72, [25, 50, 75, 100],
        ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c'],
        { label: { fontSize: 13, formatter: function(v) {
            if (typeof v !== 'number') return '';
            return v >= 75 ? 'Mastered' : v >= 50 ? 'Acceptable' : v >= 25 ? 'At risk' : 'Critical';
        }}}
    );

    /* 3 - Temperature */
    new Chart(document.getElementById('d-temp'), {
        type: 'gauge',
        data: { datasets: [{ value: 22, minValue: -30, data: [-10, 0, 15, 35, 50], backgroundColor: ['#4e79a7','#76b7b2','#59a14f','#f28e2b','#e15759'] }] },
        options: {
            responsive: true,
            needle: { radiusPercentage: 2, widthPercentage: 3.2, lengthPercentage: 80, color: 'rgba(20,20,20,.85)' },
            valueLabel: { display: true, formatter: function(v) { return typeof v === 'number' ? v + ' °C' : ''; }, color: '#fff', borderRadius: 5, padding: { top: 5, right: 10, bottom: 5, left: 10 } },
            animation: { duration: DUR },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
        }
    });

    /* 4 - 360° */
    mkGauge('d-360', 270, [90, 180, 270, 360],
        ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2'],
        { chart: { rotation: -180, circumference: 360, cutout: '70%' }, label: { formatter: function(v) { return typeof v === 'number' ? v + '°' : ''; } } }
    );

    /* 5 - Thin ring */
    mkGauge('d-thin', 81, [40, 80, 100],
        ['#fc5c7d', '#6a3093', '#56ab2f'],
        { chart: { cutout: '80%' }, needle: { lengthPercentage: 95, widthPercentage: 2, radiusPercentage: 1.5 }, label: { formatter: function(v) { return typeof v === 'number' ? v + ' / 100' : ''; }, fontSize: 11 } }
    );

    /* 6 - No label */
    mkGauge('d-nolabel', 48, [33, 66, 100],
        ['#667eea', '#764ba2', '#f093fb'],
        { needle: { widthPercentage: 1.5, lengthPercentage: 90, color: '#fff' }, label: { display: false } }
    );
})();
</script>

