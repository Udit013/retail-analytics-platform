/**
 * AI Business Analyst — retrieval-augmented question answering over the analytics engines.
 *
 * Local-first: when Ollama is reachable, a local open-source model answers grounded in the
 * retrieved business context. When it isn't (e.g. on Vercel), a deterministic intent router
 * produces a grounded answer from the same structured data — so the analyst always responds.
 */

const money = (n: number) => {
  const a = Math.abs(Math.round(n));
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}K` : `$${a}`;
  return n < 0 ? `-${s}` : s;
};

export interface AnalystContext {
  forecast?: { model: string; projectedTotal: number; trendPerStep: number; backtestMape: number | null };
  rootCause?: { changePct: number; summary: string; topDriver?: string; topDrag?: string; recommendations: string[] };
  customers?: { totalPredictedClv: number; atRiskValue: number; atRiskCount: number; vipCount: number; topCustomer?: string };
  inventory?: { reorderCount: number; atRiskRevenue: number; recommendedCost: number; topItems: string[] };
  products?: { top: { name: string; revenue: number }[]; bottom: { name: string; revenue: number }[] };
  decisions?: { title: string; expectedResult: string; confidence: number }[];
}

/** Compact, model-readable context document built from the engines. */
export function buildContextText(c: AnalystContext): string {
  const lines: string[] = [];
  if (c.forecast) lines.push(`FORECAST: model ${c.forecast.model}, next-3-month revenue ~${money(c.forecast.projectedTotal)}, trend ${c.forecast.trendPerStep >= 0 ? '+' : ''}${money(c.forecast.trendPerStep)}/month${c.forecast.backtestMape != null ? `, backtest accuracy ${Math.round(100 - c.forecast.backtestMape)}%` : ''}.`);
  if (c.rootCause) lines.push(`RECENT TREND: ${c.rootCause.summary} Top driver: ${c.rootCause.topDriver ?? 'n/a'}. Biggest drag: ${c.rootCause.topDrag ?? 'n/a'}.`);
  if (c.customers) lines.push(`CUSTOMERS: total predicted 12-mo CLV ${money(c.customers.totalPredictedClv)}; ${c.customers.atRiskCount} at-risk customers worth ${money(c.customers.atRiskValue)}; ${c.customers.vipCount} VIPs; top customer ${c.customers.topCustomer ?? 'n/a'}.`);
  if (c.inventory) lines.push(`INVENTORY: ${c.inventory.reorderCount} products need reorder (PO ~${money(c.inventory.recommendedCost)}), ${money(c.inventory.atRiskRevenue)} revenue at stock-out risk; urgent: ${c.inventory.topItems.slice(0, 3).join(', ') || 'none'}.`);
  if (c.products) {
    lines.push(`TOP PRODUCTS: ${c.products.top.slice(0, 5).map((p) => `${p.name} (${money(p.revenue)})`).join('; ')}.`);
    lines.push(`WEAKEST PRODUCTS: ${c.products.bottom.slice(0, 5).map((p) => `${p.name} (${money(p.revenue)})`).join('; ')}.`);
  }
  if (c.decisions) lines.push(`TOP DECISIONS: ${c.decisions.slice(0, 4).map((d) => `${d.title} → ${d.expectedResult} (${Math.round(d.confidence * 100)}%)`).join('; ')}.`);
  return lines.join('\n');
}

export function analystPrompt(question: string, contextText: string): string {
  return `You are RetailNexa AI, a sharp retail business analyst. Answer the user's question using ONLY the business context below. Be specific, cite the numbers, explain the "why", and end with a concrete recommendation. Keep it under 6 sentences. If the context doesn't cover it, say what data would be needed.

BUSINESS CONTEXT:
${contextText}

QUESTION: ${question}

ANSWER:`;
}

/** Deterministic, grounded answer via intent routing — the always-available fallback. */
export function deterministicAnswer(question: string, c: AnalystContext): string {
  const q = question.toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => q.includes(k));

  if (has('decline', 'drop', 'down', 'fell', 'decrease', 'why did revenue', 'lower', 'losing')) {
    if (c.rootCause) {
      const recs = c.rootCause.recommendations.slice(0, 2).join(' ');
      return `${c.rootCause.summary} The biggest drag was ${c.rootCause.topDrag ?? 'a broad mix shift'}, while ${c.rootCause.topDriver ?? 'some areas'} held up. Recommended: ${recs}`;
    }
  }
  if (has('forecast', 'predict', 'next', 'future', 'projection', 'expect', 'outlook')) {
    if (c.forecast) return `The ${c.forecast.model} forecast projects ~${money(c.forecast.projectedTotal)} in revenue over the next 3 months, trending ${c.forecast.trendPerStep >= 0 ? 'up' : 'down'} (${c.forecast.trendPerStep >= 0 ? '+' : ''}${money(c.forecast.trendPerStep)}/month)${c.forecast.backtestMape != null ? ` at ~${Math.round(100 - c.forecast.backtestMape)}% backtest accuracy` : ''}. Plan inventory and staffing to match this trajectory.`;
  }
  if (has('churn', 'retain', 'retention', 'lose customer', 'at risk', 'win back', 'win-back')) {
    if (c.customers) return `You have ${c.customers.atRiskCount} at-risk/hibernating customers carrying ${money(c.customers.atRiskValue)} of predicted CLV. Launch a targeted win-back (personalized offer based on past purchases) before that value lapses, and protect your ${c.customers.vipCount} VIPs with a loyalty program.`;
  }
  if (has('vip', 'best customer', 'valuable', 'loyal', 'top customer', 'retain')) {
    if (c.customers) return `Your ${c.customers.vipCount} VIPs (Champions/Loyal) are the core of ${money(c.customers.totalPredictedClv)} total predicted CLV${c.customers.topCustomer ? `, led by ${c.customers.topCustomer}` : ''}. Prioritize retention here — early access, loyalty rewards — since churn among them is the most expensive.`;
  }
  if (has('discontinue', 'worst', 'drop product', 'underperform', 'weak', 'remove product', 'cut')) {
    if (c.products) return `The weakest products by revenue are ${c.products.bottom.slice(0, 5).map((p) => p.name).join(', ')}. Before discontinuing, check margin and whether they anchor bundles; otherwise phase them out and redeploy shelf/marketing to top performers like ${c.products.top.slice(0, 2).map((p) => p.name).join(' and ')}.`;
  }
  if (has('best product', 'top product', 'driving growth', 'growth', 'selling', 'increase', 'grow')) {
    if (c.products || c.rootCause) return `Growth is led by ${c.rootCause?.topDriver ?? 'top categories'}; the strongest products are ${(c.products?.top ?? []).slice(0, 5).map((p) => p.name).join(', ')}. Reinvest marketing and inventory behind these and the categories driving the trend.`;
  }
  if (has('reorder', 'stock', 'inventory', 'out of stock', 'restock', 'supply')) {
    if (c.inventory) return `${c.inventory.reorderCount} products are at/below their reorder point with ${money(c.inventory.atRiskRevenue)} of revenue exposed to stock-outs; a ~${money(c.inventory.recommendedCost)} purchase order covers them. Start with ${c.inventory.topItems.slice(0, 3).join(', ') || 'the highest-velocity items'}.`;
  }
  if (has('profit', 'margin', 'increase profit', 'profitability')) {
    const r = c.rootCause?.recommendations?.[0];
    return `To lift profit next quarter: protect high-margin top sellers, reduce discounting where elasticity is low (use the Pricing Simulator), cut returns on problem SKUs, and reorder high-velocity stock to avoid lost sales.${r ? ` Also: ${r}` : ''}`;
  }
  if (has('promotion', 'discount', 'price', 'pricing', 'sale')) {
    return `Use the Pricing Simulator to test scenarios before committing — for low-elasticity categories a small price increase can lift profit, while deep discounts only pay off when the volume lift outweighs the margin hit. Model 10–20% and BOGO to compare projected profit impact.`;
  }

  // Default: summarize the top recommended decisions.
  if (c.decisions?.length) {
    return `Here are the highest-priority moves right now: ${c.decisions.slice(0, 3).map((d, i) => `${i + 1}) ${d.title} — ${d.expectedResult} (${Math.round(d.confidence * 100)}% confidence)`).join('; ')}. Open the Decision Center for the full ranked list and reasoning.`;
  }
  return `I can answer questions about revenue trends, forecasts, customers (CLV/churn), products, inventory, and pricing. Try: "Why did revenue change recently?" or "Which customers should we retain?"`;
}

export const EXAMPLE_QUESTIONS = [
  'Why did revenue change last quarter?',
  'What should we do to increase profit next quarter?',
  'Which customers should we retain?',
  'Which products should we discontinue?',
  'What inventory should we reorder?',
  'What does the revenue forecast look like?',
];
