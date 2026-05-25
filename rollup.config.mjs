import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

const external = ["chart.js", "chart.js/helpers"];
const globals = {
    "chart.js": "Chart",
    "chart.js/helpers": "Chart.helpers",
};

export default [
    // ESM build
    {
        input: "js/index.js",
        external,
        output: {
            file: "dist/chartjs-gauge.esm.js",
            format: "esm",
            sourcemap: true,
        },
        plugins: [resolve()],
    },
    // UMD build
    {
        input: "js/index.js",
        external,
        output: {
            file: "dist/chartjs-gauge.umd.js",
            format: "umd",
            name: "ChartjsGauge",
            exports: "named",
            globals,
            sourcemap: true,
        },
        plugins: [resolve()],
    },
    // Minified UMD
    {
        input: "js/index.js",
        external,
        output: {
            file: "dist/chartjs-gauge.min.js",
            format: "umd",
            name: "ChartjsGauge",
            exports: "named",
            globals,
        },
        plugins: [resolve(), terser()],
    },
];
