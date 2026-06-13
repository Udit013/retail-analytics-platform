import { db } from '@/src/db';
import { orders } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await db.execute(sql`
      WITH first_orders AS (
        SELECT customer_id, DATE_TRUNC('month', order_date::date) AS cohort_month
        FROM ${orders}
        GROUP BY customer_id
      ),
      cohort_sizes AS (
        SELECT cohort_month, COUNT(*) AS cohort_size
        FROM first_orders
        GROUP BY cohort_month
      ),
      monthly_activity AS (
        SELECT
          f.customer_id,
          f.cohort_month,
          DATE_TRUNC('month', o.order_date::date) AS activity_month,
          EXTRACT('month' FROM AGE(DATE_TRUNC('month', o.order_date::date), f.cohort_month))::int AS month_number
        FROM ${orders} o
        JOIN first_orders f ON o.customer_id = f.customer_id
        WHERE EXTRACT('month' FROM AGE(DATE_TRUNC('month', o.order_date::date), f.cohort_month)) BETWEEN 0 AND 11
      )
      SELECT
        to_char(ma.cohort_month, 'YYYY-MM') AS cohort,
        ma.month_number,
        COUNT(DISTINCT ma.customer_id) AS active_customers,
        cs.cohort_size,
        ROUND(COUNT(DISTINCT ma.customer_id)::numeric / cs.cohort_size * 100, 1) AS retention_pct
      FROM monthly_activity ma
      JOIN cohort_sizes cs ON ma.cohort_month = cs.cohort_month
      GROUP BY ma.cohort_month, ma.month_number, cs.cohort_size
      ORDER BY ma.cohort_month, ma.month_number
    `);

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
