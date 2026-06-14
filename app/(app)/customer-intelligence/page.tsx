import CustomerIntel from '@/components/intelligence/CustomerIntel';

export const metadata = { title: 'Customer Intelligence · RetailNexa AI' };

export default function CustomerIntelligencePage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          RFM segmentation, predicted 12-month customer lifetime value, and churn risk —
          with recommended actions for VIPs, at-risk accounts, and upsell opportunities.
        </p>
      </div>
      <CustomerIntel />
    </div>
  );
}
