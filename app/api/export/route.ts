import { db } from '@/src/db';
import { sales, orders, products, customers, inventory, returns } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource') || 'revenue';
  const format = searchParams.get('format') || 'json';
  const startDate = searchParams.get('startDate') || '2022-01-01';
  const endDate = searchParams.get('endDate') || '2024-12-31';

  try {
    let data: Record<string, unknown>[] = [];

    if (resource === 'revenue') {
      data = await db.execute(sql`
        SELECT to_char(DATE_TRUNC('month', o.order_date::date), 'YYYY-MM') AS month,
          ROUND(SUM(s.sales::numeric), 2) AS revenue,
          ROUND(SUM(s.profit::numeric), 2) AS profit,
          COUNT(DISTINCT o.order_id) AS orders
        FROM ${sales} s JOIN ${orders} o ON s.order_id = o.order_id
        WHERE o.order_date::date BETWEEN ${startDate}::date AND ${endDate}::date
        GROUP BY 1 ORDER BY 1
      `) as Record<string, unknown>[];
    } else if (resource === 'products') {
      data = await db.execute(sql`
        SELECT p.product_name, p.category, p.sub_category,
          ROUND(SUM(s.sales::numeric), 2) AS revenue, SUM(s.quantity) AS units
        FROM ${sales} s JOIN ${products} p ON s.product_id = p.product_id
        GROUP BY p.product_id, p.product_name, p.category, p.sub_category
        ORDER BY revenue DESC LIMIT 200
      `) as Record<string, unknown>[];
    } else if (resource === 'customers') {
      data = await db.execute(sql`
        SELECT customer_name, segment, country, city, state, region FROM ${customers} LIMIT 1000
      `) as Record<string, unknown>[];
    } else if (resource === 'inventory') {
      data = await db.execute(sql`
        SELECT p.product_name, p.category, i.quantity, i.reorder_point, i.last_restocked
        FROM ${inventory} i JOIN ${products} p ON i.product_id = p.product_id
        ORDER BY i.quantity ASC LIMIT 500
      `) as Record<string, unknown>[];
    } else if (resource === 'returns') {
      data = await db.execute(sql`
        SELECT p.product_name, p.category, r.return_date, r.reason, r.refund_amount
        FROM ${returns} r
        JOIN ${sales} s ON r.sales_id = s.sales_id
        JOIN ${products} p ON s.product_id = p.product_id
        ORDER BY r.return_date DESC LIMIT 500
      `) as Record<string, unknown>[];
    }

    if (format === 'csv') {
      const csv = toCSV(data);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${resource}-export.csv"`,
        },
      });
    }

    return NextResponse.json({ data, count: data.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
