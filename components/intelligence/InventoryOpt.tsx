'use client';
import { useEffect, useState } from 'react';

interface Score {
  productId: string; productName: string; category: string; quantity: number;
  avgDailyDemand: number; daysOfStock: number; safetyStock: number; reorderPointCalc: number;
  stockoutRisk: number; overstockRisk: number; recommendedOrderQty: number; carryingCost: number; status: string;
}
interface Resp {
  products: Score[];
  summary: {
    skus: number; outOfStock: number; reorderNow: number; overstock: number; healthy: number;
    totalRecommendedUnits: number; totalRecommendedCost: number; overstockCapital: number; atRiskRevenue: number;
  };
}

const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Math.round(n)}`;
const STATUS_COLOR: Record<string, string> = {
  'Out of stock': 'bg-red-100 text-red-700', 'Reorder now': 'bg-amber-100 text-amber-700',
  'Overstock': 'bg-blue-100 text-blue-700', 'Healthy': 'bg-emerald-100 text-emerald-700',
};

export default function InventoryOpt() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/intelligence/inventory').then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Analyzing stock levels…</div>;
  if (!data?.products?.length) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No inventory data.</div>;

  const { summary } = data;
  const shown = data.products.filter((p) => filter === 'all' || p.status === filter).slice(0, 60);
  const filters = ['all', 'Out of stock', 'Reorder now', 'Overstock', 'Healthy'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Reorder now" value={`${summary.reorderNow + summary.outOfStock}`} sub={`${summary.outOfStock} out of stock`} accent="text-amber-600" />
        <Stat label="Recommended PO" value={money(summary.totalRecommendedCost)} sub={`${summary.totalRecommendedUnits.toLocaleString()} units`} accent="text-indigo-600" />
        <Stat label="Stock-out revenue at risk" value={money(summary.atRiskRevenue)} sub="over lead time" accent="text-red-600" />
        <Stat label="Overstock capital" value={money(summary.overstockCapital)} sub={`${summary.overstock} SKUs`} accent="text-blue-600" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1 rounded border capitalize ${filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'all' ? `All (${summary.skus})` : f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-3">Product</th><th className="px-3">Category</th>
              <th className="px-3 text-right">Stock</th><th className="px-3 text-right">Daily demand</th>
              <th className="px-3 text-right">Days cover</th><th className="px-3 text-right">Reorder pt</th>
              <th className="px-3 text-center">Stock-out</th><th className="px-3 text-right">Order qty</th><th className="px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.productId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-3 font-medium text-gray-800 max-w-[220px] truncate">{p.productName}</td>
                <td className="px-3 text-gray-500">{p.category}</td>
                <td className="px-3 text-right text-gray-600">{p.quantity}</td>
                <td className="px-3 text-right text-gray-600">{p.avgDailyDemand}</td>
                <td className="px-3 text-right text-gray-600">{p.daysOfStock < 0 ? '∞' : `${p.daysOfStock}d`}</td>
                <td className="px-3 text-right text-gray-600">{p.reorderPointCalc}</td>
                <td className="px-3 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.stockoutRisk >= 0.5 ? 'bg-red-100 text-red-700' : p.stockoutRisk >= 0.2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{Math.round(p.stockoutRisk * 100)}%</span>
                </td>
                <td className="px-3 text-right font-semibold text-gray-900">{p.recommendedOrderQty || '—'}</td>
                <td className="px-3"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[p.status]}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Reorder point = lead-time demand + safety stock (z·σ·√lead-time) at 95% service level, lead time 7 days,
        target cover 60 days. Stock-out risk = P(lead-time demand &gt; current stock).
      </p>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${accent ?? 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
