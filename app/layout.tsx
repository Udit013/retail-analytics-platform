import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retail Analytics Platform',
  description: 'Full-stack retail analytics with AI insights, cohort analysis, and real-time KPIs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
