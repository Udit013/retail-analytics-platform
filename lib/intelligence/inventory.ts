/**
 * Inventory optimization — stock-out & overstock risk, safety stock, reorder points,
 * and recommended order quantities from demand velocity and variability.
 * Classic operations-research formulas (safety stock, service-level reorder point).
 */
import { normalCdf, clamp } from './stats';

export interface InventoryRow {
  productId: string;
  productName: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  reorderPoint: number;
  units90: number;   // units sold in last 90 days
  unitsTotal: number;
  stdWeekly: number; // std dev of weekly demand (last 90d)
}

export interface InventoryParams {
  leadTimeDays?: number;     // supplier lead time
  serviceLevel?: number;     // target in-stock probability (0..1)
  targetCoverDays?: number;  // desired days of stock when reordering
  holdingRate?: number;      // annual holding cost as a fraction of unit cost
}

export type StockStatus = 'Out of stock' | 'Reorder now' | 'Overstock' | 'Healthy';

export interface InventoryScore extends InventoryRow {
  avgDailyDemand: number;
  daysOfStock: number;      // -1 means effectively infinite (no demand)
  safetyStock: number;
  reorderPointCalc: number;
  stockoutRisk: number;     // 0..1 over lead time
  overstockRisk: number;    // 0..1
  recommendedOrderQty: number;
  carryingCost: number;     // annual $ to hold current stock
  status: StockStatus;
}

const Z_BY_SERVICE: Record<string, number> = { '0.9': 1.2816, '0.95': 1.6449, '0.975': 1.96, '0.99': 2.3263 };

export interface InventoryResult {
  products: InventoryScore[];
  summary: {
    skus: number;
    outOfStock: number;
    reorderNow: number;
    overstock: number;
    healthy: number;
    totalRecommendedUnits: number;
    totalRecommendedCost: number;   // cost to place all recommended reorders
    overstockCapital: number;       // carrying cost tied up in overstock
    atRiskRevenue: number;          // ~revenue exposed to stock-out over lead time
  };
}

export function computeInventory(rows: InventoryRow[], params: InventoryParams = {}): InventoryResult {
  const leadTime = params.leadTimeDays ?? 7;
  const service = params.serviceLevel ?? 0.95;
  const targetCover = params.targetCoverDays ?? 60;
  const holdingRate = params.holdingRate ?? 0.25;
  const z = Z_BY_SERVICE[String(service)] ?? 1.6449;

  const products: InventoryScore[] = rows.map((r) => {
    const avgDaily = r.units90 / 90;
    const dailyStd = r.stdWeekly / Math.sqrt(7);
    const leadDemandMean = avgDaily * leadTime;
    const leadDemandStd = dailyStd * Math.sqrt(leadTime);
    const safetyStock = Math.ceil(z * leadDemandStd);
    const reorderPointCalc = Math.ceil(leadDemandMean + safetyStock);
    const daysOfStock = avgDaily > 0 ? Math.round(r.quantity / avgDaily) : -1;

    // Stock-out risk = P(demand over lead time > current stock).
    let stockoutRisk = 0;
    if (avgDaily > 0) {
      stockoutRisk = leadDemandStd > 0
        ? clamp(1 - normalCdf((r.quantity - leadDemandMean) / leadDemandStd), 0, 1)
        : r.quantity < leadDemandMean ? 1 : 0;
    }

    // Overstock risk grows past the target cover window.
    const overstockRisk = daysOfStock < 0 ? (r.quantity > 0 ? 1 : 0)
      : clamp((daysOfStock - targetCover) / (targetCover * 2), 0, 1);

    let status: StockStatus;
    if (r.quantity <= 0) status = 'Out of stock';
    else if (r.quantity <= reorderPointCalc) status = 'Reorder now';
    else if (overstockRisk >= 0.6) status = 'Overstock';
    else status = 'Healthy';

    const targetQty = Math.ceil(avgDaily * targetCover + safetyStock);
    const recommendedOrderQty = status === 'Reorder now' || status === 'Out of stock'
      ? Math.max(0, targetQty - r.quantity) : 0;

    const carryingCost = Math.round(r.costPrice * r.quantity * holdingRate);

    return {
      ...r, avgDailyDemand: Math.round(avgDaily * 100) / 100, daysOfStock, safetyStock,
      reorderPointCalc, stockoutRisk: Math.round(stockoutRisk * 100) / 100,
      overstockRisk: Math.round(overstockRisk * 100) / 100, recommendedOrderQty, carryingCost, status,
    };
  });

  const summary = products.reduce((acc, p) => {
    acc.skus++;
    if (p.status === 'Out of stock') acc.outOfStock++;
    else if (p.status === 'Reorder now') acc.reorderNow++;
    else if (p.status === 'Overstock') acc.overstock++;
    else acc.healthy++;
    acc.totalRecommendedUnits += p.recommendedOrderQty;
    acc.totalRecommendedCost += p.recommendedOrderQty * p.costPrice;
    if (p.status === 'Overstock') acc.overstockCapital += p.carryingCost;
    // revenue exposed = stock-out risk × expected lead-time demand × price
    acc.atRiskRevenue += p.stockoutRisk * p.avgDailyDemand * leadTime * p.unitPrice;
    return acc;
  }, { skus: 0, outOfStock: 0, reorderNow: 0, overstock: 0, healthy: 0, totalRecommendedUnits: 0, totalRecommendedCost: 0, overstockCapital: 0, atRiskRevenue: 0 });

  summary.totalRecommendedCost = Math.round(summary.totalRecommendedCost);
  summary.overstockCapital = Math.round(summary.overstockCapital);
  summary.atRiskRevenue = Math.round(summary.atRiskRevenue);

  // Sort: most urgent first (out of stock & reorder by stock-out risk), then overstock.
  const order: Record<StockStatus, number> = { 'Out of stock': 0, 'Reorder now': 1, 'Overstock': 2, 'Healthy': 3 };
  products.sort((a, b) => order[a.status] - order[b.status] || b.stockoutRisk - a.stockoutRisk || b.carryingCost - a.carryingCost);

  return { products, summary };
}
