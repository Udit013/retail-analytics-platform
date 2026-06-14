import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';
import { assembleRootCause, type DimMember } from '@/lib/intelligence/rootcause';

const DAY = 86_400_000;

export async function GET(req: NextRequest) {
  try {
    const window = Math.min(180, Math.max(14, Number(req.nextUrl.searchParams.get('window')) || 90));

    const [maxRow] = (await db.execute(sql`
      SELECT to_char(MAX(order_date::date), 'YYYY-MM-DD') AS d FROM orders
    `)) as unknown as Array<Record<string, unknown>>;
    const anchor = new Date(String(maxRow?.d ?? new Date().toISOString().slice(0, 10)));
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    const d2 = iso(anchor.getTime());
    const d1 = iso(anchor.getTime() - window * DAY);
    const d0 = iso(anchor.getTime() - 2 * window * DAY);

    const dimQuery = (col: string) => sql`
      SELECT x.name AS name,
        COALESCE(SUM(s.sales::numeric) FILTER (WHERE o.order_date::date > ${d1}::date AND o.order_date::date <= ${d2}::date), 0) AS current,
        COALESCE(SUM(s.sales::numeric) FILTER (WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d1}::date), 0) AS prior
      FROM sales s
      JOIN orders o ON s.order_id = o.order_id
      JOIN products p ON p.product_id = s.product_id
      JOIN customers c ON c.customer_id = o.customer_id
      CROSS JOIN LATERAL (SELECT ${sql.raw(col)} AS name) x
      WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d2}::date
      GROUP BY 1`;

    const toMembers = (rows: Array<Record<string, unknown>>): DimMember[] =>
      rows.map((r) => ({ name: String(r.name), current: Number(r.current) || 0, prior: Number(r.prior) || 0 }));

    const [totals] = (await db.execute(sql`
      SELECT
        COALESCE(SUM(s.sales::numeric)  FILTER (WHERE o.order_date::date > ${d1}::date AND o.order_date::date <= ${d2}::date), 0) AS rev_cur,
        COALESCE(SUM(s.sales::numeric)  FILTER (WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d1}::date), 0) AS rev_pri,
        COALESCE(SUM(s.quantity)        FILTER (WHERE o.order_date::date > ${d1}::date AND o.order_date::date <= ${d2}::date), 0) AS u_cur,
        COALESCE(SUM(s.quantity)        FILTER (WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d1}::date), 0) AS u_pri,
        COALESCE(AVG(s.discount::numeric) FILTER (WHERE o.order_date::date > ${d1}::date AND o.order_date::date <= ${d2}::date), 0) AS disc_cur,
        COALESCE(AVG(s.discount::numeric) FILTER (WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d1}::date), 0) AS disc_pri
      FROM sales s JOIN orders o ON s.order_id = o.order_id
      WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d2}::date
    `)) as unknown as Array<Record<string, unknown>>;

    const categories = toMembers((await db.execute(dimQuery('p.category')) as unknown as Array<Record<string, unknown>>));
    const regions = toMembers((await db.execute(dimQuery('c.region')) as unknown as Array<Record<string, unknown>>));
    const segments = toMembers((await db.execute(dimQuery('c.segment')) as unknown as Array<Record<string, unknown>>));

    const [refunds] = (await db.execute(sql`
      SELECT
        COALESCE(SUM(refund_amount::numeric) FILTER (WHERE return_date::date > ${d1}::date AND return_date::date <= ${d2}::date), 0) AS cur,
        COALESCE(SUM(refund_amount::numeric) FILTER (WHERE return_date::date > ${d0}::date AND return_date::date <= ${d1}::date), 0) AS pri
      FROM returns WHERE return_date::date > ${d0}::date AND return_date::date <= ${d2}::date
    `)) as unknown as Array<Record<string, unknown>>;

    const [cust] = (await db.execute(sql`
      WITH cur AS (SELECT DISTINCT customer_id FROM orders WHERE order_date::date > ${d1}::date AND order_date::date <= ${d2}::date),
           pri AS (SELECT DISTINCT customer_id FROM orders WHERE order_date::date > ${d0}::date AND order_date::date <= ${d1}::date)
      SELECT
        (SELECT COUNT(*) FROM cur WHERE customer_id NOT IN (SELECT customer_id FROM pri)) AS new_c,
        (SELECT COUNT(*) FROM pri WHERE customer_id NOT IN (SELECT customer_id FROM cur)) AS churned_c,
        (SELECT COALESCE(SUM(s.sales::numeric), 0) FROM sales s JOIN orders o ON s.order_id = o.order_id
           WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d1}::date
           AND o.customer_id IN (SELECT customer_id FROM pri WHERE customer_id NOT IN (SELECT customer_id FROM cur))) AS churned_value
    `)) as unknown as Array<Record<string, unknown>>;

    const result = assembleRootCause({
      metric: 'Revenue',
      current: Number(totals?.rev_cur) || 0,
      prior: Number(totals?.rev_pri) || 0,
      unitsCurrent: Number(totals?.u_cur) || 0,
      unitsPrior: Number(totals?.u_pri) || 0,
      categories, regions, segments,
      newCustomers: Number(cust?.new_c) || 0,
      churnedCustomers: Number(cust?.churned_c) || 0,
      churnedValue: Number(cust?.churned_value) || 0,
      refundCurrent: Number(refunds?.cur) || 0,
      refundPrior: Number(refunds?.pri) || 0,
      avgDiscountCurrent: Number(totals?.disc_cur) || 0,
      avgDiscountPrior: Number(totals?.disc_pri) || 0,
    });

    return NextResponse.json({ window, windows: { priorStart: d0, split: d1, currentEnd: d2 }, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Root cause analysis failed' }, { status: 500 });
  }
}
