'use client';
import { useState, useRef } from 'react';

interface EtlResult {
  inserted: number;
  total: number;
  errors: string[];
}

export default function EtlPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<EtlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/etl/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) setFile(f);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ETL Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload a Superstore-format CSV to ingest into the database.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}`}>
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="text-4xl mb-3">{file ? '📄' : '⬆️'}</div>
        {file ? (
          <p className="text-sm font-medium text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">Drop your CSV here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Superstore format: Order ID, Customer ID, Product ID, Sales, Quantity…</p>
          </>
        )}
      </div>

      {file && (
        <button onClick={handleUpload} disabled={loading}
          className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {loading ? 'Processing...' : 'Run ETL Pipeline'}
        </button>
      )}

      {result && (
        <div className={`rounded-xl border p-5 ${result.errors?.length ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
          <h3 className="font-semibold text-sm text-gray-800 mb-3">ETL Complete</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{result.total}</div>
              <div className="text-xs text-gray-500">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{result.inserted}</div>
              <div className="text-xs text-gray-500">Inserted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{result.total - result.inserted}</div>
              <div className="text-xs text-gray-500">Skipped / Errors</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-yellow-100 rounded p-3">
              <p className="text-xs font-medium text-yellow-800 mb-1">Errors (first 10):</p>
              <ul className="text-xs text-yellow-700 space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-sm text-gray-800 mb-2">Expected CSV Columns</h3>
        <div className="grid grid-cols-3 gap-1 text-xs font-mono text-gray-500">
          {['Row ID','Order ID','Order Date','Ship Date','Ship Mode','Customer ID','Customer Name','Segment','Country','City','State','Postal Code','Region','Product ID','Category','Sub-Category','Product Name','Sales','Quantity','Discount','Profit'].map((c) => (
            <span key={c} className="bg-gray-50 px-2 py-0.5 rounded">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
