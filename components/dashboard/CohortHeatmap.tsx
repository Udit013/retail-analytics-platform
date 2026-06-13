'use client';
import { useEffect, useState } from 'react';

interface CohortRow {
  cohort: string;
  month_number: number;
  retention_pct: number;
  active_customers: number;
  cohort_size: number;
}

function colorForPct(pct: number): string {
  if (pct >= 70) return '#312e81';
  if (pct >= 50) return '#4f46e5';
  if (pct >= 35) return '#6366f1';
  if (pct >= 20) return '#818cf8';
  if (pct >= 10) return '#a5b4fc';
  if (pct > 0) return '#e0e7ff';
  return '#f9fafb';
}

export default function CohortHeatmap() {
  const [rawData, setRawData] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/cohorts')
      .then((r) => r.json())
      .then((d) => {
        setRawData(d.data || []);
        setLoading(false);
      });
  }, []);

  const cohorts = [...new Set(rawData.map((r) => r.cohort))].sort();
  const maxMonth = Math.max(...rawData.map((r) => r.month_number), 0);

  const grid: Record<string, Record<number, CohortRow>> = {};
  for (const row of rawData) {
    if (!grid[row.cohort]) grid[row.cohort] = {};
    grid[row.cohort][row.month_number] = row;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Customer Cohort Retention</h2>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <div>
          <div className="text-xs text-gray-500 mb-3">
            % of cohort still active at month N — darker = higher retention
          </div>
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left p-1.5 pr-3 text-gray-500 font-medium whitespace-nowrap">Cohort</th>
                <th className="p-1.5 text-gray-500 font-medium">Size</th>
                {Array.from({ length: maxMonth + 1 }, (_, i) => (
                  <th key={i} className="p-1.5 text-gray-500 font-medium">M{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.slice(-18).map((cohort) => {
                const size = grid[cohort]?.[0]?.cohort_size ?? 0;
                return (
                  <tr key={cohort}>
                    <td className="p-1.5 pr-3 text-gray-600 font-medium whitespace-nowrap">{cohort}</td>
                    <td className="p-1.5 text-center text-gray-500">{size}</td>
                    {Array.from({ length: maxMonth + 1 }, (_, m) => {
                      const cell = grid[cohort]?.[m];
                      const pct = cell?.retention_pct ?? 0;
                      return (
                        <td key={m} title={cell ? `${pct}% (${cell.active_customers} customers)` : 'No data'}
                          className="p-0">
                          <div
                            className="w-10 h-7 flex items-center justify-center rounded text-white font-medium"
                            style={{
                              backgroundColor: cell ? colorForPct(pct) : '#f9fafb',
                              color: pct >= 35 ? '#fff' : '#374151',
                            }}>
                            {cell ? `${pct}%` : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
