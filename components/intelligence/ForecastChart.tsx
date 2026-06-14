'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

type Grain = 'day' | 'week' | 'month';
const METRICS = ['revenue', 'profit', 'orders', 'customers', 'quantity'] as const;
type Metric = (typeof METRICS)[number];

interface Pt { date: string; actual: number | null; forecast: number | null; lower: number | null; upper: number | null; }
interface ForecastResp {
  metric: Metric; grain: Grain; periods: number; model: string; seasonality: number;
  trendPerStep: number; confidence: number;
  metrics: { mape: number; rmse: number; r2: number };
  backtest: { mape: number; rmse: number; periods: number } | null;
  series: Pt[];
  summary: { lastActual: number; projectedNext: number | null; projectedEnd: number | null; projectedTotal: number };
}

const HORIZONS: Record<Grain, { label: string; periods: number }[]> = {
  day: [{ label: '30 days', periods: 30 }, { label: '90 days', periods: 90 }, { label: '365 days', periods: 365 }],
  week: [{ label: '4 weeks', periods: 4 }, { label: '13 weeks', periods: 13 }, { label: '52 weeks', periods: 52 }],
  month: [{ label: '3 months', periods: 3 }, { label: '6 months', periods: 6 }, { label: '12 months', periods: 12 }],
};

const isMoney = (m: Metric) => m === 'revenue' || m === 'profit';

export default function ForecastChart() {
  const [metric, setMetric] = useState<Metric>('revenue');
  const [grain, setGrain] = useState<Grain>('month');
  const [periods, setPeriods] = useState(6);
  const [data, setData] = useState<ForecastResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/intelligence/forecast?metric=${metric}&grain=${grain}&periods=${periods}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load forecast'); setLoading(false); });
  }, [metric, grain, periods]);

  const fmt = (v: number) =>
    isMoney(metric)
      ? v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`
      : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v.toFixed(0)}`;
  const fmtFull = (v: number) => (isMoney(metric) ? `$${Math.round(v).toLocaleString()}` : Math.round(v).toLocaleString());

  // Chart rows: encode band as base (lower, transparent) + range (upper-lower, shaded), stacked.
  const rows = (data?.series ?? []).map((p) => ({
    date: p.date,
    actual: p.actual,
    forecast: p.forecast,
    base: p.lower,
    band: p.lower != null && p.upper != null ? p.upper - p.lower : null,
  }));
  const firstFuture = data?.series.find((p) => p.actual === null)?.date;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-800">Forecast</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}
            className="text-xs border border-gray-300 rounded px-2 py-1 capitalize">
            {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex rounded border border-gray-300 overflow-hidden">
            {(['day', 'week', 'month'] as Grain[]).map((g) => (
              <button key={g} onClick={() => { setGrain(g); setPeriods(HORIZONS[g][1].periods); }}
                className={`text-xs px-2 py-1 capitalize ${grain === g ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="flex rounded border border-gray-300 overflow-hidden">
            {HORIZONS[grain].map((h) => (
              <button key={h.periods} onClick={() => setPeriods(h.periods)}
                className={`text-xs px-2 py-1 ${periods === h.periods ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {data && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Last actual" value={fmtFull(data.summary.lastActual)} />
          <Stat label={`Next ${grain}`} value={data.summary.projectedNext != null ? fmtFull(data.summary.projectedNext) : '—'} />
          <Stat label={`Projected total (${periods} ${grain}s)`} value={fmtFull(data.summary.projectedTotal)} />
          <Stat label="Trend / step" value={`${data.trendPerStep >= 0 ? '+' : ''}${fmtFull(data.trendPerStep)}`}
            accent={data.trendPerStep >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        </div>
      )}

      {loading ? (
        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Computing forecast…</div>
      ) : error ? (
        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">{error}</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={rows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(0, 7)} minTickGap={24} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v, name) => [v == null ? '—' : fmtFull(Number(v)), name]} labelClassName="text-xs" />
              <Legend />
              {/* Confidence band */}
              <Area dataKey="base" stackId="ci" stroke="none" fill="transparent" name=" " legendType="none" isAnimationActive={false} />
              <Area dataKey="band" stackId="ci" stroke="none" fill="#6366f1" fillOpacity={0.12} name={`${Math.round((data?.confidence ?? 0.9) * 100)}% interval`} isAnimationActive={false} />
              {firstFuture && <ReferenceLine x={firstFuture} stroke="#cbd5e1" strokeDasharray="4 4" label={{ value: 'forecast', fontSize: 10, fill: '#94a3b8', position: 'insideTopRight' }} />}
              <Line type="monotone" dataKey="actual" stroke="#1e293b" strokeWidth={2} dot={false} name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Forecast" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>

          {data && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-gray-500">
              <span>Model: <span className="font-medium text-gray-700">{data.model}</span> <span className="text-gray-400">(auto-selected)</span></span>
              {data.seasonality > 0 && <span>Seasonality: <span className="font-medium text-gray-700">{data.seasonality} {grain}s</span></span>}
              {data.backtest ? (
                <span>Backtest accuracy: <span className="font-medium text-gray-700">{(100 - data.backtest.mape).toFixed(1)}%</span> <span className="text-gray-400">(MAPE {data.backtest.mape}% on {data.backtest.periods}-{grain} holdout)</span></span>
              ) : (
                <span>In-sample MAPE: <span className="font-medium text-gray-700">{data.metrics.mape}%</span></span>
              )}
              {data.metrics.r2 >= 0 && <span>Fit R²: <span className="font-medium text-gray-700">{data.metrics.r2}</span></span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${accent ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
