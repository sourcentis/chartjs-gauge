# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build   # production build → dist/ (ESM + UMD + minified UMD)
npm run dev     # watch mode (rebuilds on source changes)
```

There are no tests and no linter configured.

**Always rebuild after editing `js/`** — `demo.html` loads `dist/chartjs-gauge.umd.js` directly.

## Architecture

This is a Chart.js v4 plugin exposing a `"gauge"` chart type.

### Source files

- **`js/index.js`** — entry point; auto-registers `GaugeController` + `ArcElement` with the global `Chart` instance on import.
- **`js/gauge-controller.js`** — the entire plugin logic, extending `DoughnutController`.

### Build outputs (`dist/`)

| File | Format | Use case |
|---|---|---|
| `chartjs-gauge.esm.js` | ESM | Vite / webpack / npm |
| `chartjs-gauge.umd.js` | UMD | `<script>` tag, demo |
| `chartjs-gauge.min.js` | UMD minified | CDN / Laravel assets |

`chart.js` and `chart.js/helpers` are always external (peer dependency).

### How the gauge works

**Data model** — `dataset.data` defines segment *boundaries* on the arc; `dataset.value` is the needle position (independent of segments); `dataset.minValue` offsets the range start (default `0`).

**Rendering pipeline** — `GaugeController` overrides three methods from `DoughnutController`:
1. `parse()` — reads `dataset.minValue` and `dataset.value` onto `meta`.
2. `update(mode)` — recomputes geometry (same as doughnut) + records needle animation state (`_needleFrom`, `_needleTo`, `_needleAnimStart`) for the timer-based interpolation.
3. `draw()` — calls `super.draw()` (arc segments), then `drawNeedle()`, then `drawValueLabel()`.

**Needle animation** — uses a controller-level timer + an independent `requestAnimationFrame` loop. Chart.js only calls `draw()` once after `update()` when arc properties don't change (e.g. value-only updates), so the needle can't rely on Chart.js's own animation loop. `update()` calls `_startNeedleRaf()` which drives a rAF loop for `duration` ms, calling `chart.draw()` on every frame. `drawNeedle()` computes the position using `easeInOutQuart` interpolation on `Date.now() - _needleAnimStart`.

**`formatter` caveat** — Chart.js proxies all options through a scriptable resolver that calls functions instead of returning them. `drawValueLabel()` reads the formatter directly from `chart.config._config.options.valueLabel.formatter` to bypass this.

**`calculateTotal()`** — overrides the doughnut default; computes `total = max(data) - min(data, minValue)` so the arc circumference math works with arbitrary `minValue`.

### Defaults (applied via `GaugeController.overrides`)

- `rotation: -90`, `circumference: 180`, `cutout: "50%"` → half-doughnut
- Needle: `radiusPercentage: 2`, `widthPercentage: 3.2`, `lengthPercentage: 80`, black
- Value label: displayed, dark background, white text

### Laravel / Composer

`src/ChartjsGaugeServiceProvider.php` publishes `dist/` to `public/vendor/chartjs-gauge/` via `php artisan vendor:publish --tag=chartjs-gauge-assets`. No PHP logic beyond asset publishing.
