import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
const REFRESH = process.env.REFRESH_COOKIE_NAME ?? 'refresh_token';

/** Soft-read JWT role for UX redirects only — API remains authz source of truth. */
function readAccessRole(token: string | undefined): 'ADMIN' | 'USER' | null {
  if (!token) return null;
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { role?: string };
    return payload.role === 'ADMIN' ? 'ADMIN' : payload.role === 'USER' ? 'USER' : null;
  } catch {
    return null;
  }
}

function defaultAuthedPath(role: 'ADMIN' | 'USER' | null): string {
  return role === 'ADMIN' ? '/admin/dashboard' : '/home';
}

/** Soft gate: cookie presence only. API remains source of truth for authz. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get(ACCESS)?.value;
  const hasSession =
    Boolean(access) || Boolean(request.cookies.get(REFRESH)?.value);
  const role = readAccessRole(access);

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  const needsAuth =
    pathname.startsWith('/home') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/questions') ||
    pathname.startsWith('/bookmarks') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/admin');

  if (needsAuth && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Soft block: non-admin access tokens should not enter /admin UI.
  // Expired access + refresh-only sessions fall through to AdminGate + API 403.
  if (pathname.startsWith('/admin') && role === 'USER') {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isAuthPage && hasSession && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = defaultAuthedPath(role);
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/home',
    '/home/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/questions',
    '/questions/:path*',
    '/bookmarks',
    '/bookmarks/:path*',
    '/documents',
    '/documents/:path*',
    '/profile',
    '/profile/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
