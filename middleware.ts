import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const ADMIN_PATHS = ['/tables', '/etl'];
const PROTECTED_PATHS = ['/dashboard'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));
  const isAdmin = ADMIN_PATHS.some((p) => path.startsWith(p));

  if (!isProtected && !isAdmin) return NextResponse.next();

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({ headers: req.headers });
  } catch {
    // treat as unauthenticated
  }

  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (isAdmin && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/tables/:path*', '/etl/:path*'],
};
