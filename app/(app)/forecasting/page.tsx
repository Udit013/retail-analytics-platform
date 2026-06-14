import ForecastChart from '@/components/intelligence/ForecastChart';

export const metadata = { title: 'Forecasting · RetailNexa AI' };

export default function ForecastingPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Forecasting</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Project revenue, profit, orders, customers, and demand forward with confidence intervals,
          trend, and seasonality — computed from your live data.
        </p>
      </div>

      <ForecastChart />

      <p className="text-xs text-gray-400">
        Forecasts use Holt-Winters exponential smoothing (seasonal) with automatic fallback to
        linear-trend models for short histories. An optional local Python service (Prophet / LightGBM)
        can override these when running locally.
      </p>
    </div>
  );
}
