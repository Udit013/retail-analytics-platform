import { db } from '@/src/db';
import { sales, orders } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await db.execute(sql`
      WITH daily_revenue AS (
        SELECT
          DATE_TRUNC('day', o.order_date::date) AS day,
          SUM(s.sales::numeric) AS revenue
        FROM ${sales} s
        JOIN ${orders} o ON s.order_id = o.order_id
        GROUP BY 1
      ),
      stats AS (
        SELECT
          AVG(revenue) AS mean,
          STDDEV(revenue) AS std
        FROM daily_revenue
      )
      SELECT
        to_char(dr.day, 'YYYY-MM-DD') AS date,
        ROUND(dr.revenue::numeric, 2) AS revenue,
        ROUND(stats.mean::numeric, 2) AS mean,
        ROUND(stats.std::numeric, 2) AS std,
        ROUND(((dr.revenue - stats.mean) / NULLIF(stats.std, 0))::numeric, 2) AS z_score,
        CASE
          WHEN dr.revenue > stats.mean + 2.5 * stats.std THEN 'high'
          WHEN dr.revenue < stats.mean - 2.5 * stats.std THEN 'low'
        END AS direction
      FROM daily_revenue dr, stats
      WHERE ABS((dr.revenue - stats.mean) / NULLIF(stats.std, 0)) > 2.5
      ORDER BY dr.day DESC
      LIMIT 20
    `);

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
