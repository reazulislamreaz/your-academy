import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  defaultPathForRole,
  isAdminAppPath,
  isLearnerAppPath,
  isPublicMarketingPath,
  type AppRole,
} from '@/lib/auth/role-routing';

const ACCESS = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
const REFRESH = process.env.REFRESH_COOKIE_NAME ?? 'refresh_token';

/** Soft-read JWT role for UX redirects only — API remains authz source of truth. */
function readAccessRole(token: string | undefined): AppRole | null {
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

/** Soft gate: cookie presence + role-based dashboard separation. */
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

  // Public marketing pages (Home, Preli bank, News, etc.) are never auth-gated.
  if (isPublicMarketingPath(pathname)) {
    return NextResponse.next();
  }

  const needsAuth = isLearnerAppPath(pathname) || isAdminAppPath(pathname);

  if (needsAuth && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Non-admins must not enter /admin UI (expired access falls through to AdminGate + API 403).
  if (isAdminAppPath(pathname) && role === 'USER') {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Admins must not enter learner / student dashboards.
  if (isLearnerAppPath(pathname) && role === 'ADMIN') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isAuthPage && hasSession && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = defaultPathForRole(role);
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
    '/practice',
    '/practice/:path*',
    '/results',
    '/results/:path*',
    '/subjects',
    '/subjects/:path*',
    '/quizzes',
    '/quizzes/:path*',
    '/daily-quiz',
    '/daily-quiz/:path*',
    '/model-tests',
    '/model-tests/:path*',
    '/exams',
    '/exams/:path*',
    '/previous-year',
    '/previous-year/:path*',
    '/admin',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
