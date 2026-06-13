'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

interface TrendRow { month: string; aov: number; avg_basket_size: number; order_count: number }
interface BucketRow { bucket: string; order_count: number }

export default function AovChart() {
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [distribution, setDistribution] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/aov?startDate=2022-01-01&endDate=2024-12-31')
      .then((r) => r.json())
      .then((d) => {
        setTrend((d.trend || []).map((r: Record<string, unknown>) => ({
          month: String(r.month),
          aov: Number(r.aov),
          avg_basket_size: Number(r.avg_basket_size),
          order_count: Number(r.order_count),
        })));
        setDistribution((d.distribution || []).map((r: Record<string, unknown>) => ({
          bucket: String(r.bucket),
          order_count: Number(r.order_count),
        })));
        setLoading(false);
      });
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">AOV Trend</h2>
        {loading ? <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading...</div> : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10 }} width={45} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'AOV']} />
              <Line type="monotone" dataKey="aov" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Basket Size Distribution</h2>
        {loading ? <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading...</div> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="order_count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
