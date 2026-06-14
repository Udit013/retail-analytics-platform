import { db } from '@/src/db';
import { sales, orders, products, returns, inventory } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { isAvailable, generate, OLLAMA_MODEL } from '@/lib/ai/ollama';
import { buildWeeklyNarrative, enrichmentPrompt, type WeeklyContext } from '@/lib/ai/narrative';

// Cache insight for 24h (in-memory, per server instance).
let cached: { text: string; source: string; ts: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ insight: cached.text, source: cached.source, cached: true });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5);
    const d = (x: Date) => x.toISOString().slice(0, 10);

    const [revenueNow] = (await db.execute(sql`
      SELECT COALESCE(SUM(s.sales::numeric), 0) AS rev
      FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id
      WHERE o.order_date::date BETWEEN ${d(weekAgo)}::date AND ${d(now)}::date
    `)) as unknown as Array<Record<string, unknown>>;
    const [revenuePrev] = (await db.execute(sql`
      SELECT COALESCE(SUM(s.sales::numeric), 0) AS rev
      FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id
      WHERE o.order_date::date BETWEEN ${d(twoWeeksAgo)}::date AND ${d(weekAgo)}::date
    `)) as unknown as Array<Record<string, unknown>>;
    const [topCategory] = (await db.execute(sql`
      SELECT p.category FROM ${sales} s JOIN ${products} p ON s.product_id = p.product_id
      GROUP BY p.category ORDER BY SUM(s.sales::numeric) DESC LIMIT 1
    `)) as unknown as Array<Record<string, unknown>>;
    const [topProduct] = (await db.execute(sql`
      SELECT p.product_name FROM ${sales} s JOIN ${products} p ON s.product_id = p.product_id
      GROUP BY p.product_name ORDER BY SUM(s.sales::numeric) DESC LIMIT 1
    `)) as unknown as Array<Record<string, unknown>>;
    const [returnRate] = (await db.execute(sql`
      SELECT COUNT(r.return_id)::float / NULLIF(COUNT(s.sales_id), 0) AS rate
      FROM ${sales} s LEFT JOIN ${returns} r ON s.sales_id = r.sales_id
    `)) as unknown as Array<Record<string, unknown>>;
    const [lowStock] = (await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM ${inventory} WHERE quantity <= reorder_point
    `)) as unknown as Array<Record<string, unknown>>;
    const [anomalies] = (await db.execute(sql`
      WITH daily_rev AS (
        SELECT DATE_TRUNC('day', o.order_date::date) AS d, SUM(s.sales::numeric) AS rev
        FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id GROUP BY 1
      ), stats AS (SELECT AVG(rev) AS mean, STDDEV(rev) AS std FROM daily_rev)
      SELECT COUNT(*) AS cnt FROM daily_rev, stats
      WHERE ABS((rev - mean) / NULLIF(std, 0)) > 2.5
    `)) as unknown as Array<Record<string, unknown>>;

    const ctx: WeeklyContext = {
      revenueCurrent: Number(revenueNow?.rev) || 0,
      revenuePrev: Number(revenuePrev?.rev) || 0,
      topCategory: String(topCategory?.category || 'N/A'),
      topProduct: String(topProduct?.product_name || 'N/A'),
      returnRate: Number(returnRate?.rate) || 0,
      lowStockCount: Number(lowStock?.cnt) || 0,
      anomalyCount: Number(anomalies?.cnt) || 0,
    };

    // Always-available deterministic narrative.
    const draft = buildWeeklyNarrative(ctx);
    let text = draft;
    let source = 'Rule-based engine';

    // Enrich with a local open-source model if Ollama is reachable.
    if (await isAvailable()) {
      const enriched = await generate(enrichmentPrompt(draft, ctx), { temperature: 0.3 });
      if (enriched && enriched.length > 40) {
        text = enriched;
        source = `Ollama · ${OLLAMA_MODEL}`;
      }
    }

    cached = { text, source, ts: Date.now() };
    return NextResponse.json({ insight: text, source, cached: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Insight generation failed' }, { status: 500 });
  }
}
