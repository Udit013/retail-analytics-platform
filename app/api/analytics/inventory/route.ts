import { db } from '@/src/db';
import { inventory, products, sales, orders } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await db.execute(sql`
      SELECT
        p.product_id,
        p.product_name,
        p.category,
        p.sub_category,
        i.quantity AS stock,
        i.reorder_point,
        i.last_restocked,
        COALESCE(ROUND(SUM(s.quantity)::numeric / NULLIF(
          EXTRACT('days' FROM NOW() - MIN(o.order_date::date)), 0
        ), 2), 0) AS daily_velocity,
        CASE
          WHEN i.quantity = 0 THEN 'out_of_stock'
          WHEN i.quantity <= i.reorder_point THEN 'critical'
          WHEN i.quantity <= i.reorder_point * 2 THEN 'low'
          ELSE 'ok'
        END AS health,
        CASE
          WHEN COALESCE(SUM(s.quantity)::numeric / NULLIF(
            EXTRACT('days' FROM NOW() - MIN(o.order_date::date)), 0
          ), 0) > 0
          THEN ROUND(i.quantity / (SUM(s.quantity)::numeric / NULLIF(
            EXTRACT('days' FROM NOW() - MIN(o.order_date::date)), 0
          )), 0)
          ELSE NULL
        END AS days_of_stock
      FROM ${inventory} i
      JOIN ${products} p ON i.product_id = p.product_id
      LEFT JOIN ${sales} s ON p.product_id = s.product_id
      LEFT JOIN ${orders} o ON s.order_id = o.order_id
      GROUP BY p.product_id, p.product_name, p.category, p.sub_category,
               i.quantity, i.reorder_point, i.last_restocked
      ORDER BY
        CASE health
          WHEN 'out_of_stock' THEN 0
          WHEN 'critical' THEN 1
          WHEN 'low' THEN 2
          ELSE 3
        END,
        stock ASC
    `);

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
