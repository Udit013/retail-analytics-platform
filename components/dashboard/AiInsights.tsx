'use client';
import { useEffect, useState } from 'react';

export default function AiInsights() {
  const [insight, setInsight] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => {
        if (d.insight) {
          setInsight(d.insight);
          setSource(d.source || '');
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">✨</span>
        <h2 className="text-base font-semibold text-indigo-900">AI Weekly Summary</h2>
        {source && (
          <span className="text-xs text-indigo-400 font-medium ml-auto">{source}</span>
        )}
      </div>
      {loading && (
        <div className="space-y-2">
          <div className="h-4 bg-indigo-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-indigo-100 rounded animate-pulse w-4/5" />
          <div className="h-4 bg-indigo-100 rounded animate-pulse w-3/5" />
        </div>
      )}
      {!loading && error && (
        <p className="text-sm text-indigo-500 italic">Insight unavailable right now — please retry.</p>
      )}
      {!loading && !error && (
        <p className="text-sm text-indigo-800 leading-relaxed">{insight}</p>
      )}
    </div>
  );
}
