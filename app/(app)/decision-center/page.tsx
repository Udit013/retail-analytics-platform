import DecisionCenter from '@/components/intelligence/DecisionCenter';

export const metadata = { title: 'Decision Center · RetailNexa AI' };

export default function DecisionCenterPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Decision Center</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          The &quot;what should I do next&quot; layer — ranked decisions synthesized from forecasting,
          customer intelligence, inventory optimization, and root-cause analysis, each with an
          expected outcome and confidence score.
        </p>
      </div>
      <DecisionCenter />
    </div>
  );
}
