import { db } from '@/src/db';
import { sales, orders, products, returns, inventory } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { generateRetailInsight } from '@/lib/gemini';

// Cache insight for 24h
let cachedInsight: { text: string; ts: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    if (cachedInsight && Date.now() - cachedInsight.ts < CACHE_TTL) {
      return NextResponse.json({ insight: cachedInsight.text, cached: true });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [revenueNow] = await db.execute(sql`
      SELECT COALESCE(SUM(s.sales::numeric), 0) AS rev
      FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id
      WHERE o.order_date::date BETWEEN ${weekAgo.toISOString().slice(0,10)}::date AND ${now.toISOString().slice(0,10)}::date
    `);
    const [revenuePrev] = await db.execute(sql`
      SELECT COALESCE(SUM(s.sales::numeric), 0) AS rev
      FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id
      WHERE o.order_date::date BETWEEN ${twoWeeksAgo.toISOString().slice(0,10)}::date AND ${weekAgo.toISOString().slice(0,10)}::date
    `);
    const [topCategory] = await db.execute(sql`
      SELECT p.category
      FROM ${sales} s JOIN ${products} p ON s.product_id = p.product_id
      GROUP BY p.category ORDER BY SUM(s.sales::numeric) DESC LIMIT 1
    `);
    const [topProduct] = await db.execute(sql`
      SELECT p.product_name
      FROM ${sales} s JOIN ${products} p ON s.product_id = p.product_id
      GROUP BY p.product_name ORDER BY SUM(s.sales::numeric) DESC LIMIT 1
    `);
    const [returnRate] = await db.execute(sql`
      SELECT COUNT(r.return_id)::float / NULLIF(COUNT(s.sales_id), 0) AS rate
      FROM ${sales} s LEFT JOIN ${returns} r ON s.sales_id = r.sales_id
    `);
    const [lowStock] = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM ${inventory} WHERE quantity <= reorder_point
    `);
    const [anomalies] = await db.execute(sql`
      WITH daily_rev AS (
        SELECT DATE_TRUNC('day', o.order_date::date) AS d, SUM(s.sales::numeric) AS rev
        FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id GROUP BY 1
      ), stats AS (SELECT AVG(rev) AS mean, STDDEV(rev) AS std FROM daily_rev)
      SELECT COUNT(*) AS cnt FROM daily_rev, stats
      WHERE ABS((rev - mean) / NULLIF(std, 0)) > 2.5
    `);

    const insight = await generateRetailInsight({
      revenueCurrent: Number((revenueNow as Record<string,unknown>).rev) || 0,
      revenuePrev: Number((revenuePrev as Record<string,unknown>).rev) || 0,
      topCategory: String((topCategory as Record<string,unknown>)?.category || 'N/A'),
      returnRate: Number((returnRate as Record<string,unknown>)?.rate) || 0,
      topProduct: String((topProduct as Record<string,unknown>)?.product_name || 'N/A'),
      lowStockCount: Number((lowStock as Record<string,unknown>)?.cnt) || 0,
      anomalyCount: Number((anomalies as Record<string,unknown>)?.cnt) || 0,
    });

    cachedInsight = { text: insight, ts: Date.now() };
    return NextResponse.json({ insight, cached: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'AI insight unavailable' }, { status: 500 });
  }
}
