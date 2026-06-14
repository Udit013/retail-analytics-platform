/**
 * Root cause analysis — decompose a KPI change across dimensions and structural factors,
 * rank likely causes by contribution, and attach confidence + recommended actions.
 */
import { clamp } from './stats';

export interface DimMember {
  name: string;
  current: number;
  prior: number;
}

export interface Driver {
  dimension: string;
  name: string;
  delta: number;
  contributionPct: number; // share of total change explained
  direction: 'positive' | 'negative';
}

export interface Factor {
  name: string;
  detail: string;
  impact: number; // signed $ impact (approx)
}

export interface RootCauseResult {
  metric: string;
  current: number;
  prior: number;
  change: number;
  changePct: number;
  decomposition: { volumeEffect: number; priceEffect: number };
  drivers: Driver[];
  factors: Factor[];
  recommendations: string[];
  confidence: number; // 0..1 — how well the top drivers explain the change
  summary: string;
}

const money = (n: number) => {
  const a = Math.abs(Math.round(n));
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}K` : `$${a}`;
  return n < 0 ? `-${s}` : s;
};

/** Rank dimension members by absolute contribution to the total change. */
export function rankDrivers(dimension: string, members: DimMember[], totalChange: number, topN = 4): Driver[] {
  const drivers = members
    .map((m) => ({
      dimension,
      name: m.name,
      delta: m.current - m.prior,
      contributionPct: totalChange !== 0 ? ((m.current - m.prior) / totalChange) * 100 : 0,
      direction: (m.current - m.prior) >= 0 ? ('positive' as const) : ('negative' as const),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return drivers.slice(0, topN).map((d) => ({
    ...d,
    delta: Math.round(d.delta),
    contributionPct: Math.round(d.contributionPct * 10) / 10,
  }));
}

export interface AssembleInput {
  metric: string;
  current: number;
  prior: number;
  unitsCurrent: number;
  unitsPrior: number;
  categories: DimMember[];
  regions: DimMember[];
  segments: DimMember[];
  newCustomers: number;
  churnedCustomers: number;
  churnedValue: number; // prior revenue from customers who didn't buy in current window
  refundCurrent: number;
  refundPrior: number;
  avgDiscountCurrent: number;
  avgDiscountPrior: number;
}

export function assembleRootCause(inp: AssembleInput): RootCauseResult {
  const change = inp.current - inp.prior;
  const changePct = inp.prior !== 0 ? (change / inp.prior) * 100 : 0;

  // Volume vs price (AOV/unit) decomposition.
  const aovCur = inp.current / Math.max(1, inp.unitsCurrent);
  const aovPri = inp.prior / Math.max(1, inp.unitsPrior);
  const volumeEffect = (inp.unitsCurrent - inp.unitsPrior) * aovPri;
  const priceEffect = (aovCur - aovPri) * inp.unitsCurrent;

  // Rank drivers across all dimensions, keep those aligned with the change direction first.
  const all = [
    ...rankDrivers('Category', inp.categories, change),
    ...rankDrivers('Region', inp.regions, change),
    ...rankDrivers('Segment', inp.segments, change),
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const drivers = all.slice(0, 6);

  // Structural factors.
  const factors: Factor[] = [];
  const refundDelta = inp.refundCurrent - inp.refundPrior;
  if (Math.abs(refundDelta) > 1) {
    factors.push({ name: 'Returns', detail: `Refunds ${refundDelta >= 0 ? 'rose' : 'fell'} to ${money(inp.refundCurrent)} (${money(refundDelta)} vs prior)`, impact: -refundDelta });
  }
  if (inp.churnedValue > 0) {
    factors.push({ name: 'Customer churn', detail: `${inp.churnedCustomers} customers from the prior window didn't buy (${money(inp.churnedValue)} of prior revenue)`, impact: -inp.churnedValue });
  }
  if (inp.newCustomers > 0) {
    factors.push({ name: 'New / reactivated customers', detail: `${inp.newCustomers} customers bought who weren't active in the prior window`, impact: 0 });
  }
  const discDelta = inp.avgDiscountCurrent - inp.avgDiscountPrior;
  if (Math.abs(discDelta) > 0.005) {
    factors.push({ name: 'Discounting', detail: `Average discount ${discDelta >= 0 ? 'increased' : 'decreased'} ${(Math.abs(discDelta) * 100).toFixed(1)} pts`, impact: 0 });
  }
  factors.push({
    name: 'Volume vs price',
    detail: `${Math.abs(volumeEffect) >= Math.abs(priceEffect) ? 'Volume' : 'Price/AOV'} was the bigger lever — volume ${money(volumeEffect)}, price ${money(priceEffect)}`,
    impact: 0,
  });

  // Confidence: how much of the change the top drivers + factors explain.
  const explained = drivers.filter((d) => d.direction === (change >= 0 ? 'positive' : 'negative'))
    .reduce((a, d) => a + Math.abs(d.delta), 0);
  const confidence = clamp(change !== 0 ? explained / Math.abs(change) : 0.5, 0.2, 0.95);

  // Recommendations.
  const recommendations: string[] = [];
  const worst = drivers.find((d) => d.direction === 'negative');
  const best = drivers.find((d) => d.direction === 'positive');
  if (change < 0) {
    if (worst) recommendations.push(`Investigate ${worst.dimension.toLowerCase()} "${worst.name}" — the largest drag (${money(worst.delta)}). Check assortment, stock, and pricing there.`);
    if (inp.churnedValue > 0) recommendations.push(`Launch a win-back campaign for the ${inp.churnedCustomers} lapsed customers (${money(inp.churnedValue)} at stake).`);
    if (refundDelta > 0) recommendations.push(`Returns are up ${money(refundDelta)} — audit top return reasons and affected products.`);
    if (best) recommendations.push(`Double down on ${best.dimension.toLowerCase()} "${best.name}", which still grew (${money(best.delta)}).`);
  } else {
    if (best) recommendations.push(`Reinvest in ${best.dimension.toLowerCase()} "${best.name}" — the top growth driver (${money(best.delta)}).`);
    if (Math.abs(volumeEffect) >= Math.abs(priceEffect)) recommendations.push('Growth is volume-led — ensure inventory and fulfilment can keep pace.');
    else recommendations.push('Growth is price/AOV-led — monitor elasticity before pushing prices further.');
    if (worst) recommendations.push(`Shore up ${worst.dimension.toLowerCase()} "${worst.name}", the main laggard (${money(worst.delta)}).`);
  }

  const summary = `${inp.metric} ${change >= 0 ? 'rose' : 'fell'} ${Math.abs(changePct).toFixed(1)}% (${money(change)}) vs the prior window, mainly driven by ${drivers[0] ? `${drivers[0].dimension.toLowerCase()} "${drivers[0].name}"` : 'broad-based movement'}.`;

  return {
    metric: inp.metric,
    current: Math.round(inp.current),
    prior: Math.round(inp.prior),
    change: Math.round(change),
    changePct: Math.round(changePct * 10) / 10,
    decomposition: { volumeEffect: Math.round(volumeEffect), priceEffect: Math.round(priceEffect) },
    drivers,
    factors,
    recommendations,
    confidence: Math.round(confidence * 100) / 100,
    summary,
  };
}
