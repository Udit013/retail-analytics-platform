import KpiCards from '@/components/dashboard/KpiCards';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ProductChart from '@/components/dashboard/ProductChart';
import CohortHeatmap from '@/components/dashboard/CohortHeatmap';
import InventoryTable from '@/components/dashboard/InventoryTable';
import AnomalyAlerts from '@/components/dashboard/AnomalyAlerts';
import AiInsights from '@/components/dashboard/AiInsights';
import AovChart from '@/components/dashboard/AovChart';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time insights across your sales, inventory, and customers</p>
      </div>

      <KpiCards />

      <AiInsights />

      <AnomalyAlerts />

      <RevenueChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductChart />
        <CohortHeatmap />
      </div>

      <AovChart />

      <InventoryTable />
    </div>
  );
}
