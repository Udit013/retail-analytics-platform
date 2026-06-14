'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  simulatePrice, simulatePromo, PROMOS, type Baseline, type ScenarioResult,
} from '@/lib/intelligence/pricing';

const money = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}K` : `$${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
};
const pctText = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const deltaColor = (n: number) => (n > 0.5 ? 'text-emerald-600' : n < -0.5 ? 'text-red-600' : 'text-gray-500');

export default function PricingSim() {
  const [scopes, setScopes] = useState<Baseline[]>([]);
  const [scopeId, setScopeId] = useState('all');
  const [pricePct, setPricePct] = useState(-10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intelligence/pricing').then((r) => r.json()).then((d) => {
      setScopes(d.scopes || []); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const base = useMemo(() => scopes.find((s) => s.id === scopeId) ?? scopes[0], [scopes, scopeId]);
  const priceScenario = useMemo(() => (base ? simulatePrice(base, pricePct) : null), [base, pricePct]);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading baselines…</div>;
  if (!base) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No pricing data.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">Scope</label>
        <select value={scopeId} onChange={(e) => setScopeId(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 min-w-[260px]">
          {scopes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">
          Base price {money(base.basePrice)} · {base.baseUnits.toLocaleString()} units/yr · elasticity {base.elasticity}
        </span>
      </div>

      {/* Price slider scenario */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Price change simulation</h3>
          <span className={`text-sm font-bold ${pricePct === 0 ? 'text-gray-500' : pricePct < 0 ? 'text-amber-600' : 'text-indigo-600'}`}>
            {pctText(pricePct)} price
          </span>
        </div>
        <input type="range" min={-40} max={40} step={1} value={pricePct}
          onChange={(e) => setPricePct(Number(e.target.value))} className="w-full accent-indigo-600" />
        <div className="flex justify-between text-[11px] text-gray-400 mb-4"><span>-40%</span><span>0</span><span>+40%</span></div>
        {priceScenario && <ScenarioGrid s={priceScenario} />}
      </div>

      {/* Promotion scenarios */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Promotion impact</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PROMOS.map((promo) => {
            const s = simulatePromo(base, promo);
            return (
              <div key={promo.id} className="rounded-lg border border-gray-200 p-3">
                <div className="font-semibold text-gray-800 text-sm">{promo.label}</div>
                <div className="text-[11px] text-gray-400 mb-2 h-7">{promo.note}</div>
                <Row label="Units" value={pctText(s.unitsDeltaPct)} color={deltaColor(s.unitsDeltaPct)} />
                <Row label="Revenue" value={pctText(s.revenueDeltaPct)} color={deltaColor(s.revenueDeltaPct)} />
                <Row label="Profit" value={pctText(s.profitDeltaPct)} color={deltaColor(s.profitDeltaPct)} />
                <Row label="Margin" value={`${s.newMarginPct}%`} color="text-gray-600" />
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Demand response uses constant price-elasticity (newUnits = baseUnits · (newPrice/basePrice)^elasticity · promo lift),
        with category-typical elasticities. Baselines are trailing-12-month actuals.
      </p>
    </div>
  );
}

function ScenarioGrid({ s }: { s: ScenarioResult }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="Units" base={`${s.newUnits.toLocaleString()}`} delta={s.unitsDeltaPct} />
      <Metric label="Revenue" base={money(s.newRevenue)} delta={s.revenueDeltaPct} />
      <Metric label="Profit" base={money(s.newProfit)} delta={s.profitDeltaPct} />
      <Metric label="Margin" base={`${s.newMarginPct}%`} delta={s.newMarginPct - s.baseMarginPct} isPts />
    </div>
  );
}

function Metric({ label, base, delta, isPts }: { label: string; base: string; delta: number; isPts?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900">{base}</div>
      <div className={`text-xs font-medium ${deltaColor(delta)}`}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}{isPts ? ' pts' : '%'} vs base
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
