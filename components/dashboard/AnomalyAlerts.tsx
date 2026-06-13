'use client';
import { useEffect, useState } from 'react';

interface Anomaly {
  date: string;
  revenue: number;
  mean: number;
  z_score: number;
  direction: 'high' | 'low';
}

export default function AnomalyAlerts() {
  const [data, setData] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/anomalies')
      .then((r) => r.json())
      .then((d) => {
        setData(d.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-xs text-green-600 font-medium">✓ No revenue anomalies detected in your data range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Revenue Anomalies{' '}
        <span className="text-xs font-normal text-gray-500 ml-1">(|z-score| &gt; 2.5)</span>
      </h2>
      <div className="space-y-2">
        {data.map((a, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-sm ${a.direction === 'high' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <span className="text-lg">{a.direction === 'high' ? '📈' : '📉'}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-800">{a.date}</span>
              <span className="mx-2 text-gray-400">—</span>
              <span className="font-semibold">${Number(a.revenue).toLocaleString()}</span>
              <span className="text-gray-500 ml-2 text-xs">
                (avg ${Number(a.mean).toLocaleString()}, z = {a.z_score})
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                {a.direction === 'high'
                  ? `Revenue was ${((a.revenue / a.mean - 1) * 100).toFixed(0)}% above average — possible campaign spike or bulk order.`
                  : `Revenue was ${((1 - a.revenue / a.mean) * 100).toFixed(0)}% below average — possible data gap or demand slump.`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
