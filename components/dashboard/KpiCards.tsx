'use client';
import { useEffect, useState } from 'react';

interface KpiData {
  revenue: number;
  orders: number;
  aov: number;
  activeCustomers: number;
  totalCustomers: number;
  returnRate: number;
  revenuePct: number;
  ordersPct: number;
  error?: boolean;
}

function PctBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Card({ label, value, sub, pct }: { label: string; value: string; sub?: string; pct?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2 shadow-sm">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <div className="flex items-center gap-2">
        {pct !== undefined && <PctBadge pct={pct} />}
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

export default function KpiCards() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const es = new EventSource('/api/kpi/stream');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as KpiData;
      setKpis(data);
      setLastUpdated(new Date().toLocaleTimeString());
    };
    return () => es.close();
  }, []);

  if (!kpis) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}K`
      : `$${n.toFixed(0)}`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card label="Revenue (30d)" value={fmt(kpis.revenue)} pct={kpis.revenuePct} sub="vs prev 30d" />
        <Card label="Orders (30d)" value={kpis.orders.toLocaleString()} pct={kpis.ordersPct} sub="vs prev 30d" />
        <Card label="Avg Order Value" value={`$${kpis.aov.toFixed(2)}`} />
        <Card label="Return Rate" value={`${(kpis.returnRate * 100).toFixed(1)}%`} sub="all time" />
        <Card label="Active Customers" value={kpis.activeCustomers.toLocaleString()} sub={`of ${kpis.totalCustomers.toLocaleString()}`} />
      </div>
      <p className="text-xs text-gray-400 text-right">Live • refreshes every 30s • last: {lastUpdated}</p>
    </div>
  );
}
