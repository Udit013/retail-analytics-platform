'use client';
import { useEffect, useState } from 'react';

interface InventoryRow {
  product_id: string;
  product_name: string;
  category: string;
  stock: number;
  reorder_point: number;
  daily_velocity: number;
  days_of_stock: number | null;
  health: string;
}

const HEALTH_STYLE: Record<string, string> = {
  out_of_stock: 'bg-red-100 text-red-700 border border-red-200',
  critical: 'bg-orange-100 text-orange-700 border border-orange-200',
  low: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  ok: 'bg-green-100 text-green-700 border border-green-200',
};

const HEALTH_LABEL: Record<string, string> = {
  out_of_stock: 'Out of Stock',
  critical: 'Critical',
  low: 'Low',
  ok: 'Healthy',
};

export default function InventoryTable() {
  const [data, setData] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/analytics/inventory')
      .then((r) => r.json())
      .then((d) => {
        setData(d.data || []);
        setLoading(false);
      });
  }, []);

  const displayed =
    filter === 'all' ? data : data.filter((r) => r.health === filter);

  const alertCount = data.filter((r) => r.health === 'critical' || r.health === 'out_of_stock').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Inventory Health</h2>
          {alertCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
              {alertCount} alerts
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {['all', 'out_of_stock', 'critical', 'low', 'ok'].map((h) => (
            <button key={h} onClick={() => setFilter(h)}
              className={`text-xs px-2 py-1 rounded capitalize ${filter === h ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {h === 'all' ? 'All' : h.replace('_', ' ')}
            </button>
          ))}
          <a href="/api/export?resource=inventory&format=csv" download
            className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
            Export
          </a>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left py-2 pr-3 font-medium">Product</th>
                <th className="text-left py-2 pr-3 font-medium">Category</th>
                <th className="text-right py-2 pr-3 font-medium">Stock</th>
                <th className="text-right py-2 pr-3 font-medium">Reorder At</th>
                <th className="text-right py-2 pr-3 font-medium">Daily Vel.</th>
                <th className="text-right py-2 pr-3 font-medium">Days Left</th>
                <th className="text-center py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayed.slice(0, 50).map((row) => (
                <tr key={row.product_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium text-gray-700 max-w-[200px] truncate">{row.product_name}</td>
                  <td className="py-2 pr-3 text-gray-500">{row.category}</td>
                  <td className="py-2 pr-3 text-right font-mono">{Number(row.stock).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right font-mono text-gray-400">{row.reorder_point}</td>
                  <td className="py-2 pr-3 text-right font-mono">{Number(row.daily_velocity).toFixed(2)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{row.days_of_stock ?? '—'}</td>
                  <td className="py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${HEALTH_STYLE[row.health] || ''}`}>
                      {HEALTH_LABEL[row.health] || row.health}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayed.length > 50 && (
            <p className="text-xs text-gray-400 text-center mt-2">Showing 50 of {displayed.length}</p>
          )}
        </div>
      )}
    </div>
  );
}
