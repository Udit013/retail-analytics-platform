/**
 * Core statistical primitives for the RetailNexa AI intelligence engines.
 * Pure TypeScript, no dependencies — runs anywhere (Vercel serverless included).
 */

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function mean(xs: number[]): number {
  return xs.length ? sum(xs) / xs.length : 0;
}

export function variance(xs: number[], sample = true): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const ss = sum(xs.map((x) => (x - m) ** 2));
  return ss / (xs.length - (sample ? 1 : 0));
}

export function std(xs: number[], sample = true): number {
  return Math.sqrt(variance(xs, sample));
}

/** Linear interpolation percentile (p in [0,100]). */
export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (rank - lo) * (sorted[hi] - sorted[lo]);
}

export function median(xs: number[]): number {
  return percentile(xs, 50);
}

/** Z-scores for each element relative to the series. */
export function zScores(xs: number[]): number[] {
  const m = mean(xs);
  const s = std(xs);
  if (s === 0) return xs.map(() => 0);
  return xs.map((x) => (x - m) / s);
}

export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
  /** standard error of the residuals */
  residualStd: number;
  predict: (x: number) => number;
}

/** Ordinary least-squares linear regression over (index, value) or explicit x. */
export function linearRegression(ys: number[], xs?: number[]): LinearFit {
  const n = ys.length;
  const X = xs ?? ys.map((_, i) => i);
  if (n < 2) {
    const c = ys[0] ?? 0;
    return { slope: 0, intercept: c, r2: 0, residualStd: 0, predict: () => c };
  }
  const mx = mean(X);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (X[i] - mx) * (ys[i] - my);
    den += (X[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const predict = (x: number) => slope * x + intercept;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - predict(X[i])) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const residualStd = Math.sqrt(ssRes / Math.max(1, n - 2));
  return { slope, intercept, r2, residualStd, predict };
}

/** Trailing simple moving average; result aligned to input length (early values use shorter windows). */
export function movingAverage(xs: number[], window: number): number[] {
  if (window <= 1) return [...xs];
  return xs.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    return mean(xs.slice(start, i + 1));
  });
}

/** Coefficient of variation — relative volatility, scale-free. */
export function coefficientOfVariation(xs: number[]): number {
  const m = mean(xs);
  return m === 0 ? 0 : std(xs) / m;
}

/**
 * Compound growth rate between first and last non-zero values, per step.
 * Returns 0 when not computable.
 */
export function cagr(xs: number[]): number {
  if (xs.length < 2) return 0;
  const first = xs.find((v) => v > 0);
  const last = [...xs].reverse().find((v) => v > 0);
  if (!first || !last || first <= 0) return 0;
  const periods = xs.length - 1;
  return Math.pow(last / first, 1 / periods) - 1;
}

/** Clamp helper. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Standard-normal CDF (Abramowitz & Stegun 7.1.26) — used for risk probabilities. */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Z multiplier for a two-sided confidence level (e.g. 0.95 -> ~1.96). */
export function zForConfidence(confidence: number): number {
  const table: Record<string, number> = {
    '0.8': 1.2816,
    '0.9': 1.6449,
    '0.95': 1.96,
    '0.99': 2.5758,
  };
  return table[String(confidence)] ?? 1.96;
}
