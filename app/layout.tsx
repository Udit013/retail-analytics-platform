import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RetailNexa AI — Decision Intelligence Platform',
  description: 'Open-source decision intelligence for retail: forecasting, root-cause analysis, customer & inventory intelligence, scenario simulation, and a local-AI business analyst.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
