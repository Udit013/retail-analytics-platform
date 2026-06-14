/**
 * Decision Center — synthesizes the forecasting, customer, inventory, and root-cause
 * engines into a ranked list of actionable decisions, each with expected outcome,
 * confidence, reasoning, and supporting metrics.
 */

export type DecisionCategory = 'Growth' | 'Risk' | 'Inventory' | 'Customer' | 'Pricing';

export interface Decision {
  id: string;
  category: DecisionCategory;
  title: string;
  recommendation: string;
  expectedResult: string;
  confidence: number; // 0..1
  reasoning: string;
  metrics: { label: string; value: string }[];
  priority: number; // higher = more important (impact × confidence)
}

const money = (n: number) => {
  const a = Math.abs(Math.round(n));
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}K` : `$${a}`;
  return n < 0 ? `-${s}` : s;
};

export interface DecisionInputs {
  forecast: {
    metricLabel: string;
    lastActual: number;
    projectedTotal: number;     // sum over horizon
    horizonLabel: string;       // e.g. "next 3 months"
    trendPerStep: number;
    backtestAccuracy: number;   // 0..1
    model: string;
  };
  rootCause: {
    changePct: number;
    topDriver: string;
    confidence: number;
  } | null;
  inventory: {
    reorderCount: number;
    atRiskRevenue: number;
    recommendedCost: number;
    topItems: string[];
    overstockCapital: number;
  };
  customer: {
    atRiskValue: number;
    atRiskCount: number;
    vipCount: number;
    vipValue: number;
    totalPredictedClv: number;
  };
}

export function buildDecisions(inp: DecisionInputs): Decision[] {
  const decisions: Decision[] = [];
  const f = inp.forecast;
  const growing = f.trendPerStep >= 0;

  // 1. Growth / decline from forecast.
  decisions.push({
    id: 'forecast-trend',
    category: growing ? 'Growth' : 'Risk',
    title: growing ? `Capitalize on projected ${f.metricLabel.toLowerCase()} growth` : `Mitigate projected ${f.metricLabel.toLowerCase()} decline`,
    recommendation: growing
      ? `Forecast points up over the ${f.horizonLabel}. Lock in inventory, staffing, and marketing to capture ${money(f.projectedTotal)} of projected ${f.metricLabel.toLowerCase()}.`
      : `Forecast points down over the ${f.horizonLabel}. Launch demand-generation (promotions, win-back) before the dip materializes.`,
    expectedResult: `${money(f.projectedTotal)} projected ${f.metricLabel.toLowerCase()} (${f.horizonLabel})`,
    confidence: f.backtestAccuracy,
    reasoning: `${f.model} forecast with ${Math.round(f.backtestAccuracy * 100)}% out-of-sample backtest accuracy; trend ${growing ? '+' : ''}${money(f.trendPerStep)}/period.`,
    metrics: [
      { label: 'Last period', value: money(f.lastActual) },
      { label: `Projected (${f.horizonLabel})`, value: money(f.projectedTotal) },
      { label: 'Accuracy', value: `${Math.round(f.backtestAccuracy * 100)}%` },
    ],
    priority: f.projectedTotal * f.backtestAccuracy,
  });

  // 2. Inventory reorder risk.
  if (inp.inventory.reorderCount > 0) {
    decisions.push({
      id: 'inventory-reorder',
      category: 'Inventory',
      title: `Reorder ${inp.inventory.reorderCount} products to prevent stock-outs`,
      recommendation: `Place purchase orders (~${money(inp.inventory.recommendedCost)}) for the ${inp.inventory.reorderCount} products at or below their reorder point${inp.inventory.topItems.length ? `, starting with ${inp.inventory.topItems.slice(0, 3).join(', ')}` : ''}.`,
      expectedResult: `Protect ${money(inp.inventory.atRiskRevenue)} of at-risk revenue`,
      confidence: 0.8,
      reasoning: `${inp.inventory.reorderCount} SKUs below the service-level reorder point; estimated ${money(inp.inventory.atRiskRevenue)} revenue exposed over lead time.`,
      metrics: [
        { label: 'SKUs to reorder', value: String(inp.inventory.reorderCount) },
        { label: 'PO cost', value: money(inp.inventory.recommendedCost) },
        { label: 'Revenue at risk', value: money(inp.inventory.atRiskRevenue) },
      ],
      priority: inp.inventory.atRiskRevenue * 0.8,
    });
  }

  // 3. Customer churn / win-back.
  if (inp.customer.atRiskValue > 0) {
    decisions.push({
      id: 'customer-winback',
      category: 'Customer',
      title: `Win back ${inp.customer.atRiskCount} at-risk customers`,
      recommendation: `Target the ${inp.customer.atRiskCount} at-risk / hibernating customers with a personalized win-back offer before their value is lost.`,
      expectedResult: `Recover up to ${money(inp.customer.atRiskValue)} predicted CLV`,
      confidence: 0.7,
      reasoning: `These customers carry ${money(inp.customer.atRiskValue)} of predicted 12-month CLV but show high churn risk based on recency vs their purchase cadence.`,
      metrics: [
        { label: 'At-risk customers', value: String(inp.customer.atRiskCount) },
        { label: 'CLV at risk', value: money(inp.customer.atRiskValue) },
      ],
      priority: inp.customer.atRiskValue * 0.7,
    });
  }

  // 4. VIP retention.
  if (inp.customer.vipValue > 0) {
    decisions.push({
      id: 'customer-vip',
      category: 'Customer',
      title: `Protect ${inp.customer.vipCount} VIP customers`,
      recommendation: `Enroll your ${inp.customer.vipCount} VIPs (Champions/Loyal) in a loyalty or early-access program to defend ${money(inp.customer.vipValue)} of high-value CLV.`,
      expectedResult: `Defend ${money(inp.customer.vipValue)} VIP CLV`,
      confidence: 0.75,
      reasoning: `VIPs concentrate a large share of predicted CLV (${money(inp.customer.vipValue)} of ${money(inp.customer.totalPredictedClv)} total); retention here has outsized ROI.`,
      metrics: [
        { label: 'VIPs', value: String(inp.customer.vipCount) },
        { label: 'VIP CLV', value: money(inp.customer.vipValue) },
      ],
      priority: inp.customer.vipValue * 0.5,
    });
  }

  // 5. Overstock capital release.
  if (inp.inventory.overstockCapital > 0) {
    decisions.push({
      id: 'inventory-overstock',
      category: 'Inventory',
      title: 'Release capital tied up in overstock',
      recommendation: `Run clearance or bundle promotions on overstocked SKUs to free ~${money(inp.inventory.overstockCapital)} of working capital.`,
      expectedResult: `Free ~${money(inp.inventory.overstockCapital)} working capital`,
      confidence: 0.6,
      reasoning: `Overstocked SKUs are accruing carrying cost without matching demand velocity.`,
      metrics: [{ label: 'Overstock capital', value: money(inp.inventory.overstockCapital) }],
      priority: inp.inventory.overstockCapital * 0.4,
    });
  }

  // 6. Root-cause-driven decision.
  if (inp.rootCause) {
    const down = inp.rootCause.changePct < 0;
    decisions.push({
      id: 'root-cause',
      category: down ? 'Risk' : 'Growth',
      title: down ? `Address revenue decline led by ${inp.rootCause.topDriver}` : `Double down on ${inp.rootCause.topDriver}`,
      recommendation: down
        ? `Revenue is down ${Math.abs(inp.rootCause.changePct)}% — focus recovery on ${inp.rootCause.topDriver}, the largest drag.`
        : `Revenue is up ${inp.rootCause.changePct}% — reinvest in ${inp.rootCause.topDriver}, the largest growth driver.`,
      expectedResult: `${inp.rootCause.changePct >= 0 ? '+' : ''}${inp.rootCause.changePct}% recent revenue trend`,
      confidence: inp.rootCause.confidence,
      reasoning: `Root-cause decomposition attributes most of the recent change to ${inp.rootCause.topDriver}.`,
      metrics: [
        { label: 'Recent trend', value: `${inp.rootCause.changePct >= 0 ? '+' : ''}${inp.rootCause.changePct}%` },
        { label: 'Top driver', value: inp.rootCause.topDriver },
      ],
      priority: Math.abs(inp.rootCause.changePct) * 10000 * inp.rootCause.confidence,
    });
  }

  return decisions.sort((a, b) => b.priority - a.priority).map((d, i) => ({ ...d, priority: i + 1 }));
}
