/**
 * Time-series data access for the intelligence engines.
 * Centralizes the SQL so forecasting / root-cause / decision-center share one source of truth.
 */
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';

export type Grain = 'day' | 'week' | 'month';

export interface SeriesPoint {
  date: string; // YYYY-MM-DD (period start)
  revenue: number;
  profit: number;
  orders: number;
  customers: number;
  quantity: number;
}

function grainUnit(grain: Grain): string {
  return ['day', 'week', 'month'].includes(grain) ? grain : 'month';
}

/** Aggregated revenue/profit/orders/customers/quantity time series. */
export async function getRevenueSeries(grain: Grain = 'day'): Promise<SeriesPoint[]> {
  const unit = grainUnit(grain);
  const rows = (await db.execute(sql`
    SELECT
      to_char(DATE_TRUNC(${unit}, o.order_date::date), 'YYYY-MM-DD') AS date,
      ROUND(SUM(s.sales::numeric), 2)   AS revenue,
      ROUND(SUM(s.profit::numeric), 2)  AS profit,
      COUNT(DISTINCT o.order_id)        AS orders,
      COUNT(DISTINCT o.customer_id)     AS customers,
      SUM(s.quantity)::int              AS quantity
    FROM sales s
    JOIN orders o ON s.order_id = o.order_id
    GROUP BY 1
    ORDER BY 1
  `)) as unknown as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    date: String(r.date),
    revenue: Number(r.revenue ?? 0),
    profit: Number(r.profit ?? 0),
    orders: Number(r.orders ?? 0),
    customers: Number(r.customers ?? 0),
    quantity: Number(r.quantity ?? 0),
  }));
}

/** Per-product daily demand (units) — used by inventory + product demand forecasting. */
export async function getProductDemandSeries(
  productId: string,
  grain: Grain = 'day'
): Promise<{ date: string; quantity: number }[]> {
  const unit = grainUnit(grain);
  const rows = (await db.execute(sql`
    SELECT
      to_char(DATE_TRUNC(${unit}, o.order_date::date), 'YYYY-MM-DD') AS date,
      SUM(s.quantity)::int AS quantity
    FROM sales s
    JOIN orders o ON s.order_id = o.order_id
    WHERE s.product_id = ${productId}
    GROUP BY 1
    ORDER BY 1
  `)) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({ date: String(r.date), quantity: Number(r.quantity ?? 0) }));
}

/** Pull a single numeric metric column out of a SeriesPoint[] as a plain number[]. */
export function metricValues(series: SeriesPoint[], metric: keyof Omit<SeriesPoint, 'date'>): number[] {
  return series.map((p) => Number(p[metric]) || 0);
}
