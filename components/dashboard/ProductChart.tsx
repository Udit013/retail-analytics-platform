'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface Product {
  product_name: string;
  category: string;
  revenue: number;
  units: number;
  profit: number;
  return_rate: number;
}

const SORT_OPTIONS = ['revenue', 'units', 'return_rate'] as const;
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];

export default function ProductChart() {
  const [data, setData] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<typeof SORT_OPTIONS[number]>('revenue');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: '15' });
    if (category) params.set('category', category);
    fetch(`/api/analytics/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData((d.data || []).map((r: Record<string, unknown>) => ({
          product_name: String(r.product_name).slice(0, 25),
          category: String(r.category),
          revenue: Number(r.revenue),
          units: Number(r.units),
          profit: Number(r.profit),
          return_rate: Number(r.return_rate),
        })));
        setCategories(d.categories || []);
        setLoading(false);
      });
  }, [sort, category]);

  const dataKey = sort === 'units' ? 'units' : sort === 'return_rate' ? 'return_rate' : 'revenue';
  const fmt = (v: number) =>
    dataKey === 'revenue' ? `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0)}` :
    dataKey === 'return_rate' ? `${(v * 100).toFixed(1)}%` :
    v.toLocaleString();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-800">Top Products</h2>
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex rounded border border-gray-300 overflow-hidden">
            {SORT_OPTIONS.map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`text-xs px-2 py-1 capitalize ${sort === s ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <a href={`/api/export?resource=products&format=csv`} download
            className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-600">
            Export CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 160, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
            <YAxis dataKey="product_name" type="category" tick={{ fontSize: 10 }} width={155} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
