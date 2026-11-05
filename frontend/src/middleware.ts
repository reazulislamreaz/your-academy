import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
const REFRESH = process.env.REFRESH_COOKIE_NAME ?? 'refresh_token';

/** Soft gate: cookie presence only. API remains source of truth for authz. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    Boolean(request.cookies.get(ACCESS)?.value) ||
    Boolean(request.cookies.get(REFRESH)?.value);

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

  if (isAuthPage && hasSession && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
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
