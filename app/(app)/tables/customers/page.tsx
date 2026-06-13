'use client';
import { useEffect, useState } from 'react';

interface Customer {
  customerId: string;
  customerName: string;
  segment: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  region: string;
}

const EMPTY: Partial<Customer> = {
  customerId: '', customerName: '', segment: '', country: 'United States',
  city: '', state: '', postalCode: '', region: '',
};

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/customers').then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ ...c }); setOpen(true); };

  const save = async () => {
    const method = editing ? 'PUT' : 'POST';
    await fetch('/api/customers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setOpen(false);
    load();
  };

  const del = async () => {
    await fetch(`/api/customers?customerId=${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  };

  const filtered = data.filter((c) =>
    `${c.customerName} ${c.city} ${c.segment}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          + Add Customer
        </button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..."
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['ID', 'Name', 'Segment', 'City', 'State', 'Region', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.slice(0, 100).map((c) => (
                <tr key={c.customerId} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-400">{c.customerId}</td>
                  <td className="py-2.5 px-4 font-medium text-gray-800">{c.customerName}</td>
                  <td className="py-2.5 px-4 text-gray-600">{c.segment}</td>
                  <td className="py-2.5 px-4 text-gray-600">{c.city}</td>
                  <td className="py-2.5 px-4 text-gray-600">{c.state}</td>
                  <td className="py-2.5 px-4 text-gray-600">{c.region}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 text-gray-600">Edit</button>
                      <button onClick={() => setDeleteId(c.customerId)} className="text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 text-red-600">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 100 && <p className="text-xs text-gray-400 text-center py-2">Showing 100 of {filtered.length}</p>}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">{editing ? 'Edit Customer' : 'New Customer'}</h2>
            {[
              ['customerId', 'Customer ID'], ['customerName', 'Name'], ['segment', 'Segment'],
              ['city', 'City'], ['state', 'State'], ['postalCode', 'Postal Code'],
              ['region', 'Region'], ['country', 'Country'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <input value={(form as Record<string, string>)[key] ?? ''} disabled={!!(editing && key === 'customerId')}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50" />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center">
            <p className="text-sm font-medium text-gray-800">Delete customer <span className="font-mono text-xs">{deleteId}</span>?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={del} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
