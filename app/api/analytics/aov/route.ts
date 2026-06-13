import { db } from '@/src/db';
import { sales, orders } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || '2022-01-01';
    const endDate = searchParams.get('endDate') || '2024-12-31';

    const trend = await db.execute(sql`
      SELECT
        to_char(DATE_TRUNC('month', o.order_date::date), 'YYYY-MM') AS month,
        ROUND(SUM(s.sales::numeric) / NULLIF(COUNT(DISTINCT o.order_id), 0), 2) AS aov,
        ROUND(AVG(s.quantity), 2) AS avg_basket_size,
        COUNT(DISTINCT o.order_id) AS order_count
      FROM ${sales} s
      JOIN ${orders} o ON s.order_id = o.order_id
      WHERE o.order_date::date BETWEEN ${startDate}::date AND ${endDate}::date
      GROUP BY DATE_TRUNC('month', o.order_date::date)
      ORDER BY 1
    `);

    const distribution = await db.execute(sql`
      WITH order_totals AS (
        SELECT order_id, SUM(sales::numeric) AS total
        FROM ${sales}
        GROUP BY order_id
      )
      SELECT
        CASE
          WHEN total < 50 THEN '<$50'
          WHEN total < 100 THEN '$50-100'
          WHEN total < 250 THEN '$100-250'
          WHEN total < 500 THEN '$250-500'
          WHEN total < 1000 THEN '$500-1k'
          ELSE '$1k+'
        END AS bucket,
        COUNT(*) AS order_count
      FROM order_totals
      GROUP BY 1
      ORDER BY MIN(total)
    `);

    return NextResponse.json({ trend, distribution });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
