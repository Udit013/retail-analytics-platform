'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

interface Row {
  period: string;
  revenue: number;
  profit: number;
  orders: number;
  pct_change: number | null;
}

const PERIODS = ['day', 'week', 'month', 'quarter'] as const;

function ExportBtn({ url }: { url: string }) {
  return (
    <a href={url} download className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-600">
      Export CSV
    </a>
  );
}

export default function RevenueChart() {
  const [data, setData] = useState<Row[]>([]);
  const [period, setPeriod] = useState<typeof PERIODS[number]>('month');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/revenue?period=${period}&startDate=${startDate}&endDate=${endDate}`)
      .then((r) => r.json())
      .then((d) => {
        setData((d.data || []).map((r: Record<string, unknown>) => ({
          period: String(r.period).slice(0, 10),
          revenue: Number(r.revenue),
          profit: Number(r.profit),
          orders: Number(r.orders),
          pct_change: r.pct_change != null ? Number(r.pct_change) : null,
        })));
        setLoading(false);
      });
  }, [period, startDate, endDate]);

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-800">Revenue Trend</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1" />
          <span className="text-gray-400 text-xs">→</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1" />
          <div className="flex rounded border border-gray-300 overflow-hidden">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs px-2 py-1 capitalize ${period === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
          <ExportBtn url={`/api/export?resource=revenue&format=csv&startDate=${startDate}&endDate=${endDate}`} />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(0, 7)} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v, name) => [name === 'orders' ? v : `$${Number(v).toLocaleString()}`, name]} />
            <Legend />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} name="Revenue" />
            <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
