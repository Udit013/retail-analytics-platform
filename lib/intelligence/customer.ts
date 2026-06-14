/**
 * Customer intelligence — RFM segmentation, predicted CLV, and churn risk.
 * Deterministic and explainable; every score traces back to the customer's
 * recency, frequency, and monetary behavior.
 */
import { clamp } from './stats';

export interface CustomerRow {
  customerId: string;
  customerName: string;
  segment: string; // business segment (Consumer/Corporate/...)
  region: string;
  orders: number;
  firstOrder: string;
  lastOrder: string;
  revenue: number;
  profit: number;
}

export type RfmSegment =
  | 'Champions' | 'Loyal' | 'Potential Loyalist' | 'Big Spenders'
  | 'At Risk' | 'Hibernating' | 'New' | 'Promising';

export type Action = 'Reward & retain (VIP)' | 'Win-back' | 'Upsell / cross-sell' | 'Nurture' | 'Monitor';

export interface CustomerScore extends CustomerRow {
  recencyDays: number;
  tenureDays: number;
  aov: number;
  marginPct: number;
  r: number; f: number; m: number; // RFM 1-5
  churnRisk: number;     // 0..1
  retention: number;     // 0..1 (1 - churn)
  predictedClv: number;  // next-12-month gross-profit CLV
  rfmSegment: RfmSegment;
  action: Action;
}

const DAY = 86_400_000;
const days = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY));

/** Assign 1-5 quintile scores; `invert` for recency (smaller is better). */
function quintiles(values: number[], invert = false): number[] {
  const idx = values.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
  const n = values.length;
  const out = new Array(n).fill(3);
  idx.forEach(([, i], rank) => {
    const q = Math.min(4, Math.floor((rank / n) * 5)); // 0..4
    out[i] = invert ? 5 - q : q + 1;
  });
  return out;
}

function classify(r: number, f: number, m: number, tenureDays: number): RfmSegment {
  if (r >= 4 && f >= 4) return 'Champions';
  if (f >= 4 && r >= 3) return 'Loyal';
  if (m >= 4 && f >= 3) return 'Big Spenders';
  if (r <= 2 && f >= 3) return 'At Risk';
  if (r <= 2 && f <= 2) return 'Hibernating';
  if (tenureDays <= 120 && f <= 2) return 'New';
  if (r >= 4 && f <= 2) return 'Promising';
  return 'Potential Loyalist';
}

function recommend(seg: RfmSegment, churn: number, clv: number, clvMedian: number): Action {
  if ((seg === 'Champions' || seg === 'Loyal' || seg === 'Big Spenders') && clv >= clvMedian) return 'Reward & retain (VIP)';
  if ((seg === 'At Risk' || seg === 'Hibernating') && clv >= clvMedian * 0.5) return 'Win-back';
  if (seg === 'Promising' || seg === 'Potential Loyalist') return 'Upsell / cross-sell';
  if (seg === 'New') return 'Nurture';
  if (churn >= 0.6) return 'Win-back';
  return 'Monitor';
}

export interface CustomerIntelligence {
  customers: CustomerScore[];
  summary: {
    totalCustomers: number;
    totalPredictedClv: number;
    avgChurnRisk: number;
    atRiskValue: number; // predicted CLV held by at-risk/hibernating customers
    segments: { segment: RfmSegment; count: number; revenue: number; predictedClv: number }[];
    actions: { action: Action; count: number; predictedClv: number }[];
  };
}

export function computeCustomerIntelligence(rows: CustomerRow[], maxDate: string): CustomerIntelligence {
  if (!rows.length) {
    return { customers: [], summary: { totalCustomers: 0, totalPredictedClv: 0, avgChurnRisk: 0, atRiskValue: 0, segments: [], actions: [] } };
  }

  const recency = rows.map((c) => days(c.lastOrder, maxDate));
  const frequency = rows.map((c) => c.orders);
  const monetary = rows.map((c) => c.revenue);
  const rS = quintiles(recency, true);
  const fS = quintiles(frequency);
  const mS = quintiles(monetary);

  const pre: CustomerScore[] = rows.map((c, i) => {
    const recencyDays = recency[i];
    const tenureDays = Math.max(1, days(c.firstOrder, maxDate));
    const accountAgeYears = Math.max(0.25, tenureDays / 365);
    const aov = c.revenue / Math.max(1, c.orders);
    const marginPct = clamp(c.profit / Math.max(1, c.revenue), 0.02, 0.9);
    const freqPerYear = c.orders / accountAgeYears;

    // Churn: recency relative to the customer's typical purchase gap.
    const avgGap = tenureDays / Math.max(1, c.orders);
    const ratio = recencyDays / Math.max(1, avgGap * 1.5);
    const churnRisk = clamp(1 - Math.exp(-ratio), 0, 0.99);
    const retention = 1 - churnRisk;

    // Predicted next-12-month gross-profit CLV.
    const predictedClv = Math.round(aov * freqPerYear * retention * marginPct);

    const rfmSegment = classify(rS[i], fS[i], mS[i], tenureDays);
    return {
      ...c, recencyDays, tenureDays, aov: Math.round(aov), marginPct: Math.round(marginPct * 1000) / 1000,
      r: rS[i], f: fS[i], m: mS[i], churnRisk: Math.round(churnRisk * 100) / 100,
      retention: Math.round(retention * 100) / 100, predictedClv, rfmSegment, action: 'Monitor',
    };
  });

  const clvSorted = [...pre.map((c) => c.predictedClv)].sort((a, b) => a - b);
  const clvMedian = clvSorted[Math.floor(clvSorted.length / 2)] || 0;
  const customers = pre.map((c) => ({ ...c, action: recommend(c.rfmSegment, c.churnRisk, c.predictedClv, clvMedian) }))
    .sort((a, b) => b.predictedClv - a.predictedClv);

  const bySeg = new Map<RfmSegment, { count: number; revenue: number; predictedClv: number }>();
  const byAction = new Map<Action, { count: number; predictedClv: number }>();
  let totalPredictedClv = 0, churnSum = 0, atRiskValue = 0;
  for (const c of customers) {
    totalPredictedClv += c.predictedClv;
    churnSum += c.churnRisk;
    if (c.rfmSegment === 'At Risk' || c.rfmSegment === 'Hibernating') atRiskValue += c.predictedClv;
    const s = bySeg.get(c.rfmSegment) ?? { count: 0, revenue: 0, predictedClv: 0 };
    s.count++; s.revenue += c.revenue; s.predictedClv += c.predictedClv; bySeg.set(c.rfmSegment, s);
    const a = byAction.get(c.action) ?? { count: 0, predictedClv: 0 };
    a.count++; a.predictedClv += c.predictedClv; byAction.set(c.action, a);
  }

  return {
    customers,
    summary: {
      totalCustomers: customers.length,
      totalPredictedClv: Math.round(totalPredictedClv),
      avgChurnRisk: Math.round((churnSum / customers.length) * 100) / 100,
      atRiskValue: Math.round(atRiskValue),
      segments: [...bySeg.entries()].map(([segment, v]) => ({ segment, count: v.count, revenue: Math.round(v.revenue), predictedClv: Math.round(v.predictedClv) })).sort((a, b) => b.predictedClv - a.predictedClv),
      actions: [...byAction.entries()].map(([action, v]) => ({ action, count: v.count, predictedClv: Math.round(v.predictedClv) })).sort((a, b) => b.predictedClv - a.predictedClv),
    },
  };
}
