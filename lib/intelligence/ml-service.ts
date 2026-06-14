/**
 * Optional bridge to the local Python ML service (Prophet/LightGBM).
 * Returns null when ML_SERVICE_URL is unset or unreachable, so the app always
 * falls back to the built-in TypeScript forecaster.
 */
import type { Grain } from './data';

const FREQ: Record<Grain, string> = { day: 'D', week: 'W', month: 'MS' };

export interface MlPoint { date: string; forecast: number; lower: number; upper: number }

export async function tryMlForecast(
  values: number[], dates: string[], grain: Grain, horizon: number, confidence: number
): Promise<{ model: string; points: MlPoint[] } | null> {
  const base = process.env.ML_SERVICE_URL;
  if (!base) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${base}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates, values, horizon, freq: FREQ[grain], confidence }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { model: string; points: MlPoint[] };
    if (!json.points?.length) return null;
    return json;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
