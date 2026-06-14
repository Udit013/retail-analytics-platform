import Link from 'next/link';

const FEATURES = [
  { icon: '📊', title: 'Live KPI Dashboard', desc: 'Real-time KPI cards refreshing every 30s via SSE. Revenue, AOV, and return rate at a glance.' },
  { icon: '🤖', title: 'AI Weekly Summary', desc: 'Gemini generates plain-English insights: "Revenue up 12% driven by Electronics."' },
  { icon: '🎯', title: 'Cohort Retention', desc: 'Customer cohort heatmap showing month-N retention — identify your stickiest acquisition channels.' },
  { icon: '⚠️', title: 'Anomaly Detection', desc: 'Z-score outlier flagging on daily revenue surfaces unusual spikes or drops instantly.' },
  { icon: '📦', title: 'Inventory Health', desc: 'Turnover velocity, days-of-stock, and low-stock alerts across every SKU you track.' },
  { icon: '📁', title: 'ETL Pipeline', desc: 'CSV drag-drop ingest with dedup, type coercion, FK validation, and run logs.' },
];

const STACK = [
  ['Next.js', 'Full-stack React framework'],
  ['Neon PostgreSQL', 'Serverless Postgres'],
  ['Drizzle ORM', 'Type-safe SQL queries'],
  ['Recharts', 'Composable React charts'],
  ['better-auth', 'Email + password & RBAC'],
  ['Gemini', 'AI-generated insights'],
  ['Vercel', 'Zero-config deployment'],
  ['Tailwind CSS', 'Utility-first styling'],
];

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center font-sans">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-gray-900">📊 RetailAnalytics</span>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#stack" className="hover:text-gray-900">Stack</a>
            <Link href="/sign-in" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full bg-gradient-to-br from-indigo-900 via-indigo-700 to-purple-600 pt-32 pb-24 text-center text-white px-6">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Retail Analytics Platform
        </h1>
        <p className="mt-5 text-lg text-indigo-100 max-w-2xl mx-auto">
          A full-stack analytics platform — AI insights, cohort analysis, anomaly detection, and real-time KPI refresh on your own sales data.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sign-in"
            className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
            Open Dashboard
          </Link>
          <a href="https://github.com/Udit013/retail-analytics-platform" target="_blank" rel="noopener"
            className="px-6 py-3 border border-indigo-400 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
            View on GitHub
          </a>
        </div>

        <div className="mt-12 grid grid-cols-3 md:grid-cols-5 gap-6 max-w-3xl mx-auto">
          {[
            ['ETL', 'CSV ingest'],
            ['8', 'DB tables'],
            ['10+', 'Analytics views'],
            ['RBAC', 'Auth system'],
            ['AI', 'Gemini insights'],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold">{val}</div>
              <div className="text-indigo-200 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="w-full max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Features</h2>
        <p className="text-center text-gray-500 mb-12">Built end-to-end on an open-source stack.</p>
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
        <p className="text-indigo-200 mt-2 mb-6">Upload a CSV or add records directly — every chart updates from your live database.</p>
        <Link href="/sign-in"
          className="inline-block px-8 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
          Open Dashboard
        </Link>
      </section>

      <footer className="w-full py-6 text-center text-xs text-gray-400 border-t border-gray-200">
        Built by Udit013 · Open source on GitHub
      </footer>
    </main>
  );
}
