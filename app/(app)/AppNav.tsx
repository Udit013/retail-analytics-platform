'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';

export default function AppNav() {
  const { data: session } = useSession();
  const path = usePathname();
  const role = (session?.user as Record<string, unknown>)?.role as string;
  const isAdmin = role === 'admin';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', always: true },
    { href: '/etl', label: 'ETL Upload', always: false },
    { href: '/tables/customers', label: 'Customers', always: false },
    { href: '/tables/products', label: 'Products', always: false },
    { href: '/tables/orders', label: 'Orders', always: false },
    { href: '/tables/sales', label: 'Sales', always: false },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto h-14 px-4 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="font-bold text-gray-900 text-sm tracking-tight whitespace-nowrap">
          📊 RetailAnalytics
        </Link>
        <nav className="flex-1 overflow-x-auto">
          <ul className="flex gap-1 text-sm">
            {navLinks.map(({ href, label, always }) => {
              if (!always && !isAdmin) return null;
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
        <div className="flex items-center gap-2 shrink-0">
          {session && (
            <>
              <span className="text-xs text-gray-500 hidden sm:block">
                {session.user.name} · <span className="capitalize font-medium">{role}</span>
              </span>
              <button onClick={() => signOut()}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50">
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
