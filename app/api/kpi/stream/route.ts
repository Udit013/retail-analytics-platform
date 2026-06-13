import { db } from '@/src/db';
import { sales, orders, returns, customers } from '@/src/db/schema';
import { sql } from 'drizzle-orm';

async function computeKpis() {
  const now = new Date();
  const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d60ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const cur = d30ago.toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  const prev = d60ago.toISOString().slice(0, 10);

  const [curr] = await db.execute(sql`
    SELECT
      COALESCE(SUM(s.sales::numeric), 0) AS revenue,
      COUNT(DISTINCT o.order_id) AS orders,
      COALESCE(SUM(s.sales::numeric) / NULLIF(COUNT(DISTINCT o.order_id), 0), 0) AS aov,
      COUNT(DISTINCT o.customer_id) AS active_customers
    FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id
    WHERE o.order_date::date BETWEEN ${cur}::date AND ${end}::date
  `);
  const [prev30] = await db.execute(sql`
    SELECT
      COALESCE(SUM(s.sales::numeric), 0) AS revenue,
      COUNT(DISTINCT o.order_id) AS orders
    FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id
    WHERE o.order_date::date BETWEEN ${prev}::date AND ${cur}::date
  `);
  const [ret] = await db.execute(sql`
    SELECT COUNT(r.return_id)::float / NULLIF(COUNT(s.sales_id), 0) AS return_rate
    FROM ${sales} s LEFT JOIN ${returns} r ON s.sales_id = r.sales_id
  `);
  const [totalCustomers] = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ${customers}`);

  const c = curr as Record<string, unknown>;
  const p = prev30 as Record<string, unknown>;

  return {
    revenue: Number(c.revenue),
    orders: Number(c.orders),
    aov: Number(c.aov),
    activeCustomers: Number(c.active_customers),
    totalCustomers: Number((totalCustomers as Record<string, unknown>).cnt),
    returnRate: Number((ret as Record<string, unknown>).return_rate),
    revenuePrev: Number(p.revenue),
    ordersPrev: Number(p.orders),
    revenuePct: p.revenue ? ((Number(c.revenue) - Number(p.revenue)) / Number(p.revenue)) * 100 : 0,
    ordersPct: p.orders ? ((Number(c.orders) - Number(p.orders)) / Number(p.orders)) * 100 : 0,
  };
}

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const kpis = await computeKpis();
          controller.enqueue(`data: ${JSON.stringify(kpis)}\n\n`);
        } catch {
          controller.enqueue(`data: ${JSON.stringify({ error: true })}\n\n`);
        }
      };

      await send();
      const interval = setInterval(send, 30_000);

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
