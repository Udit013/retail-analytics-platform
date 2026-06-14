'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/decision-center', label: 'Decision Center' },
  { href: '/forecasting', label: 'Forecasting' },
  { href: '/customer-intelligence', label: 'Customer Intel' },
  { href: '/inventory-optimization', label: 'Inventory' },
  { href: '/pricing-simulation', label: 'Simulator' },
  { href: '/root-cause', label: 'Root Cause' },
  { href: '/etl', label: 'ETL Upload' },
  { href: '/tables/customers', label: 'Customers' },
  { href: '/tables/products', label: 'Products' },
  { href: '/tables/orders', label: 'Orders' },
  { href: '/tables/sales', label: 'Sales' },
];

export default function AppNav() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto h-14 px-4 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="font-bold text-gray-900 text-sm tracking-tight whitespace-nowrap">
          🧭 RetailNexa AI
        </Link>
        <nav className="flex-1 overflow-x-auto">
          <ul className="flex gap-1 text-sm">
            {navLinks.map(({ href, label }) => {
              const active = path === href || path.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link href={href}
                    className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                      active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
