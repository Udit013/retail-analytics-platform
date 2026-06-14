import AiAnalyst from '@/components/intelligence/AiAnalyst';

export const metadata = { title: 'AI Business Analyst · RetailNexa AI' };

export default function AiAnalystPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Business Analyst</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ask questions in plain English and get answers grounded in your analytics — powered by a
          local open-source model (Ollama), with a deterministic analyst fallback.
        </p>
      </div>
      <AiAnalyst />
    </div>
  );
}
