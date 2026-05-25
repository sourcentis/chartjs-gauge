<?php

namespace Sourcentis\ChartjsGauge;

use Illuminate\Support\ServiceProvider;

class ChartjsGaugeServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/../dist' => public_path('vendor/chartjs-gauge'),
        ], 'chartjs-gauge-assets');
    }
}
