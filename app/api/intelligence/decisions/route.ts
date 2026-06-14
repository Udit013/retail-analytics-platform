import { NextRequest, NextResponse } from 'next/server';
import { buildDecisions, type DecisionInputs } from '@/lib/intelligence/decisions';

export async function GET(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const get = (path: string) => fetch(`${origin}${path}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);

    const [forecast, inventory, customers, rootCause] = await Promise.all([
      get('/api/intelligence/forecast?metric=revenue&grain=month&periods=3'),
      get('/api/intelligence/inventory'),
      get('/api/intelligence/customers'),
      get('/api/intelligence/root-cause?window=90'),
    ]);

    if (!forecast || !inventory || !customers) {
      return NextResponse.json({ error: 'Could not assemble decision inputs' }, { status: 502 });
    }

    const segs = customers.summary?.segments ?? [];
    const vip = segs.filter((s: { segment: string }) => s.segment === 'Champions' || s.segment === 'Loyal')
      .reduce((a: { count: number; clv: number }, s: { count: number; predictedClv: number }) => ({ count: a.count + s.count, clv: a.clv + s.predictedClv }), { count: 0, clv: 0 });
    const atRisk = segs.filter((s: { segment: string }) => s.segment === 'At Risk' || s.segment === 'Hibernating')
      .reduce((a: number, s: { count: number }) => a + s.count, 0);

    const reorderItems = (inventory.products ?? [])
      .filter((p: { status: string }) => p.status === 'Reorder now' || p.status === 'Out of stock')
      .map((p: { productName: string }) => p.productName);

    const inputs: DecisionInputs = {
      forecast: {
        metricLabel: 'Revenue',
        lastActual: forecast.summary?.lastActual ?? 0,
        projectedTotal: forecast.summary?.projectedTotal ?? 0,
        horizonLabel: 'next 3 months',
        trendPerStep: forecast.trendPerStep ?? 0,
        backtestAccuracy: forecast.backtest ? Math.max(0, 1 - forecast.backtest.mape / 100) : 0.7,
        model: forecast.model ?? 'forecast',
      },
      rootCause: rootCause && rootCause.drivers ? {
        changePct: rootCause.changePct,
        topDriver: rootCause.drivers[0] ? `${rootCause.drivers[0].dimension} "${rootCause.drivers[0].name}"` : 'recent mix',
        confidence: rootCause.confidence ?? 0.6,
      } : null,
      inventory: {
        reorderCount: (inventory.summary?.reorderNow ?? 0) + (inventory.summary?.outOfStock ?? 0),
        atRiskRevenue: inventory.summary?.atRiskRevenue ?? 0,
        recommendedCost: inventory.summary?.totalRecommendedCost ?? 0,
        topItems: reorderItems,
        overstockCapital: inventory.summary?.overstockCapital ?? 0,
      },
      customer: {
        atRiskValue: customers.summary?.atRiskValue ?? 0,
        atRiskCount: atRisk,
        vipCount: vip.count,
        vipValue: vip.clv,
        totalPredictedClv: customers.summary?.totalPredictedClv ?? 0,
      },
    };

    return NextResponse.json({ decisions: buildDecisions(inputs), generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Decision Center failed' }, { status: 500 });
  }
}
