import { NextRequest, NextResponse } from 'next/server';
import { isAvailable, generate, OLLAMA_MODEL } from '@/lib/ai/ollama';
import { buildContextText, analystPrompt, deterministicAnswer, type AnalystContext } from '@/lib/ai/analyst';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const get = (p: string) => fetch(`${origin}${p}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);

    const [forecast, rootCause, customers, inventory, products, decisions] = await Promise.all([
      get('/api/intelligence/forecast?metric=revenue&grain=month&periods=3'),
      get('/api/intelligence/root-cause?window=90'),
      get('/api/intelligence/customers'),
      get('/api/intelligence/inventory'),
      get('/api/analytics/products?sort=revenue&limit=200'),
      get('/api/intelligence/decisions'),
    ]);

    const prodRows = (products?.data ?? products ?? []) as Array<Record<string, unknown>>;
    const normProd = prodRows.map((p) => ({ name: String(p.product_name ?? p.name ?? ''), revenue: Number(p.revenue ?? p.total_revenue ?? 0) }))
      .filter((p) => p.name).sort((a, b) => b.revenue - a.revenue);

    const ctx: AnalystContext = {
      forecast: forecast?.model ? {
        model: forecast.model, projectedTotal: forecast.summary?.projectedTotal ?? 0,
        trendPerStep: forecast.trendPerStep ?? 0, backtestMape: forecast.backtest?.mape ?? null,
      } : undefined,
      rootCause: rootCause?.summary ? {
        changePct: rootCause.changePct, summary: rootCause.summary,
        topDriver: rootCause.drivers?.find((d: { direction: string }) => d.direction === 'positive')?.name,
        topDrag: rootCause.drivers?.find((d: { direction: string }) => d.direction === 'negative')?.name,
        recommendations: rootCause.recommendations ?? [],
      } : undefined,
      customers: customers?.summary ? {
        totalPredictedClv: customers.summary.totalPredictedClv, atRiskValue: customers.summary.atRiskValue,
        atRiskCount: (customers.summary.segments ?? []).filter((s: { segment: string }) => s.segment === 'At Risk' || s.segment === 'Hibernating').reduce((a: number, s: { count: number }) => a + s.count, 0),
        vipCount: (customers.summary.segments ?? []).filter((s: { segment: string }) => s.segment === 'Champions' || s.segment === 'Loyal').reduce((a: number, s: { count: number }) => a + s.count, 0),
        topCustomer: customers.customers?.[0]?.customerName,
      } : undefined,
      inventory: inventory?.summary ? {
        reorderCount: (inventory.summary.reorderNow ?? 0) + (inventory.summary.outOfStock ?? 0),
        atRiskRevenue: inventory.summary.atRiskRevenue, recommendedCost: inventory.summary.totalRecommendedCost,
        topItems: (inventory.products ?? []).filter((p: { status: string }) => p.status === 'Reorder now' || p.status === 'Out of stock').map((p: { productName: string }) => p.productName),
      } : undefined,
      products: normProd.length ? { top: normProd.slice(0, 8), bottom: normProd.slice(-8).reverse() } : undefined,
      decisions: decisions?.decisions ?? undefined,
    };

    const contextText = buildContextText(ctx);
    const fallback = deterministicAnswer(question, ctx);

    let answer = fallback;
    let source = 'Rule-based analyst';
    if (await isAvailable()) {
      const llm = await generate(analystPrompt(question, contextText), { temperature: 0.3, timeoutMs: 60_000 });
      if (llm && llm.length > 30) { answer = llm; source = `Ollama · ${OLLAMA_MODEL}`; }
    }

    return NextResponse.json({ answer, source, context: contextText });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Analyst failed' }, { status: 500 });
  }
}
