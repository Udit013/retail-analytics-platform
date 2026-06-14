import ReportGenerator from '@/components/intelligence/ReportGenerator';

export const metadata = { title: 'Executive Reports · RetailNexa AI' };

export default function ReportsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate a weekly, monthly, or quarterly executive summary — KPIs, trends, and
          recommended decisions — and download it as a PDF.
        </p>
      </div>
      <ReportGenerator />
    </div>
  );
}
