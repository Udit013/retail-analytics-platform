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

interface Candidate {
  model: string;
  seasonality: number;
  trendPerStep: number;
  fitted: number[]; // one-step-ahead in-sample predictions
  project: (h: number) => number; // forecast h steps beyond the end of `vals`
}

/** Build all applicable forecasting models for a series (used for both fitting and backtest). */
function buildCandidates(vals: number[], m: number): Candidate[] {
  const k = vals.length;
  const out: Candidate[] = [];

  // Holt-Winters (seasonal) — needs >= 2 full seasons + 1.
  if (k >= 2 * m + 1) {
    let bestParams = { a: 0.3, b: 0.05, g: 0.2 };
    let bestErr = Infinity;
    for (const a of [0.1, 0.3, 0.5, 0.8]) {
      for (const b of [0.01, 0.05, 0.2]) {
        for (const g of [0.05, 0.2, 0.5]) {
          const err = rmse(vals.slice(1), holtWinters(vals, m, a, b, g).fitted.slice(1));
          if (err < bestErr) { bestErr = err; bestParams = { a, b, g }; }
        }
      }
    }
    const hw = holtWinters(vals, m, bestParams.a, bestParams.b, bestParams.g);
    out.push({
      model: 'Holt-Winters (seasonal)',
      seasonality: m,
      trendPerStep: hw.trend,
      fitted: hw.fitted,
      project: (h) => hw.level + h * hw.trend + hw.season[(k + h - 1) % m],
    });
  }

  // Linear trend (OLS on index).
  if (k >= 4) {
    const fit = linearRegression(vals);
    out.push({
      model: 'Linear trend',
      seasonality: 0,
      trendPerStep: fit.slope,
      fitted: vals.map((_, i) => fit.predict(i)),
      project: (h) => fit.predict(k - 1 + h),
    });
  }

  // Drift / random-walk-with-drift — always available.
  {
    const last = vals[k - 1] ?? 0;
    const drift = k >= 2 ? (vals[k - 1] - vals[0]) / (k - 1) : 0;
    out.push({
      model: 'Drift',
      seasonality: 0,
      trendPerStep: drift,
      fitted: vals.map((_, i) => (i === 0 ? vals[0] : vals[i - 1] + drift)),
      project: (h) => last + h * drift,
    });
  }

  return out;
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

  // --- Build candidate models, then select via a multi-step holdout backtest ---
  const candidates = buildCandidates(values, m);

  // Backtest: hold out the last vK periods, fit on the rest, forecast vK ahead,
  // and score each model TYPE on multi-step error. This rewards models that capture
  // real structure (e.g. seasonality) rather than naive one-step persistence.
  const vK = Math.min(horizon, Math.max(2, Math.floor(n * 0.2)));
  let chosen = candidates.reduce((best, c) =>
    rmse(values.slice(1), c.fitted.slice(1)) < rmse(values.slice(1), best.fitted.slice(1)) ? c : best
  );
  if (n - vK >= 4) {
    const train = values.slice(0, n - vK);
    const holdout = values.slice(n - vK);
    const trainCands = buildCandidates(train, m);
    let bestName = '';
    let bestErr = Infinity;
    for (const c of trainCands) {
      const preds = holdout.map((_, i) => c.project(i + 1));
      const err = rmse(holdout, preds);
      if (err < bestErr) { bestErr = err; bestName = c.model; }
    }
    const winner = candidates.find((c) => c.model === bestName);
    if (winner) chosen = winner;
  }

  const model = chosen.model;
  const seasonality = chosen.seasonality;
  const trendPerStep = chosen.trendPerStep;
  const fitted = chosen.fitted;
  const project = chosen.project;

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
