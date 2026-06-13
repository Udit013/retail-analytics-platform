import { db } from '@/src/db';
import { sales, orders } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('startDate') || '2022-01-01';
    const endDate = searchParams.get('endDate') || '2024-12-31';

    const truncUnit = ['day', 'week', 'month', 'quarter'].includes(period)
      ? period
      : 'month';

    const data = await db.execute(sql`
      WITH periods AS (
        SELECT
          DATE_TRUNC(${truncUnit}, o.order_date::date) AS period,
          SUM(s.sales::numeric) AS revenue,
          SUM(s.profit::numeric) AS profit,
          COUNT(DISTINCT o.order_id) AS orders,
          COUNT(DISTINCT o.customer_id) AS customers
        FROM ${sales} s
        JOIN ${orders} o ON s.order_id = o.order_id
        WHERE o.order_date::date BETWEEN ${startDate}::date AND ${endDate}::date
        GROUP BY 1
        ORDER BY 1
      )
      SELECT
        to_char(period, 'YYYY-MM-DD') AS period,
        ROUND(revenue::numeric, 2) AS revenue,
        ROUND(profit::numeric, 2) AS profit,
        orders::int AS orders,
        customers::int AS customers,
        ROUND(
          (revenue - LAG(revenue) OVER (ORDER BY period))
          / NULLIF(LAG(revenue) OVER (ORDER BY period), 0) * 100,
          1
        ) AS pct_change
      FROM periods
    `);

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
