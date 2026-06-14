/**
 * Time-series forecasting — pure TypeScript, no Python required.
 *
 * Uses Holt-Winters (additive triple exponential smoothing) when enough seasonal
 * history exists, falling back to Holt's linear trend, then drift, for short series.
 * Smoothing parameters are chosen by a small grid search minimizing in-sample error.
 * Confidence intervals come from one-step residual std, widened with horizon.
 *
 * An optional Python/FastAPI service (Prophet/LightGBM) can override this locally;
 * this engine guarantees the deployed app always has working forecasts.
 */
import { addDays, addWeeks, addMonths, parseISO, format } from 'date-fns';
import { mean, std, linearRegression, zForConfidence, clamp } from './stats';
import type { Grain } from './data';

export interface ForecastPoint {
  date: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface ForecastResult {
  model: string;
  seasonality: number;
  trendPerStep: number;
  confidence: number;
  metrics: { mape: number; rmse: number; r2: number };
  series: ForecastPoint[]; // history (actual+fitted) then future
}

const SEASON_BY_GRAIN: Record<Grain, number> = { day: 7, week: 52, month: 12 };

function nextDate(last: string, grain: Grain, step: number): string {
  const d = parseISO(last);
  const out = grain === 'day' ? addDays(d, step) : grain === 'week' ? addWeeks(d, step) : addMonths(d, step);
  return format(out, 'yyyy-MM-dd');
}

interface HW {
  fitted: number[];
  level: number;
  trend: number;
  season: number[];
  m: number;
}

/** Holt-Winters additive. Returns fitted one-step-ahead values + final state. */
function holtWinters(y: number[], m: number, alpha: number, beta: number, gamma: number): HW {
  const season = new Array(m).fill(0);
  const firstSeasonMean = mean(y.slice(0, m));
  for (let i = 0; i < m; i++) season[i] = y[i] - firstSeasonMean;
  let level = firstSeasonMean;
  let trend = (mean(y.slice(m, 2 * m)) - firstSeasonMean) / m;
  if (!isFinite(trend)) trend = 0;

  const fitted: number[] = [];
  for (let t = 0; t < y.length; t++) {
    const s = season[t % m];
    fitted.push(level + trend + s);
    const prevLevel = level;
    level = alpha * (y[t] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    season[t % m] = gamma * (y[t] - level) + (1 - gamma) * s;
  }
  return { fitted, level, trend, season, m };
}

function rmse(actual: number[], pred: number[]): number {
  const n = Math.min(actual.length, pred.length);
  if (!n) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += (actual[i] - pred[i]) ** 2;
  return Math.sqrt(s / n);
}

function mape(actual: number[], pred: number[]): number {
  const pairs = actual.map((a, i) => [a, pred[i]] as const).filter(([a]) => a !== 0);
  if (!pairs.length) return 0;
  return (mean(pairs.map(([a, p]) => Math.abs((a - p) / a))) * 100);
}

function r2(actual: number[], pred: number[]): number {
  const m = mean(actual);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < actual.length; i++) {
    ssRes += (actual[i] - pred[i]) ** 2;
    ssTot += (actual[i] - m) ** 2;
  }
  return ssTot === 0 ? 0 : clamp(1 - ssRes / ssTot, -1, 1);
}

/**
 * Forecast a numeric series `horizon` steps ahead.
 * @param values historical values aligned to `dates`
 * @param dates  ISO date strings (period starts)
 * @param grain  day | week | month — controls seasonality & future date stepping
 * @param horizon number of future periods to predict
 * @param confidence two-sided CI level (default 0.9)
 */
export function forecast(
  values: number[],
  dates: string[],
  grain: Grain,
  horizon: number,
  confidence = 0.9
): ForecastResult {
  const n = values.length;
  const z = zForConfidence(confidence);
  const m = SEASON_BY_GRAIN[grain];
  const history: ForecastPoint[] = [];
  const future: ForecastPoint[] = [];

  // --- Choose model based on available history ---
  const canSeasonal = n >= 2 * m + 1;

  let model: string;
  let seasonality = 0;
  let trendPerStep = 0;
  let fitted: number[] = [];
  let project: (h: number) => number;

  if (canSeasonal) {
    // Grid search smoothing params minimizing in-sample RMSE.
    let best: HW | null = null;
    let bestErr = Infinity;
    let bestParams = { a: 0.3, b: 0.05, g: 0.2 };
    for (const a of [0.1, 0.3, 0.5, 0.8]) {
      for (const b of [0.01, 0.05, 0.2]) {
        for (const g of [0.05, 0.2, 0.5]) {
          const hw = holtWinters(values, m, a, b, g);
          const err = rmse(values.slice(1), hw.fitted.slice(1));
          if (err < bestErr) {
            bestErr = err;
            best = hw;
            bestParams = { a, b, g };
          }
        }
      }
    }
    const hw = holtWinters(values, m, bestParams.a, bestParams.b, bestParams.g);
    fitted = hw.fitted;
    model = 'Holt-Winters (seasonal)';
    seasonality = m;
    trendPerStep = hw.trend;
    project = (h) => hw.level + h * hw.trend + hw.season[(n + h - 1) % m];
  } else if (n >= 4) {
    // Holt's linear trend via OLS on index.
    const fit = linearRegression(values);
    fitted = values.map((_, i) => fit.predict(i));
    model = 'Linear trend';
    trendPerStep = fit.slope;
    project = (h) => fit.predict(n - 1 + h);
  } else {
    // Drift / last-value fallback.
    const last = values[n - 1] ?? 0;
    const drift = n >= 2 ? (values[n - 1] - values[0]) / (n - 1) : 0;
    fitted = values.slice();
    model = 'Drift';
    trendPerStep = drift;
    project = (h) => last + h * drift;
  }

  // Residual std for prediction intervals.
  const residuals = values.map((v, i) => v - (fitted[i] ?? v)).slice(1);
  const resStd = std(residuals) || std(values) * 0.1 || 1;

  // Build history points (actual + fitted).
  for (let i = 0; i < n; i++) {
    history.push({
      date: dates[i],
      actual: values[i],
      forecast: Math.max(0, Math.round(fitted[i] ?? values[i])),
      lower: null,
      upper: null,
    });
  }

  // Build future points; CI widens ~sqrt(h).
  const lastDate = dates[n - 1];
  for (let h = 1; h <= horizon; h++) {
    const yhat = Math.max(0, project(h));
    const band = z * resStd * Math.sqrt(h);
    future.push({
      date: nextDate(lastDate, grain, h),
      actual: null,
      forecast: Math.round(yhat),
      lower: Math.max(0, Math.round(yhat - band)),
      upper: Math.round(yhat + band),
    });
  }

  const fittedForMetrics = fitted.slice(1);
  const actualForMetrics = values.slice(1);

  return {
    model,
    seasonality,
    trendPerStep: Math.round(trendPerStep * 100) / 100,
    confidence,
    metrics: {
      mape: Math.round(mape(actualForMetrics, fittedForMetrics) * 10) / 10,
      rmse: Math.round(rmse(actualForMetrics, fittedForMetrics) * 100) / 100,
      r2: Math.round(r2(actualForMetrics, fittedForMetrics) * 1000) / 1000,
    },
    series: [...history, ...future],
  };
}
