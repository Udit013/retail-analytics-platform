'use client';
import { useEffect, useState } from 'react';

interface Driver { dimension: string; name: string; delta: number; contributionPct: number; direction: 'positive' | 'negative'; }
interface Factor { name: string; detail: string; impact: number; }
interface Resp {
  metric: string; current: number; prior: number; change: number; changePct: number; window: number;
  decomposition: { volumeEffect: number; priceEffect: number };
  drivers: Driver[]; factors: Factor[]; recommendations: string[]; confidence: number; summary: string;
  windows: { priorStart: string; split: string; currentEnd: string };
}

const money = (n: number) => {
  const a = Math.abs(Math.round(n));
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}K` : `$${a}`;
  return n < 0 ? `-${s}` : s;
};

export default function RootCause() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState(90);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/intelligence/root-cause?window=${window}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [window]);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Investigating…</div>;
  if (!data?.drivers) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data.</div>;

  const up = data.change >= 0;
  const maxAbs = Math.max(...data.drivers.map((d) => Math.abs(d.delta)), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded border border-gray-300 overflow-hidden">
          {[30, 90, 180].map((w) => (
            <button key={w} onClick={() => setWindow(w)}
              className={`text-xs px-3 py-1.5 ${window === w ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {w} days
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">vs prior {window} days · confidence {Math.round(data.confidence * 100)}%</span>
      </div>

      {/* Headline */}
      <div className={`rounded-xl border p-5 ${up ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-bold ${up ? 'text-emerald-700' : 'text-red-700'}`}>{up ? '▲' : '▼'} {Math.abs(data.changePct)}%</span>
          <span className="text-gray-600">{data.metric} {up ? 'growth' : 'decline'} · {money(data.change)}</span>
        </div>
        <p className="text-sm text-gray-700 mt-2">{data.summary}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Drivers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Top contributing drivers</h3>
          <div className="space-y-2.5">
            {data.drivers.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600"><span className="text-gray-400">{d.dimension}:</span> {d.name}</span>
                  <span className={`font-semibold ${d.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(d.delta)} ({d.contributionPct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded overflow-hidden">
                  <div className={`h-full ${d.delta >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${(Math.abs(d.delta) / maxAbs) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Volume effect <span className="font-semibold text-gray-700">{money(data.decomposition.volumeEffect)}</span> ·
            Price/AOV effect <span className="font-semibold text-gray-700"> {money(data.decomposition.priceEffect)}</span>
          </div>
        </div>

        {/* Factors */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Structural factors</h3>
          <div className="space-y-3">
            {data.factors.map((f, i) => (
              <div key={i} className="flex gap-3">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.impact < 0 ? 'bg-red-400' : 'bg-gray-300'}`} />
                <div>
                  <div className="text-sm font-medium text-gray-800">{f.name}</div>
                  <div className="text-xs text-gray-500">{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Recommended actions</h3>
        <ol className="space-y-2">
          {data.recommendations.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">{i + 1}</span>
              {r}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
