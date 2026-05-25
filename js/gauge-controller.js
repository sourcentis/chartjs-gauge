import { Chart, DoughnutController, ArcElement } from "chart.js";
import {
    toPercentage,
    toDimension,
    toRadians,
    addRoundedRectPath,
    PI,
    TAU,
    HALF_PI,
    _angleBetween,
} from "chart.js/helpers";

function getRatioAndOffset(rotation, circumference, cutout, needleOpts) {
    let ratioX = 1;
    let ratioY = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (circumference < TAU) {
        const startAngle = rotation;
        const endAngle = startAngle + circumference;
        const startX = Math.cos(startAngle);
        const startY = Math.sin(startAngle);
        const endX = Math.cos(endAngle);
        const endY = Math.sin(endAngle);

        const { radiusPercentage, widthPercentage, lengthPercentage } = needleOpts;
        const needleWidth = Math.max(radiusPercentage / 100, widthPercentage / 2 / 100);
        const calcMax = (angle, a, b) =>
            _angleBetween(angle, startAngle, endAngle)
                ? Math.max(1, lengthPercentage / 100)
                : Math.max(a, a * cutout, b, b * cutout, needleWidth);
        const calcMin = (angle, a, b) =>
            _angleBetween(angle, startAngle, endAngle)
                ? Math.min(-1, -lengthPercentage / 100)
                : Math.min(a, a * cutout, b, b * cutout, -needleWidth);

        const maxX = calcMax(0, startX, endX);
        const maxY = calcMax(HALF_PI, startY, endY);
        const minX = calcMin(PI, startX, endX);
        const minY = calcMin(PI + HALF_PI, startY, endY);

        ratioX = (maxX - minX) / 2;
        ratioY = (maxY - minY) / 2;
        offsetX = -(maxX + minX) / 2;
        offsetY = -(maxY + minY) / 2;
    }
    return { ratioX, ratioY, offsetX, offsetY };
}

export class GaugeController extends DoughnutController {
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
        const cutout = Math.min(toPercentage(this.options.cutout, maxSize), 1);
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
        const outerRadius = toDimension(this.options.radius, maxRadius);
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
            const minCircumference = (minValue * circumference) / TAU;
            return TAU * (Math.abs(value - minCircumference) / total);
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
        const angle = this.calculateCircumference((meta.value * circumference) / TAU) + rotation;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(angle);
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.ellipse(0, 0, needleRadius, needleRadius, 0, 0, TAU);
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

        const { ctx, chartArea } = this.chart;
        const dataset = this.getDataset();
        const value = dataset.value;

        const fmt =
            typeof valueLabelOpts.formatter === "function"
                ? valueLabelOpts.formatter
                : (v) => String(v);
        const valueText = String(fmt(value));

        const fontSizePx = Number(valueLabelOpts.fontSize) || 12;
        const {
            color,
            backgroundColor,
            borderRadius,
            padding,
            bottomMarginPercentage,
        } = valueLabelOpts;

        const paddingTop = padding?.top ?? 5;
        const paddingRight = padding?.right ?? 10;
        const paddingBottom = padding?.bottom ?? 5;
        const paddingLeft = padding?.left ?? 10;

        const width = chartArea.right - chartArea.left;
        const bottomMargin = ((bottomMarginPercentage ?? 5) / 100) * width;

        ctx.save();
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = `${fontSizePx}px sans-serif`;

        const textWidth = ctx.measureText(valueText).width;
        const textHeight = fontSizePx;

        const boxWidth = paddingLeft + textWidth + paddingRight;
        const boxHeight = paddingTop + textHeight + paddingBottom;

        const { dx, dy } = this.getTranslation(this.chart);
        const chartRotation = toRadians(this.chart.options.rotation ?? -90) % (Math.PI * 2);
        const labelX = dx + bottomMargin * Math.cos(chartRotation + Math.PI / 2);
        const labelY = dy + bottomMargin * Math.sin(chartRotation + Math.PI / 2);

        ctx.translate(labelX, labelY);

        ctx.beginPath();
        addRoundedRectPath(ctx, {
            x: -boxWidth / 2,
            y: -boxHeight / 2,
            w: boxWidth,
            h: boxHeight,
            radius: borderRadius ?? 5,
        });
        ctx.fillStyle = backgroundColor;
        ctx.fill();

        ctx.fillStyle = color;
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
GaugeController.version = "1.0.0";

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
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderRadius: 5,
        padding: {
            top: 5,
            right: 10,
            bottom: 5,
            left: 10,
        },
        bottomMarginPercentage: 5,
    },
    cutout: "50%",
    rotation: -90,
    circumference: 180,
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
    },
};
