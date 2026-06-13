'use client';
import { useEffect, useState } from 'react';

interface Sale { salesId:number; orderId:string; productId:string; sales:string; quantity:number; discount:string; profit:string; }

export default function SalesPage() {
  const [data, setData] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  useEffect(()=>{
    fetch('/api/sales').then(r=>r.json()).then(d=>{setData(d);setLoading(false);});
  },[]);

  const filtered = data.filter(s=>`${s.orderId} ${s.productId}`.toLowerCase().includes(search.toLowerCase()));
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const pages = Math.ceil(filtered.length/PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Sales</h1>
        <span className="text-sm text-gray-500">{data.length.toLocaleString()} line items</span>
      </div>
      <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search by order or product ID..."
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading?<div className="p-8 text-center text-gray-400 text-sm">Loading...</div>:(
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              {['ID','Order ID','Product ID','Sales','Qty','Discount','Profit'].map(h=>(
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map(s=>(
                <tr key={s.salesId} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-400">{s.salesId}</td>
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-600">{s.orderId}</td>
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-600">{s.productId}</td>
                  <td className="py-2.5 px-4 font-medium text-gray-800">${parseFloat(s.sales).toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-gray-600">{s.quantity}</td>
                  <td className="py-2.5 px-4 text-gray-600">{(parseFloat(s.discount)*100).toFixed(0)}%</td>
                  <td className={`py-2.5 px-4 font-medium ${parseFloat(s.profit)>=0?'text-green-600':'text-red-600'}`}>${parseFloat(s.profit).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages>1&&(<div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(page-1)} className="text-xs px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button disabled={page===pages} onClick={()=>setPage(page+1)} className="text-xs px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>)}
      </div>
    </div>
  );
}
