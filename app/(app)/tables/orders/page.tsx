'use client';
import { useEffect, useState } from 'react';

interface Order { orderId:string; orderDate:string; shipDate:string; shipMode:string; customerId:string; status:string; }
const STATUS_STYLE:Record<string,string> = {completed:'bg-green-100 text-green-700',shipped:'bg-blue-100 text-blue-700',returned:'bg-orange-100 text-orange-700',cancelled:'bg-red-100 text-red-700'};

export default function OrdersPage() {
  const [data, setData] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch('/api/orders').then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  },[]);

  const filtered = data.filter(o=>`${o.orderId} ${o.customerId} ${o.status}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <span className="text-sm text-gray-500">{data.length.toLocaleString()} total</span>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..."
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading?<div className="p-8 text-center text-gray-400 text-sm">Loading...</div>:(
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              {['Order ID','Customer ID','Order Date','Ship Date','Ship Mode','Status'].map(h=>(
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.slice(0,100).map(o=>(
                <tr key={o.orderId} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-700">{o.orderId}</td>
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-400">{o.customerId}</td>
                  <td className="py-2.5 px-4 text-gray-600">{o.orderDate}</td>
                  <td className="py-2.5 px-4 text-gray-600">{o.shipDate}</td>
                  <td className="py-2.5 px-4 text-gray-600">{o.shipMode}</td>
                  <td className="py-2.5 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[o.status]||'bg-gray-100 text-gray-600'}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length>100&&<p className="text-xs text-gray-400 text-center py-2">Showing 100 of {filtered.length}</p>}
      </div>
    </div>
  );
}
