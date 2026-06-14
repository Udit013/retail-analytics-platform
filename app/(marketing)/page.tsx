import Link from 'next/link';

const FEATURES = [
  { icon: '🧭', title: 'Decision Center', desc: 'Per-KPI current state, forecast, risks, and ranked recommendations with confidence scores — the "what should I do next" layer.' },
  { icon: '📈', title: 'Forecasting', desc: 'Revenue, orders, demand, and customer-growth forecasts (30/90/365 days) with confidence intervals, trend, and seasonality.' },
  { icon: '🔍', title: 'Root Cause Analysis', desc: 'When a KPI shifts, the engine decomposes it across product mix, churn, region, returns, and seasonality with confidence-scored causes.' },
  { icon: '👥', title: 'Customer Intelligence', desc: 'Predicted CLV, churn risk, and RFM segments — surfacing VIPs, at-risk accounts, and upsell opportunities.' },
  { icon: '📦', title: 'Inventory Optimization', desc: 'Stock-out & overstock risk, reorder quantities, safety stock, and carrying-cost estimates per SKU.' },
  { icon: '🧪', title: 'Pricing & Promo Simulation', desc: 'Model price, discount, and promotion scenarios and see projected revenue, profit, demand, and margin impact.' },
  { icon: '🤖', title: 'AI Business Analyst', desc: 'Ask questions in plain English. Answered by a local open-source model (Ollama) over your analytics — private, free, no external API.' },
  { icon: '📁', title: 'ETL Pipeline', desc: 'CSV drag-drop ingest with dedup, type coercion, FK validation, and run logs — runs entirely on your own data.' },
];

const STACK = [
  ['Next.js', 'Full-stack React framework'],
  ['Neon PostgreSQL', 'Serverless Postgres'],
  ['Drizzle ORM', 'Type-safe SQL queries'],
  ['Recharts', 'Composable React charts'],
  ['Ollama', 'Local open-source LLMs'],
  ['Forecasting', 'TS stats · optional Prophet/LightGBM'],
  ['Vercel', 'Zero-config deployment'],
  ['Tailwind CSS', 'Utility-first styling'],
];

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center font-sans">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-gray-900">🧭 RetailNexa AI</span>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#stack" className="hover:text-gray-900">Stack</a>
            <Link href="/dashboard" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Open App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full bg-gradient-to-br from-indigo-900 via-indigo-700 to-purple-600 pt-32 pb-24 text-center text-white px-6">
        <p className="text-indigo-200 text-sm font-medium mb-4 uppercase tracking-widest">Decision Intelligence Platform</p>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          RetailNexa AI
        </h1>
        <p className="mt-5 text-lg text-indigo-100 max-w-2xl mx-auto">
          Goes beyond dashboards: <span className="font-semibold text-white">data → insight → recommendation → simulation → decision</span>. Forecasting, root-cause analysis, and scenario modeling on your own retail data — powered by open-source AI.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard"
            className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
            Open App
          </Link>
          <a href="https://github.com/Udit013/retail-analytics-platform" target="_blank" rel="noopener"
            className="px-6 py-3 border border-indigo-400 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
            View on GitHub
          </a>
        </div>

        <div className="mt-12 grid grid-cols-3 md:grid-cols-5 gap-6 max-w-3xl mx-auto">
          {[
            ['Forecast', '30/90/365 days'],
            ['Root Cause', 'KPI decomposition'],
            ['Simulate', 'Price & promo'],
            ['Decide', 'Ranked actions'],
            ['Local AI', 'Ollama · free'],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold">{val}</div>
              <div className="text-indigo-200 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="w-full max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">From dashboards to decisions</h2>
        <p className="text-center text-gray-500 mb-12">An open-source decision intelligence stack — 100% free to run.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section id="stack" className="w-full bg-gray-900 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-10">Tech Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STACK.map(([name, desc]) => (
              <div key={name} className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                <div className="font-semibold text-white text-sm">{name}</div>
                <div className="text-gray-400 text-xs mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full bg-indigo-600 py-16 text-center text-white px-6">
        <h2 className="text-2xl font-bold">Turn your sales data into decisions</h2>
        <p className="text-indigo-200 mt-2 mb-6">Upload a CSV or add records directly — forecasts, risks, and recommendations update from your live database.</p>
        <Link href="/dashboard"
          className="inline-block px-8 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
          Open App
        </Link>
      </section>

      <footer className="w-full py-6 text-center text-xs text-gray-400 border-t border-gray-200">
        Built by Udit013 · Open source on GitHub · Runs on free tiers & local open-source AI
      </footer>
    </main>
  );
}
