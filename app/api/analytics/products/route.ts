import { db } from '@/src/db';
import { sales, products, returns } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sortBy = searchParams.get('sort') || 'revenue';

    const catFilter = category
      ? sql`AND p.category = ${category}`
      : sql``;

    const orderCol =
      sortBy === 'units' ? sql`units DESC` :
      sortBy === 'return_rate' ? sql`return_rate DESC` :
      sql`revenue DESC`;

    const data = await db.execute(sql`
      SELECT
        p.product_id,
        p.product_name,
        p.category,
        p.sub_category,
        ROUND(SUM(s.sales::numeric), 2) AS revenue,
        SUM(s.quantity) AS units,
        ROUND(SUM(s.profit::numeric), 2) AS profit,
        COUNT(r.return_id)::float / NULLIF(COUNT(s.sales_id), 0) AS return_rate
      FROM ${sales} s
      JOIN ${products} p ON s.product_id = p.product_id
      LEFT JOIN ${returns} r ON s.sales_id = r.sales_id
      WHERE 1=1 ${catFilter}
      GROUP BY p.product_id, p.product_name, p.category, p.sub_category
      ORDER BY ${orderCol}
      LIMIT ${limit}
    `);

    const categories = await db.execute(sql`
      SELECT DISTINCT category FROM ${products} ORDER BY category
    `);

    return NextResponse.json({ data, categories: categories.map((r: Record<string, unknown>) => r.category) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
