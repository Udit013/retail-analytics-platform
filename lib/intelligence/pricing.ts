/**
 * Pricing & promotion scenario modeling using constant price-elasticity of demand.
 * Pure functions — usable on both server and client for instant slider feedback.
 *
 * Demand response: newUnits = baseUnits · (newPrice/basePrice)^elasticity · promoLift
 * (elasticity is negative; a price cut raises demand).
 */

export interface Baseline {
  id: string;
  label: string;
  baseUnits: number;   // trailing 12-month units
  basePrice: number;   // avg realized price
  unitCost: number;    // avg unit cost
  elasticity: number;  // price elasticity of demand (negative)
}

export interface ScenarioResult {
  newPrice: number;
  newUnits: number;
  newRevenue: number;
  newProfit: number;
  newMarginPct: number;
  baseRevenue: number;
  baseProfit: number;
  baseMarginPct: number;
  revenueDeltaPct: number;
  profitDeltaPct: number;
  unitsDeltaPct: number;
}

/** Default elasticities by category (typical retail ranges). */
export const CATEGORY_ELASTICITY: Record<string, number> = {
  Electronics: -1.2,
  Furniture: -1.0,
  Apparel: -1.5,
  'Food & Beverage': -0.8,
  'Sports & Outdoors': -1.3,
  All: -1.2,
};

export interface PromoType {
  id: string;
  label: string;
  pricePct: number;        // effective price change (negative = discount)
  lift: number;            // extra promo-driven demand multiplier (traffic/urgency)
  extraCostPerUnit?: number; // e.g. absorbed shipping cost
  note: string;
}

export const PROMOS: PromoType[] = [
  { id: 'pct10', label: '10% off', pricePct: -10, lift: 1.15, note: 'Light discount, modest traffic lift' },
  { id: 'pct20', label: '20% off', pricePct: -20, lift: 1.35, note: 'Deeper discount, strong traffic lift' },
  { id: 'bogo', label: 'Buy one get one', pricePct: -50, lift: 1.8, note: 'Effective 50% per-unit price, large volume lift' },
  { id: 'freeship', label: 'Free shipping', pricePct: 0, lift: 1.18, extraCostPerUnit: 4, note: 'No price cut; absorbs ~$4/unit shipping' },
];

function build(base: Baseline, newPrice: number, newUnits: number, extraCostPerUnit = 0): ScenarioResult {
  const baseRevenue = base.basePrice * base.baseUnits;
  const baseProfit = (base.basePrice - base.unitCost) * base.baseUnits;
  const newRevenue = newPrice * newUnits;
  const newProfit = (newPrice - base.unitCost - extraCostPerUnit) * newUnits;
  const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);
  return {
    newPrice: Math.round(newPrice * 100) / 100,
    newUnits: Math.round(newUnits),
    newRevenue: Math.round(newRevenue),
    newProfit: Math.round(newProfit),
    newMarginPct: newRevenue === 0 ? 0 : Math.round((newProfit / newRevenue) * 1000) / 10,
    baseRevenue: Math.round(baseRevenue),
    baseProfit: Math.round(baseProfit),
    baseMarginPct: baseRevenue === 0 ? 0 : Math.round((baseProfit / baseRevenue) * 1000) / 10,
    revenueDeltaPct: Math.round(pct(newRevenue, baseRevenue) * 10) / 10,
    profitDeltaPct: Math.round(pct(newProfit, baseProfit) * 10) / 10,
    unitsDeltaPct: Math.round(pct(newUnits, base.baseUnits) * 10) / 10,
  };
}

/** Simulate a straight price change (percent). */
export function simulatePrice(base: Baseline, pricePct: number): ScenarioResult {
  const ratio = 1 + pricePct / 100;
  const newPrice = base.basePrice * ratio;
  const demandMult = Math.pow(Math.max(0.01, ratio), base.elasticity);
  const newUnits = base.baseUnits * demandMult;
  return build(base, newPrice, newUnits);
}

/** Simulate a named promotion. */
export function simulatePromo(base: Baseline, promo: PromoType): ScenarioResult {
  const ratio = 1 + promo.pricePct / 100;
  const newPrice = base.basePrice * ratio;
  const demandMult = Math.pow(Math.max(0.01, ratio), base.elasticity) * promo.lift;
  const newUnits = base.baseUnits * demandMult;
  return build(base, newPrice, newUnits, promo.extraCostPerUnit ?? 0);
}
