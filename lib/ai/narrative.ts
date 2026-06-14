/**
 * Deterministic business-narrative generation.
 *
 * Produces plain-English summaries from metrics WITHOUT any LLM, so insights always
 * work — on Vercel, offline, or anywhere Ollama isn't running. When a local model IS
 * available, callers can pass this deterministic draft to Ollama for a richer rewrite.
 */

export interface WeeklyContext {
  revenueCurrent: number;
  revenuePrev: number;
  topCategory: string;
  topProduct: string;
  returnRate: number;
  lowStockCount: number;
  anomalyCount: number;
}

const money = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}K`
      : `$${n.toFixed(0)}`;

export function pctChange(current: number, prev: number): number {
  if (prev <= 0) return 0;
  return ((current - prev) / prev) * 100;
}

/** Deterministic 3-4 sentence weekly summary with one actionable recommendation. */
export function buildWeeklyNarrative(c: WeeklyContext): string {
  const change = pctChange(c.revenueCurrent, c.revenuePrev);
  const dir = change >= 0 ? 'up' : 'down';
  const mag = Math.abs(change);
  const trend =
    mag < 2 ? 'roughly flat' : mag < 10 ? `modestly ${dir}` : `sharply ${dir}`;

  const sentences: string[] = [];
  sentences.push(
    `Revenue came in at ${money(c.revenueCurrent)} this week, ${trend} (${change >= 0 ? '+' : ''}${change.toFixed(1)}%) versus the prior week.`
  );
  sentences.push(
    `${c.topCategory} led performance and ${c.topProduct} was the single strongest product.`
  );

  const returnPct = (c.returnRate * 100).toFixed(1);
  if (c.returnRate > 0.1) {
    sentences.push(
      `Returns are elevated at ${returnPct}%, which is eroding net revenue and worth investigating by product and reason.`
    );
  } else {
    sentences.push(`Return rate is healthy at ${returnPct}%.`);
  }

  // One prioritized recommendation.
  let rec: string;
  if (c.lowStockCount > 0 && change >= 0) {
    rec = `With demand rising and ${c.lowStockCount} product(s) below reorder point, prioritize restocking top sellers to avoid stock-outs.`;
  } else if (change < -10) {
    rec = `Given the sharp revenue drop, run a root-cause check on product mix and customer churn, and consider a targeted promotion to recover momentum.`;
  } else if (c.anomalyCount > 0) {
    rec = `There ${c.anomalyCount === 1 ? 'is 1 revenue anomaly' : `are ${c.anomalyCount} revenue anomalies`} flagged — review those days to confirm they're genuine and not data issues.`;
  } else if (c.lowStockCount > 0) {
    rec = `Restock the ${c.lowStockCount} item(s) below reorder point before they go out of stock.`;
  } else {
    rec = `Momentum is stable — reinvest in ${c.topCategory} and your top performers to compound growth.`;
  }
  sentences.push(`Recommendation: ${rec}`);

  return sentences.join(' ');
}

/** Prompt used to ask a local model to polish the deterministic draft (optional enrichment). */
export function enrichmentPrompt(draft: string, c: WeeklyContext): string {
  return `You are a concise retail analytics assistant. Rewrite the following weekly business summary so it reads naturally and professionally in 3-4 sentences. Keep every number exactly as given, no bullet points, end with one clear recommendation.

DATA:
- Revenue this week: $${c.revenueCurrent.toFixed(0)} (prior week: $${c.revenuePrev.toFixed(0)})
- Top category: ${c.topCategory}
- Top product: ${c.topProduct}
- Return rate: ${(c.returnRate * 100).toFixed(1)}%
- Products below reorder point: ${c.lowStockCount}
- Revenue anomalies: ${c.anomalyCount}

DRAFT TO IMPROVE:
${draft}`;
}
