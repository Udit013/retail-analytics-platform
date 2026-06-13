import { db } from '@/src/db';
import { customers, products, orders, sales, etlLogs } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import Papa from 'papaparse';

interface CsvRow {
  'Row ID'?: string;
  'Order ID'?: string;
  'Order Date'?: string;
  'Ship Date'?: string;
  'Ship Mode'?: string;
  'Customer ID'?: string;
  'Customer Name'?: string;
  Segment?: string;
  Country?: string;
  City?: string;
  State?: string;
  'Postal Code'?: string;
  Region?: string;
  'Product ID'?: string;
  Category?: string;
  'Sub-Category'?: string;
  'Product Name'?: string;
  Sales?: string;
  Quantity?: string;
  Discount?: string;
  Profit?: string;
  [key: string]: string | undefined;
}

function parseDate(d: string) {
  if (!d) return null;
  const [m, day, y] = d.split('/');
  if (!m || !day || !y) return null;
  return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const text = await file.text();
    const { data: rows, errors } = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });

    let inserted = 0;
    const parseErrors: string[] = errors.map((e) => `Row ${e.row}: ${e.message}`);

    for (const row of rows) {
      try {
        const customerId = row['Customer ID'];
        const productId = row['Product ID'];
        const orderId = row['Order ID'];

        if (!customerId || !productId || !orderId) continue;

        await db.execute(sql`
          INSERT INTO customers (customer_id, customer_name, segment, country, city, state, postal_code, region)
          VALUES (${customerId}, ${row['Customer Name'] || ''}, ${row['Segment'] || ''}, ${row['Country'] || ''},
                  ${row['City'] || ''}, ${row['State'] || ''}, ${row['Postal Code'] || ''}, ${row['Region'] || ''})
          ON CONFLICT (customer_id) DO NOTHING
        `);

        await db.execute(sql`
          INSERT INTO products (product_id, product_name, category, sub_category)
          VALUES (${productId}, ${row['Product Name'] || ''}, ${row['Category'] || ''}, ${row['Sub-Category'] || ''})
          ON CONFLICT (product_id) DO NOTHING
        `);

        const orderDate = parseDate(row['Order Date'] || '');
        const shipDate = parseDate(row['Ship Date'] || '');
        if (!orderDate || !shipDate) continue;

        await db.execute(sql`
          INSERT INTO orders (order_id, order_date, ship_date, ship_mode, customer_id)
          VALUES (${orderId}, ${orderDate}::date, ${shipDate}::date, ${row['Ship Mode'] || ''}, ${customerId})
          ON CONFLICT (order_id) DO NOTHING
        `);

        await db.execute(sql`
          INSERT INTO sales (order_id, product_id, sales, quantity, discount, profit)
          VALUES (${orderId}, ${productId}, ${Number(row['Sales'] || 0)},
                  ${Number(row['Quantity'] || 0)}, ${Number(row['Discount'] || 0)}, ${Number(row['Profit'] || 0)})
        `);

        inserted++;
      } catch {
        parseErrors.push(`Row skipped: ${row['Order ID']}`);
      }
    }

    await db.insert(etlLogs).values({
      filename: file.name,
      totalRows: rows.length,
      insertedRows: inserted,
      errorRows: rows.length - inserted,
      errors: parseErrors.slice(0, 20).join('\n') || null,
    });

    return NextResponse.json({ inserted, total: rows.length, errors: parseErrors.slice(0, 10) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'ETL failed' }, { status: 500 });
  }
}
