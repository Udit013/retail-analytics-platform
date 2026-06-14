import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';
import { computeCustomerIntelligence, type CustomerRow } from '@/lib/intelligence/customer';

export async function GET() {
  try {
    const [maxRow] = (await db.execute(sql`
      SELECT to_char(MAX(order_date::date), 'YYYY-MM-DD') AS max_date FROM orders
    `)) as unknown as Array<Record<string, unknown>>;
    const maxDate = String(maxRow?.max_date ?? new Date().toISOString().slice(0, 10));

    const rows = (await db.execute(sql`
      SELECT
        o.customer_id AS "customerId",
        c.customer_name AS "customerName",
        c.segment AS "segment",
        c.region AS "region",
        COUNT(DISTINCT o.order_id)::int AS "orders",
        to_char(MIN(o.order_date::date), 'YYYY-MM-DD') AS "firstOrder",
        to_char(MAX(o.order_date::date), 'YYYY-MM-DD') AS "lastOrder",
        ROUND(SUM(s.sales::numeric), 2) AS "revenue",
        ROUND(SUM(s.profit::numeric), 2) AS "profit"
      FROM orders o
      JOIN sales s ON s.order_id = o.order_id
      JOIN customers c ON c.customer_id = o.customer_id
      GROUP BY o.customer_id, c.customer_name, c.segment, c.region
    `)) as unknown as Array<Record<string, unknown>>;

    const customers: CustomerRow[] = rows.map((r) => ({
      customerId: String(r.customerId),
      customerName: String(r.customerName),
      segment: String(r.segment),
      region: String(r.region),
      orders: Number(r.orders),
      firstOrder: String(r.firstOrder),
      lastOrder: String(r.lastOrder),
      revenue: Number(r.revenue),
      profit: Number(r.profit),
    }));

    const result = computeCustomerIntelligence(customers, maxDate);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Customer intelligence failed' }, { status: 500 });
  }
}
