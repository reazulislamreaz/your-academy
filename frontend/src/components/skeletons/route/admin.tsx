import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PageHeaderSkeleton,
  SkBadge,
  SkButton,
  SkLine,
  SkPill,
  SkStatus,
  StatCardSkeletonExact,
} from '@/components/skeletons/primitives';

/** `/admin/dashboard` */
export function AdminDashboardPageSkeleton() {
  return (
    <SkStatus label="Loading admin overview…" className="space-y-8">
      <PageHeaderSkeleton withActions />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeletonExact key={i} />
        ))}
      </div>
      <section className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Surface key={i} className="flex flex-col justify-between gap-4 p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SkBadge />
                  <Skeleton className="h-7 w-10" />
                </div>
                <SkLine className="h-3.5 w-full" />
                <SkLine className="h-3.5 w-[80%]" />
              </div>
              <SkPill className="w-32" />
            </Surface>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Surface className="overflow-hidden p-0">
          <div className="min-w-0 w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-[var(--bg-desk)]">
                <tr>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <th key={i} className="px-3 py-3 sm:px-5">
                      <SkLine className="h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {Array.from({ length: 5 }).map((_, r) => (
                  <tr key={r}>
                    {Array.from({ length: 4 }).map((_, c) => (
                      <td key={c} className="px-3 py-3.5 sm:px-5">
                        <SkLine className={c === 0 ? 'h-3.5 w-40' : 'h-3.5 w-20'} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </section>
    </SkStatus>
  );
}

/** `/admin/users/[id]` — profile + stats + timelines. */
export function AdminUsersDetailPageSkeleton() {
  return (
    <SkStatus label="Loading user detail…" className="space-y-8">
      <PageHeaderSkeleton withActions />
      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="space-y-3 p-5">
          <SkLine className="h-3 w-20" />
          <div className="flex gap-2">
            <SkBadge />
            <SkBadge className="w-20" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-3">
              <SkLine className="h-3 w-20" />
              <SkLine className="h-3 w-28" />
            </div>
          ))}
        </Surface>
        <Surface className="space-y-3 p-5 lg:col-span-2">
          <SkLine className="h-3 w-28" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[12px] border border-[var(--line)] p-3 space-y-2">
                <SkLine className="h-3 w-16" />
                <Skeleton className="h-7 w-14" />
              </div>
            ))}
          </div>
        </Surface>
      </div>
      <Surface className="space-y-3 p-5">
        <SkLine className="h-3 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-2">
            <SkLine className="h-3.5 w-40" />
            <SkLine className="h-3.5 w-20" />
          </div>
        ))}
      </Surface>
    </SkStatus>
  );
}

/** `/admin/activity` — KPIs, online list, trends, event table. */
export function AdminActivityPageSkeleton() {
  return (
    <SkStatus label="Loading activity…" className="space-y-8">
      <PageHeaderSkeleton withActions />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeletonExact key={i} />
        ))}
      </div>
      <Surface className="p-5">
        <div className="flex flex-wrap gap-2">
          <SkBadge />
          <SkBadge className="w-20" />
          <SkBadge className="w-24" />
        </div>
      </Surface>
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="space-y-3 p-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-3 py-2">
              <div className="space-y-1.5">
                <SkLine className="h-3.5 w-32" />
                <SkLine className="h-3 w-28" />
              </div>
              <SkLine className="h-3 w-16" />
            </div>
          ))}
        </Surface>
        <Surface className="space-y-4 p-5">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <SkLine className="h-3 w-12" />
                <SkLine className="h-3 w-8" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </Surface>
      </div>
      <Surface className="space-y-3 p-5">
        <Skeleton className="h-5 w-36" />
        <div className="overflow-hidden rounded-[12px] border border-[var(--line)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-t border-[var(--line)] px-3 py-3 first:border-0">
              <SkLine className="h-3 w-28" />
              <SkBadge />
              <SkLine className="h-3 w-32" />
            </div>
          ))}
        </div>
      </Surface>
    </SkStatus>
  );
}

/** `/admin/users` — search + 6-col table. */
export function AdminUsersPageSkeleton() {
  return (
    <SkStatus label="Loading users…" className="space-y-6">
      <PageHeaderSkeleton />
      <Surface className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-11 w-full flex-1 rounded-[var(--radius)]" />
          <SkPill className="h-11 w-full sm:w-28" />
        </div>
      </Surface>
      <AdminUsersTableSkeleton />
    </SkStatus>
  );
}

export function AdminAuditTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="min-w-0 w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-[var(--bg-desk)]">
            <tr>
              {['When', 'Action', 'Entity', 'Actor'].map((h) => (
                <th key={h} className="px-4 py-3">
                  <SkLine className="h-3 w-14" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                <td className="px-4 py-3">
                  <SkLine className="h-3 w-28" />
                </td>
                <td className="px-4 py-3">
                  <SkBadge className="w-24" />
                </td>
                <td className="px-4 py-3">
                  <SkLine className="h-3 w-36" />
                </td>
                <td className="px-4 py-3">
                  <SkLine className="h-3 w-24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function AdminUsersTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="min-w-0 w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-[var(--bg-desk)]">
            <tr>
              {['User', 'Role', 'Status', 'Trial', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-3 sm:px-5">
                  <SkLine className="h-3 w-14" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                <td className="px-3 py-3.5 sm:px-5">
                  <div className="space-y-1.5">
                    <SkLine className="h-3.5 w-32" />
                    <SkLine className="h-3 w-44" />
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <SkBadge />
                </td>
                <td className="px-3 py-3.5">
                  <SkBadge className="w-[4.5rem]" />
                </td>
                <td className="px-3 py-3.5">
                  <SkLine className="h-3 w-20" />
                </td>
                <td className="px-3 py-3.5 sm:px-5">
                  <SkLine className="h-3 w-20" />
                </td>
                <td className="px-3 py-3.5 text-right sm:px-5">
                  <SkPill className="ml-auto h-9 w-24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[var(--line)] px-5 py-3">
        <SkLine className="h-3 w-40" />
      </div>
    </Surface>
  );
}

/** `/admin/questions` */
export function AdminQuestionsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  const list = (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Surface key={i} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 max-w-xl" />
            <div className="flex flex-wrap gap-2">
              <SkBadge />
              <SkBadge className="w-20" />
              <SkLine className="h-3 w-28" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SkPill className="h-9 w-20" />
            <SkPill className="h-9 w-20" />
          </div>
        </Surface>
      ))}
    </div>
  );

  if (omitHeader) {
    return <SkStatus label="Loading questions…">{list}</SkStatus>;
  }

  return (
    <SkStatus label="Loading questions…" className="space-y-8">
      <PageHeaderSkeleton withActions />
      <Surface className="flex flex-wrap items-center gap-3 p-4">
        <SkLine className="h-4 w-24" />
        <Skeleton className="h-10 w-40 rounded-[var(--radius)]" />
        <SkLine className="h-3 w-32 sm:ml-auto" />
      </Surface>
      {list}
    </SkStatus>
  );
}

/** `/admin/questions/new` + `/admin/questions/[id]` form. */
export function AdminQuestionFormPageSkeleton() {
  return (
    <SkStatus label="Loading question editor…" className="space-y-6">
      <PageHeaderSkeleton withActions />
      <Surface className="space-y-4 p-4 sm:p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkLine className="h-3.5 w-24" />
            <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
          </div>
        ))}
        <div className="space-y-2">
          <SkLine className="h-3.5 w-28" />
          <Skeleton className="min-h-28 w-full rounded-[var(--radius)]" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-11 flex-1 rounded-[var(--radius)]" />
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <SkButton className="w-28" />
          <SkButton className="w-24" />
        </div>
      </Surface>
    </SkStatus>
  );
}

/** `/admin/question-imports` hub. */
export function AdminBulkUploadPageSkeleton() {
  return (
    <SkStatus label="Loading bulk uploads…" className="space-y-6">
      <PageHeaderSkeleton withActions />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeletonExact key={i} />
        ))}
      </div>
      <Surface className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-36" />
          <SkLine className="h-4 w-24" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[12px] border border-[var(--line)] p-3 space-y-2">
              <div className="flex justify-between gap-2">
                <SkLine className="h-3.5 w-28" />
                <SkBadge />
              </div>
              <SkLine className="h-3 w-full" />
            </div>
          ))}
        </div>
      </Surface>
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkLine className="h-3 w-16" />
              <Skeleton className="h-10 w-full rounded-[var(--radius)]" />
            </div>
          ))}
        </div>
        <AdminBulkUploadTableSkeleton />
      </Surface>
    </SkStatus>
  );
}

export function AdminBulkUploadTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-w-0 w-full max-w-full overflow-x-auto rounded-[12px] border border-[var(--line)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--bg-desk)]">
          <tr>
            {Array.from({ length: 7 }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <SkLine className="h-3 w-14" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t border-[var(--line)]">
              <td className="px-3 py-3">
                <SkLine className="h-3.5 w-24" />
              </td>
              <td className="px-3 py-3">
                <SkLine className="h-3.5 w-40" />
              </td>
              <td className="px-3 py-3">
                <SkBadge />
              </td>
              <td className="px-3 py-3">
                <SkLine className="h-3.5 w-12" />
              </td>
              <td className="px-3 py-3">
                <SkLine className="h-3.5 w-12" />
              </td>
              <td className="px-3 py-3">
                <SkLine className="h-3.5 w-20" />
              </td>
              <td className="px-3 py-3">
                <SkPill className="h-8 w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** `/admin/question-imports/[id]` */
export function AdminBulkUploadDetailPageSkeleton() {
  return (
    <SkStatus label="Loading upload details…" className="space-y-4">
      <PageHeaderSkeleton withActions />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Surface key={i} className="space-y-2 p-4">
            <SkLine className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </Surface>
        ))}
      </div>
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <SkBadge />
            <SkBadge className="w-20" />
            <SkBadge className="w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SkPill className="h-9 w-28" />
            <SkPill className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-[12px]" />
      </Surface>
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <SkLine className="h-3.5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-40 rounded-[var(--radius)]" />
        </div>
        <AdminBulkPreviewTableSkeleton />
      </Surface>
    </SkStatus>
  );
}

export function AdminBulkPreviewTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-w-0 w-full max-w-full overflow-x-auto rounded-[12px] border border-[var(--line)]">
      <table className="min-w-[960px] w-full text-left text-sm">
        <thead className="bg-[var(--bg-desk)]">
          <tr>
            {Array.from({ length: 7 }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <SkLine className="h-3 w-12" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t border-[var(--line)] align-top">
              <td className="px-3 py-3">
                <SkLine className="h-4 w-6" />
              </td>
              <td className="px-3 py-3 space-y-2">
                <SkLine className="h-4 w-64" />
                <SkLine className="h-4 w-48" />
              </td>
              <td className="px-3 py-3 space-y-1.5">
                <SkLine className="h-3.5 w-40" />
                <SkLine className="h-3.5 w-36" />
                <SkLine className="h-3.5 w-44" />
                <SkLine className="h-3.5 w-32" />
              </td>
              <td className="px-3 py-3">
                <SkLine className="h-4 w-8" />
              </td>
              <td className="px-3 py-3 space-y-1.5">
                <SkLine className="h-3.5 w-24" />
                <SkLine className="h-3 w-20" />
              </td>
              <td className="px-3 py-3">
                <SkLine className="h-4 w-12" />
              </td>
              <td className="px-3 py-3">
                <SkBadge className="w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** `/admin/question-imports/new` wizard. */
export function AdminBulkUploadNewPageSkeleton() {
  return (
    <SkStatus label="Loading upload wizard…" className="space-y-6">
      <PageHeaderSkeleton />
      <ol className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="rounded-[14px] border border-[var(--line)] bg-white px-3 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <SkLine className="h-3 w-20" />
            </div>
            <SkLine className="mt-2 ml-8 h-3.5 w-full" />
          </li>
        ))}
      </ol>
      <Surface className="space-y-5 p-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <SkLine className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-[var(--line)] bg-[var(--bg-desk)] px-4 py-10">
          <Skeleton className="size-12 rounded-full" />
          <SkLine className="h-4 w-56" />
          <SkLine className="h-3.5 w-48" />
        </div>
        <SkButton className="w-36" />
      </Surface>
    </SkStatus>
  );
}

/** `/admin/practice-sets` */
export function AdminPracticeSetsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  const body = (
    <>
      {omitHeader ? null : (
        <Surface className="p-4">
          <Skeleton className="h-10 w-48 rounded-[var(--radius)]" />
        </Surface>
      )}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Surface key={i} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <SkBadge />
                <SkBadge className="w-20" />
              </div>
              <Skeleton className="h-4 w-56 max-w-full" />
              <SkLine className="h-3 w-40" />
            </div>
            <SkPill className="h-9 w-24" />
          </Surface>
        ))}
      </div>
    </>
  );

  return (
    <SkStatus
      label="Loading practice sets…"
      className={omitHeader ? 'space-y-2' : 'space-y-6'}
    >
      {omitHeader ? null : <PageHeaderSkeleton />}
      {body}
    </SkStatus>
  );
}

/** `/admin/categories` */
export function AdminCategoriesPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  const list = (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Surface key={i} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <SkLine className="h-3 w-28" />
            </div>
            <div className="flex gap-2">
              <SkPill className="h-9 w-20" />
              <SkPill className="h-9 w-20" />
            </div>
          </div>
          <div className="ml-4 space-y-2 border-l border-[var(--line)] pl-4">
            <SkLine className="h-3.5 w-36" />
            <SkLine className="h-3.5 w-32" />
          </div>
        </Surface>
      ))}
    </div>
  );

  return (
    <SkStatus label="Loading categories…" className={omitHeader ? undefined : 'space-y-6'}>
      {omitHeader ? null : <PageHeaderSkeleton withActions />}
      {list}
    </SkStatus>
  );
}

/** `/admin/news` */
export function AdminNewsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  const list = (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Surface key={i} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-md" />
            <div className="flex flex-wrap gap-2">
              <SkBadge />
              <SkLine className="h-3 w-28" />
            </div>
          </div>
          <SkPill className="h-9 w-20" />
        </Surface>
      ))}
    </div>
  );

  return (
    <SkStatus label="Loading news…" className={omitHeader ? undefined : 'space-y-6'}>
      {omitHeader ? null : <PageHeaderSkeleton withActions />}
      {list}
    </SkStatus>
  );
}

/** `/admin/news/[id]` */
export function AdminNewsEditPageSkeleton() {
  return (
    <SkStatus label="Loading news editor…" className="space-y-6">
      <PageHeaderSkeleton withActions />
      <Surface className="space-y-4 p-4 sm:p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkLine className="h-3.5 w-20" />
            <Skeleton
              className={
                i === 2 ? 'min-h-40 w-full rounded-[var(--radius)]' : 'h-11 w-full rounded-[var(--radius)]'
              }
            />
          </div>
        ))}
        <SkButton className="w-28" />
      </Surface>
      <Surface className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] p-3">
            <SkLine className="h-3.5 w-48" />
            <SkPill className="h-8 w-20" />
          </div>
        ))}
      </Surface>
    </SkStatus>
  );
}

/** `/admin/documents` */
export function AdminDocumentsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  const list = (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Surface key={i} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/2 max-w-sm" />
            <SkLine className="h-3 w-40" />
          </div>
          <div className="flex gap-2">
            <SkBadge />
            <SkPill className="h-9 w-20" />
          </div>
        </Surface>
      ))}
    </div>
  );

  if (omitHeader) {
    return <SkStatus label="Loading documents…">{list}</SkStatus>;
  }

  return (
    <SkStatus label="Loading documents…" className="space-y-6">
      <PageHeaderSkeleton withActions />
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkLine className="h-3.5 w-24" />
              <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
            </div>
          ))}
        </div>
        <SkButton className="w-32" />
      </Surface>
      {list}
    </SkStatus>
  );
}
