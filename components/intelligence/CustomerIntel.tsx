'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Score {
  customerId: string; customerName: string; segment: string; region: string;
  orders: number; revenue: number; aov: number; recencyDays: number;
  churnRisk: number; predictedClv: number; rfmSegment: string; action: string;
}
interface Resp {
  customers: Score[];
  summary: {
    totalCustomers: number; totalPredictedClv: number; avgChurnRisk: number; atRiskValue: number;
    segments: { segment: string; count: number; revenue: number; predictedClv: number }[];
    actions: { action: string; count: number; predictedClv: number }[];
  };
}

const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Math.round(n)}`;

const SEG_COLOR: Record<string, string> = {
  Champions: '#059669', Loyal: '#10b981', 'Big Spenders': '#6366f1', 'Potential Loyalist': '#3b82f6',
  Promising: '#0ea5e9', New: '#a855f7', 'At Risk': '#f59e0b', Hibernating: '#ef4444',
};
const ACTION_COLOR: Record<string, string> = {
  'Reward & retain (VIP)': 'bg-emerald-100 text-emerald-700',
  'Win-back': 'bg-red-100 text-red-700',
  'Upsell / cross-sell': 'bg-indigo-100 text-indigo-700',
  'Nurture': 'bg-purple-100 text-purple-700',
  'Monitor': 'bg-gray-100 text-gray-600',
};

function churnBadge(c: number) {
  const cls = c >= 0.6 ? 'bg-red-100 text-red-700' : c >= 0.3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>{Math.round(c * 100)}%</span>;
}

export default function CustomerIntel() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/intelligence/customers').then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Scoring customers…</div>;
  if (!data?.customers?.length) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No customer data.</div>;

  const { summary } = data;
  const shown = data.customers.filter((c) => filter === 'all' || c.rfmSegment === filter).slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Customers" value={summary.totalCustomers.toLocaleString()} />
        <Stat label="Predicted 12-mo CLV" value={money(summary.totalPredictedClv)} accent="text-emerald-600" />
        <Stat label="Avg churn risk" value={`${Math.round(summary.avgChurnRisk * 100)}%`} accent="text-amber-600" />
        <Stat label="At-risk CLV" value={money(summary.atRiskValue)} accent="text-red-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Predicted CLV by RFM segment</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={summary.segments} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="segment" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
              <YAxis tickFormatter={money} tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="predictedClv" radius={[4, 4, 0, 0]}>
                {summary.segments.map((s) => <Cell key={s.segment} fill={SEG_COLOR[s.segment] ?? '#6366f1'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Recommended actions</h3>
          <div className="space-y-2">
            {summary.actions.map((a) => (
              <div key={a.action} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLOR[a.action] ?? 'bg-gray-100 text-gray-600'}`}>{a.action}</span>
                <span className="text-sm text-gray-600">{a.count} customers · <span className="font-semibold text-gray-900">{money(a.predictedClv)}</span></span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button onClick={() => setFilter('all')} className={`text-xs px-2 py-1 rounded border ${filter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}>All</button>
            {summary.segments.map((s) => (
              <button key={s.segment} onClick={() => setFilter(s.segment)}
                className={`text-xs px-2 py-1 rounded border ${filter === s.segment ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}>
                {s.segment} ({s.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Customers {filter !== 'all' && `· ${filter}`} <span className="text-gray-400 font-normal">(top 50 by predicted CLV)</span></h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-3">Customer</th><th className="px-3">Segment</th><th className="px-3 text-right">Orders</th>
              <th className="px-3 text-right">Revenue</th><th className="px-3 text-right">AOV</th><th className="px-3 text-right">Recency</th>
              <th className="px-3 text-center">Churn</th><th className="px-3 text-right">Pred. CLV</th><th className="px-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-3 font-medium text-gray-800">{c.customerName}</td>
                <td className="px-3"><span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: (SEG_COLOR[c.rfmSegment] ?? '#6366f1') + '22', color: SEG_COLOR[c.rfmSegment] ?? '#6366f1' }}>{c.rfmSegment}</span></td>
                <td className="px-3 text-right text-gray-600">{c.orders}</td>
                <td className="px-3 text-right text-gray-600">{money(c.revenue)}</td>
                <td className="px-3 text-right text-gray-600">{money(c.aov)}</td>
                <td className="px-3 text-right text-gray-600">{c.recencyDays}d</td>
                <td className="px-3 text-center">{churnBadge(c.churnRisk)}</td>
                <td className="px-3 text-right font-semibold text-gray-900">{money(c.predictedClv)}</td>
                <td className="px-3"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ACTION_COLOR[c.action] ?? 'bg-gray-100 text-gray-600'}`}>{c.action}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${accent ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
