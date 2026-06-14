import RootCause from '@/components/intelligence/RootCause';

export const metadata = { title: 'Root Cause Analysis · RetailNexa AI' };

export default function RootCausePage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Root Cause Analysis</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Automatically decomposes revenue change across category, region, segment, returns,
          churn, and pricing — ranking the most likely causes with confidence and recommended actions.
        </p>
      </div>
      <RootCause />
    </div>
  );
}
