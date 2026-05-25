(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('chart.js'), require('chart.js/helpers')) :
    typeof define === 'function' && define.amd ? define(['exports', 'chart.js', 'chart.js/helpers'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ChartjsGauge = {}, global.Chart, global.Chart.helpers));
})(this, (function (exports, chart_js, helpers) { 'use strict';

    function getRatioAndOffset(rotation, circumference, cutout, needleOpts) {
        let ratioX = 1;
        let ratioY = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (circumference < helpers.TAU) {
            const startAngle = rotation;
            const endAngle = startAngle + circumference;
            const startX = Math.cos(startAngle);
            const startY = Math.sin(startAngle);
            const endX = Math.cos(endAngle);
            const endY = Math.sin(endAngle);

            const { radiusPercentage, widthPercentage, lengthPercentage } = needleOpts;
            const needleWidth = Math.max(radiusPercentage / 100, widthPercentage / 2 / 100);
            const calcMax = (angle, a, b) =>
                helpers._angleBetween(angle, startAngle, endAngle)
                    ? Math.max(1, lengthPercentage / 100)
                    : Math.max(a, a * cutout, b, b * cutout, needleWidth);
            const calcMin = (angle, a, b) =>
                helpers._angleBetween(angle, startAngle, endAngle)
                    ? Math.min(-1, -lengthPercentage / 100)
                    : Math.min(a, a * cutout, b, b * cutout, -needleWidth);

            const maxX = calcMax(0, startX, endX);
            const maxY = calcMax(helpers.HALF_PI, startY, endY);
            const minX = calcMin(helpers.PI, startX, endX);
            const minY = calcMin(helpers.PI + helpers.HALF_PI, startY, endY);

            ratioX = (maxX - minX) / 2;
            ratioY = (maxY - minY) / 2;
            offsetX = -(maxX + minX) / 2;
            offsetY = -(maxY + minY) / 2;
        }
        return { ratioX, ratioY, offsetX, offsetY };
    }

    class GaugeController extends chart_js.DoughnutController {
        parse(start, count) {
            super.parse(start, count);
            const dataset = this.getDataset();
            const meta = this._cachedMeta;
            meta.minValue = dataset.minValue || 0;
            meta.value = dataset.value;
        }

        update(mode) {
            const chart = this.chart;
            const { chartArea } = chart;
            const meta = this._cachedMeta;
            const arcs = meta.data;
            const spacing = this.getMaxBorderWidth() + this.getMaxOffset(arcs);
            const maxSize = Math.max((Math.min(chartArea.width, chartArea.height) - spacing) / 2, 0);
            const cutout = Math.min(helpers.toPercentage(this.options.cutout, maxSize), 1);
            const chartWeight = this._getRingWeight(this.index);

            const { circumference, rotation } = this._getRotationExtents();
            const { ratioX, ratioY, offsetX, offsetY } = getRatioAndOffset(
                rotation,
                circumference,
                cutout,
                this.options.needle
            );
            const maxWidth = (chartArea.width - spacing) / ratioX;
            const maxHeight = (chartArea.height - spacing) / ratioY;
            const maxRadius = Math.max(Math.min(maxWidth, maxHeight) / 2, 0);
            const outerRadius = helpers.toDimension(this.options.radius, maxRadius);
            const innerRadius = Math.max(outerRadius * cutout, 0);
            const radiusLength = (outerRadius - innerRadius) / this._getVisibleDatasetWeightTotal();
            this.offsetX = offsetX * outerRadius;
            this.offsetY = offsetY * outerRadius;

            meta.total = this.calculateTotal();

            this.outerRadius = outerRadius - radiusLength * this._getRingWeightOffset(this.index);
            this.innerRadius = Math.max(this.outerRadius - radiusLength * chartWeight, 0);

            this.updateElements(arcs, 0, arcs.length, mode);
        }

        calculateTotal() {
            const meta = this._cachedMeta;
            const metaData = meta.data;
            let valueMin = meta.minValue;
            let valueMax = meta.minValue;

            for (let i = 0; i < metaData.length; i++) {
                const value = meta._parsed[i];
                if (value !== null && !isNaN(value) && this.chart.getDataVisibility(i)) {
                    if (value < valueMin) valueMin = value;
                    if (value > valueMax) valueMax = value;
                }
            }

            meta.minValue = valueMin;
            return valueMin !== null && !isNaN(valueMin) && valueMax !== null && !isNaN(valueMax)
                ? Math.abs(valueMax - valueMin)
                : 0;
        }

        updateElements(arcs, start, count, mode) {
            const reset = mode === "reset";
            const chart = this.chart;
            const chartArea = chart.chartArea;
            const opts = chart.options;
            const animationOpts = opts.animation;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            const animateScale = reset && animationOpts.animateScale;
            const innerRadius = animateScale ? 0 : this.innerRadius;
            const outerRadius = animateScale ? 0 : this.outerRadius;
            const firstOpts = this.resolveDataElementOptions(start, mode);
            const sharedOptions = this.getSharedOptions(firstOpts);
            const includeOptions = this.includeOptions(mode, sharedOptions);
            const rotation = this._getRotation();
            let startAngle = rotation;

            if (start > 0) startAngle = this._circumference(start, reset) + rotation;

            for (let i = start; i < start + count; ++i) {
                const endAngle = this._circumference(i, reset) + rotation;
                const arc = arcs[i];
                const properties = {
                    x: centerX + this.offsetX,
                    y: centerY + this.offsetY,
                    startAngle,
                    endAngle,
                    circumference: endAngle - startAngle,
                    outerRadius,
                    innerRadius,
                };
                if (includeOptions) {
                    properties.options = sharedOptions || this.resolveDataElementOptions(i, mode);
                }
                startAngle = endAngle;
                this.updateElement(arc, i, properties, mode);
            }
            this.updateSharedOptions(sharedOptions, mode, firstOpts);
        }

        calculateCircumference(value) {
            const total = this._cachedMeta.total;
            const minValue = this._cachedMeta.minValue;
            if (total > 0 && !isNaN(value) && !isNaN(minValue)) {
                const circumference = this._getCircumference();
                const minCircumference = (minValue * circumference) / helpers.TAU;
                return helpers.TAU * (Math.abs(value - minCircumference) / total);
            }
            return 0;
        }

        getTranslation(chart) {
            const { chartArea } = chart;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            return {
                dx: centerX + (this.offsetX || 0),
                dy: centerY + (this.offsetY || 0),
            };
        }

        drawNeedle() {
            const { ctx, chartArea } = this.chart;
            const { innerRadius, outerRadius } = this;
            const { radiusPercentage, widthPercentage, lengthPercentage, color } = this.options.needle;

            const width = chartArea.right - chartArea.left;
            const needleRadius = (radiusPercentage / 100) * width;
            const needleWidth = (widthPercentage / 100) * width;
            const needleLength = (lengthPercentage / 100) * (outerRadius - innerRadius) + innerRadius;

            const { dx, dy } = this.getTranslation(this.chart);
            const meta = this._cachedMeta;
            const circumference = this._getCircumference();
            const rotation = this._getRotation();
            const angle = this.calculateCircumference((meta.value * circumference) / helpers.TAU) + rotation;

            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(angle);
            ctx.fillStyle = color;

            ctx.beginPath();
            ctx.ellipse(0, 0, needleRadius, needleRadius, 0, 0, helpers.TAU);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, needleWidth / 2);
            ctx.lineTo(needleLength, 0);
            ctx.lineTo(0, -needleWidth / 2);
            ctx.fill();

            ctx.restore();
        }

        drawValueLabel() {
            const valueLabelOpts = this.options.valueLabel;
            if (!valueLabelOpts.display) return;

            const { ctx } = this.chart;
            const dataset = this.getDataset();
            const value = dataset.value;

            // Chart.js proxy treats all functions as "scriptable" and calls them with
            // its internal context instead of returning the function itself.
            // Read the formatter directly from the raw config to bypass this.
            const rawFormatter = this.chart.config._config?.options?.valueLabel?.formatter;
            const fmt = typeof rawFormatter === "function" ? rawFormatter : (v) => String(v);
            const valueText = String(fmt(value));
            if (!valueText) return;

            // Read each option individually with || fallback to avoid proxy resolution issues
            const fontSizePx  = Number(valueLabelOpts.fontSize) || 12;
            const bgColor      = valueLabelOpts.backgroundColor  || "rgba(0, 0, 0, 0.85)";
            const txtColor     = valueLabelOpts.color            || "rgba(255, 255, 255, 1)";
            const radius       = Number(valueLabelOpts.borderRadius) || 5;
            const paddingTop    = valueLabelOpts.padding?.top    ?? 6;
            const paddingRight  = valueLabelOpts.padding?.right  ?? 14;
            const paddingBottom = valueLabelOpts.padding?.bottom ?? 6;
            const paddingLeft   = valueLabelOpts.padding?.left   ?? 14;

            ctx.save();
            ctx.font = `${fontSizePx}px sans-serif`;
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            const textWidth = ctx.measureText(valueText).width;
            const boxWidth  = paddingLeft + textWidth + paddingRight;
            const boxHeight = paddingTop + fontSizePx + paddingBottom;

            const { dx, dy } = this.getTranslation(this.chart);
            ctx.translate(dx, dy);

            ctx.fillStyle = bgColor;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, radius);
            } else {
                ctx.rect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            }
            ctx.fill();

            ctx.fillStyle = txtColor;
            ctx.fillText(valueText, 0, 0);

            ctx.restore();
        }

        draw() {
            super.draw();
            this.drawNeedle();
            this.drawValueLabel();
        }
    }

    GaugeController.id = "gauge";
    GaugeController.version = "1.1.0";

    GaugeController.overrides = {
        needle: {
            radiusPercentage: 2,
            widthPercentage: 3.2,
            lengthPercentage: 80,
            color: "rgba(0, 0, 0, 1)",
        },
        valueLabel: {
            display: true,
            formatter: null,
            fontSize: 12,
            color: "rgba(255, 255, 255, 1)",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            borderRadius: 5,
            padding: {
                top: 6,
                right: 14,
                bottom: 6,
                left: 14,
            },
        },
        cutout: "50%",
        rotation: -90,
        circumference: 180,
        layout: {
            padding: {
                bottom: 10,
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
    };

    function install(chartInstance) {
        chartInstance.register(GaugeController, chart_js.ArcElement);
    }

    install(chart_js.Chart);
    var index = { GaugeController, install };

    exports.GaugeController = GaugeController;
    exports.default = index;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=chartjs-gauge.umd.js.map
