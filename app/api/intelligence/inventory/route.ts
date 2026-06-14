import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';
import { computeInventory, type InventoryRow } from '@/lib/intelligence/inventory';

export async function GET() {
  try {
    const rows = (await db.execute(sql`
      WITH maxd AS (SELECT MAX(order_date::date) AS d FROM orders),
      weekly AS (
        SELECT s.product_id, DATE_TRUNC('week', o.order_date::date) AS wk, SUM(s.quantity) AS qty
        FROM sales s JOIN orders o ON s.order_id = o.order_id
        WHERE o.order_date::date >= (SELECT d FROM maxd) - INTERVAL '90 days'
        GROUP BY 1, 2
      ),
      agg AS (
        SELECT product_id, SUM(qty)::int AS units_90, COALESCE(STDDEV(qty), 0) AS std_weekly
        FROM weekly GROUP BY 1
      ),
      tot AS (SELECT product_id, SUM(quantity)::int AS units_total FROM sales GROUP BY 1)
      SELECT
        p.product_id AS "productId", p.product_name AS "productName", p.category AS "category",
        p.unit_price::numeric AS "unitPrice", p.cost_price::numeric AS "costPrice",
        i.quantity AS "quantity", i.reorder_point AS "reorderPoint",
        COALESCE(agg.units_90, 0) AS "units90",
        COALESCE(tot.units_total, 0) AS "unitsTotal",
        COALESCE(agg.std_weekly, 0) AS "stdWeekly"
      FROM products p
      JOIN inventory i ON i.product_id = p.product_id
      LEFT JOIN agg ON agg.product_id = p.product_id
      LEFT JOIN tot ON tot.product_id = p.product_id
    `)) as unknown as Array<Record<string, unknown>>;

    const inv: InventoryRow[] = rows.map((r) => ({
      productId: String(r.productId),
      productName: String(r.productName),
      category: String(r.category),
      unitPrice: Number(r.unitPrice),
      costPrice: Number(r.costPrice),
      quantity: Number(r.quantity),
      reorderPoint: Number(r.reorderPoint),
      units90: Number(r.units90),
      unitsTotal: Number(r.unitsTotal),
      stdWeekly: Number(r.stdWeekly),
    }));

    return NextResponse.json(computeInventory(inv));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Inventory optimization failed' }, { status: 500 });
  }
}
