'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  AdminCategoriesPageSkeleton,
  AdminChromeSkeleton,
  AdminDashboardPageSkeleton,
  AdminDocumentsPageSkeleton,
  AdminNewsPageSkeleton,
  AdminQuestionsPageSkeleton,
  AdminUsersPageSkeleton,
  PageHeaderSkeleton,
} from '@/components/skeletons';
import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';

function AdminRouteBodySkeleton({ pathname }: { pathname: string }) {
  if (pathname.startsWith('/admin/dashboard')) return <AdminDashboardPageSkeleton />;
  if (
    pathname.startsWith('/admin/question-bank-categories') ||
    pathname.startsWith('/admin/written-bank-categories') ||
    pathname.startsWith('/admin/topic-categories') ||
    pathname.startsWith('/admin/categories') ||
    pathname.startsWith('/admin/homepage')
  ) {
    return <AdminCategoriesPageSkeleton />;
  }
  if (pathname.startsWith('/admin/questions')) return <AdminQuestionsPageSkeleton />;
  if (pathname.startsWith('/admin/users')) return <AdminUsersPageSkeleton />;
  if (pathname.startsWith('/admin/documents')) return <AdminDocumentsPageSkeleton />;
  if (pathname.startsWith('/admin/news')) return <AdminNewsPageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeaderSkeleton withActions />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Surface key={i} className="space-y-3 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Surface>
        ))}
      </div>
    </div>
  );
}

/**
 * Client RBAC gate for the admin shell.
 * Non-admins are sent to the learner desk; API RolesGuard remains the security boundary.
 * While checking access, show full admin chrome so the page matches the real console.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname() || '/admin/dashboard';

  useEffect(() => {
    if (me.isLoading) return;
    if (isUnauthorized(me.error) || !me.data) {
      const next = pathname.startsWith('/admin') ? pathname : '/admin/dashboard';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (me.data.role !== 'ADMIN') {
      router.replace('/home');
    }
  }, [me.isLoading, me.error, me.data, router, pathname]);

  if (me.isLoading) {
    return (
      <AdminChromeSkeleton label="Opening admin console…">
        <AdminRouteBodySkeleton pathname={pathname} />
      </AdminChromeSkeleton>
    );
  }

  if (isUnauthorized(me.error) || !me.data) {
    return (
      <AdminChromeSkeleton label="Redirecting to sign in…">
        <AdminRouteBodySkeleton pathname={pathname} />
      </AdminChromeSkeleton>
    );
  }

  if (me.data.role !== 'ADMIN') {
    return (
      <AdminChromeSkeleton label="Redirecting…">
        <AdminRouteBodySkeleton pathname={pathname} />
      </AdminChromeSkeleton>
    );
  }

  return <>{children}</>;
}
