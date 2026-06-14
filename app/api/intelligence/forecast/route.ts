import { NextRequest, NextResponse } from 'next/server';
import { getRevenueSeries, metricValues, type Grain, type SeriesPoint } from '@/lib/intelligence/data';
import { forecast } from '@/lib/intelligence/forecast';
import { tryMlForecast } from '@/lib/intelligence/ml-service';

const METRICS = ['revenue', 'profit', 'orders', 'customers', 'quantity'] as const;
type Metric = (typeof METRICS)[number];

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const metric = (sp.get('metric') as Metric) ?? 'revenue';
    const grain = (sp.get('grain') as Grain) ?? 'month';
    const periods = Math.min(365, Math.max(1, Number(sp.get('periods')) || (grain === 'day' ? 30 : grain === 'week' ? 13 : 6)));
    const confidence = Number(sp.get('confidence')) || 0.9;

    if (!METRICS.includes(metric)) {
      return NextResponse.json({ error: `metric must be one of ${METRICS.join(', ')}` }, { status: 400 });
    }

    const series = await getRevenueSeries(grain);
    if (series.length < 4) {
      return NextResponse.json({ error: 'Not enough history to forecast (need at least 4 periods).' }, { status: 422 });
    }

    const values = metricValues(series, metric as keyof Omit<SeriesPoint, 'date'>);
    const dates = series.map((p) => p.date);
    const result = forecast(values, dates, grain, periods, confidence);

    // If the optional local Python ML service (Prophet) is available, use its future
    // points instead — keeping the same TS history/metrics for a consistent response.
    const ml = await tryMlForecast(values, dates, grain, periods, confidence);
    if (ml) {
      const history = result.series.filter((p) => p.actual !== null);
      const mlFuture = ml.points.map((p) => ({
        date: p.date, actual: null,
        forecast: Math.round(p.forecast), lower: Math.round(p.lower), upper: Math.round(p.upper),
      }));
      result.series = [...history, ...mlFuture];
      result.model = ml.model;
    }

    // Summary stats for the headline cards.
    const lastActual = values[values.length - 1];
    const future = result.series.filter((p) => p.actual === null);
    const projectedNext = future[0]?.forecast ?? null;
    const projectedEnd = future[future.length - 1]?.forecast ?? null;
    const projectedTotal = future.reduce((a, p) => a + (p.forecast ?? 0), 0);

    return NextResponse.json({
      metric,
      grain,
      periods,
      ...result,
      summary: { lastActual, projectedNext, projectedEnd, projectedTotal },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Forecast failed' }, { status: 500 });
  }
}
