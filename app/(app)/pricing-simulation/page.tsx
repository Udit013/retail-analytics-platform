import PricingSim from '@/components/intelligence/PricingSim';

export const metadata = { title: 'Pricing & Promotion Simulation · RetailNexa AI' };

export default function PricingSimulationPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing &amp; Promotion Simulation</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Model price changes and promotions to see projected impact on units, revenue, profit,
          and margin before you commit — using price-elasticity of demand on your real baselines.
        </p>
      </div>
      <PricingSim />
    </div>
  );
}
