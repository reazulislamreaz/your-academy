import { AdminDashboardPageSkeleton } from '@/components/skeletons';

/** In-shell admin route transition — keep chrome, skeleton the body. */
export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-6">
      <AdminDashboardPageSkeleton />
    </div>
  );
}
