import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';
import { CATEGORY_ELASTICITY, type Baseline } from '@/lib/intelligence/pricing';

/** Trailing-12-month baselines for "All", each category, and the top products. */
export async function GET() {
  try {
    const scopes: Baseline[] = [];

    const [allRow] = (await db.execute(sql`
      WITH maxd AS (SELECT MAX(order_date::date) AS d FROM orders)
      SELECT SUM(s.quantity)::int AS units,
             SUM(s.sales::numeric) AS revenue,
             SUM(s.quantity * p.cost_price::numeric) AS cost
      FROM sales s JOIN orders o ON s.order_id = o.order_id JOIN products p ON p.product_id = s.product_id
      WHERE o.order_date::date >= (SELECT d FROM maxd) - INTERVAL '365 days'
    `)) as unknown as Array<Record<string, unknown>>;
    const allUnits = Number(allRow?.units) || 0;
    const allRev = Number(allRow?.revenue) || 0;
    const allCost = Number(allRow?.cost) || 0;
    if (allUnits > 0) {
      scopes.push({
        id: 'all', label: 'All products',
        baseUnits: allUnits, basePrice: allRev / allUnits, unitCost: allCost / allUnits,
        elasticity: CATEGORY_ELASTICITY.All,
      });
    }

    const cats = (await db.execute(sql`
      WITH maxd AS (SELECT MAX(order_date::date) AS d FROM orders)
      SELECT p.category AS category, SUM(s.quantity)::int AS units,
             SUM(s.sales::numeric) AS revenue, SUM(s.quantity * p.cost_price::numeric) AS cost
      FROM sales s JOIN orders o ON s.order_id = o.order_id JOIN products p ON p.product_id = s.product_id
      WHERE o.order_date::date >= (SELECT d FROM maxd) - INTERVAL '365 days'
      GROUP BY 1 ORDER BY revenue DESC
    `)) as unknown as Array<Record<string, unknown>>;
    for (const c of cats) {
      const units = Number(c.units) || 0;
      if (units <= 0) continue;
      const cat = String(c.category);
      scopes.push({
        id: `cat:${cat}`, label: cat,
        baseUnits: units, basePrice: Number(c.revenue) / units, unitCost: Number(c.cost) / units,
        elasticity: CATEGORY_ELASTICITY[cat] ?? CATEGORY_ELASTICITY.All,
      });
    }

    const prods = (await db.execute(sql`
      WITH maxd AS (SELECT MAX(order_date::date) AS d FROM orders)
      SELECT p.product_id AS id, p.product_name AS name, p.category AS category,
             SUM(s.quantity)::int AS units, SUM(s.sales::numeric) AS revenue,
             SUM(s.quantity * p.cost_price::numeric) AS cost
      FROM sales s JOIN orders o ON s.order_id = o.order_id JOIN products p ON p.product_id = s.product_id
      WHERE o.order_date::date >= (SELECT d FROM maxd) - INTERVAL '365 days'
      GROUP BY 1, 2, 3 ORDER BY revenue DESC LIMIT 25
    `)) as unknown as Array<Record<string, unknown>>;
    for (const p of prods) {
      const units = Number(p.units) || 0;
      if (units <= 0) continue;
      const cat = String(p.category);
      scopes.push({
        id: `prod:${p.id}`, label: `${String(p.name).slice(0, 40)} (${cat})`,
        baseUnits: units, basePrice: Number(p.revenue) / units, unitCost: Number(p.cost) / units,
        elasticity: CATEGORY_ELASTICITY[cat] ?? CATEGORY_ELASTICITY.All,
      });
    }

    return NextResponse.json({ scopes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Pricing baselines failed' }, { status: 500 });
  }
}
