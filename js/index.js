import { Chart, ArcElement } from "chart.js";
import { GaugeController } from "./gauge-controller.js";

function install(chartInstance) {
    chartInstance.register(GaugeController, ArcElement);
}

install(Chart);

export { GaugeController };
export default { GaugeController, install };
