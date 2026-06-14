import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';

const DAY = 86_400_000;
const PERIOD_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90 };

export async function GET(req: NextRequest) {
  try {
    const period = (req.nextUrl.searchParams.get('period') ?? 'monthly').toLowerCase();
    const window = PERIOD_DAYS[period] ?? 30;
    const origin = req.nextUrl.origin;

    const [maxRow] = (await db.execute(sql`SELECT to_char(MAX(order_date::date),'YYYY-MM-DD') AS d FROM orders`)) as unknown as Array<Record<string, unknown>>;
    const anchor = new Date(String(maxRow?.d ?? new Date().toISOString().slice(0, 10)));
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    const d2 = iso(anchor.getTime()), d1 = iso(anchor.getTime() - window * DAY), d0 = iso(anchor.getTime() - 2 * window * DAY);

    const [k] = (await db.execute(sql`
      SELECT
        COALESCE(SUM(s.sales::numeric) FILTER (WHERE o.order_date::date > ${d1}::date), 0) AS rev_cur,
        COALESCE(SUM(s.sales::numeric) FILTER (WHERE o.order_date::date <= ${d1}::date), 0) AS rev_pri,
        COALESCE(SUM(s.profit::numeric) FILTER (WHERE o.order_date::date > ${d1}::date), 0) AS profit_cur,
        COUNT(DISTINCT o.order_id) FILTER (WHERE o.order_date::date > ${d1}::date) AS orders_cur,
        COUNT(DISTINCT o.order_id) FILTER (WHERE o.order_date::date <= ${d1}::date) AS orders_pri,
        COUNT(DISTINCT o.customer_id) FILTER (WHERE o.order_date::date > ${d1}::date) AS cust_cur
      FROM sales s JOIN orders o ON s.order_id = o.order_id
      WHERE o.order_date::date > ${d0}::date AND o.order_date::date <= ${d2}::date
    `)) as unknown as Array<Record<string, unknown>>;

    const revCur = Number(k?.rev_cur) || 0, revPri = Number(k?.rev_pri) || 0;
    const ordCur = Number(k?.orders_cur) || 0, ordPri = Number(k?.orders_pri) || 0;
    const profitCur = Number(k?.profit_cur) || 0;
    const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : 0);

    const kpis = [
      { label: 'Revenue', value: revCur, deltaPct: pct(revCur, revPri), money: true },
      { label: 'Gross profit', value: profitCur, deltaPct: pct(profitCur, revPri ? revPri * (profitCur / Math.max(1, revCur)) : 0), money: true },
      { label: 'Orders', value: ordCur, deltaPct: pct(ordCur, ordPri), money: false },
      { label: 'Avg order value', value: ordCur ? Math.round(revCur / ordCur) : 0, deltaPct: pct(revCur / Math.max(1, ordCur), revPri / Math.max(1, ordPri)), money: true },
      { label: 'Active customers', value: Number(k?.cust_cur) || 0, deltaPct: 0, money: false },
      { label: 'Gross margin %', value: revCur ? Math.round((profitCur / revCur) * 1000) / 10 : 0, deltaPct: 0, money: false, isPct: true },
    ];

    const decisionsResp = await fetch(`${origin}/api/intelligence/decisions`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
    const decisions = decisionsResp?.decisions ?? [];

    return NextResponse.json({
      period, window,
      range: { from: d1, to: d2 },
      generatedAt: new Date().toISOString(),
      kpis,
      decisions,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}
