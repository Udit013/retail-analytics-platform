'use client';
import { useEffect, useState } from 'react';

interface Decision {
  id: string; category: string; title: string; recommendation: string; expectedResult: string;
  confidence: number; reasoning: string; metrics: { label: string; value: string }[]; priority: number;
}

const CAT_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Growth: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Risk: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  Inventory: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Customer: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  Pricing: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
};

function confColor(c: number) {
  return c >= 0.8 ? 'text-emerald-600' : c >= 0.6 ? 'text-amber-600' : 'text-gray-500';
}

export default function DecisionCenter() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intelligence/decisions').then((r) => r.json()).then((d) => { setDecisions(d.decisions || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Synthesizing decisions across all engines…</div>;
  if (!decisions.length) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No decisions available.</div>;

  return (
    <div className="space-y-4">
      {decisions.map((d) => {
        const st = CAT_STYLE[d.category] ?? CAT_STYLE.Growth;
        return (
          <div key={d.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex">
              <div className={`w-1.5 ${st.dot}`} />
              <div className="flex-1 p-5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">{d.priority}</span>
                  <h3 className="text-base font-semibold text-gray-900">{d.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.bg} ${st.text}`}>{d.category}</span>
                  <span className={`ml-auto text-sm font-bold ${confColor(d.confidence)}`}>{Math.round(d.confidence * 100)}% confidence</span>
                </div>

                <p className="text-sm text-gray-700 mt-2">{d.recommendation}</p>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                  <div className="text-sm">
                    <span className="text-gray-400">Expected result: </span>
                    <span className="font-semibold text-gray-900">{d.expectedResult}</span>
                  </div>
                  {d.metrics.map((m) => (
                    <div key={m.label} className="text-xs">
                      <span className="text-gray-400">{m.label}: </span>
                      <span className="font-semibold text-gray-700">{m.value}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-2">{d.reasoning}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
