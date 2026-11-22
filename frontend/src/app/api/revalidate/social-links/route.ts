import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { serverApiBase } from '@/lib/api/client';

/** Marketing routes that mount `(marketing)/layout` + SiteFooter. */
const MARKETING_PATHS = [
  '/',
  '/preli-question-bank',
  '/written-question-bank',
  '/model-test',
  '/exams',
  '/news',
  '/question-bank-categories',
  '/written-question-bank-categories',
  '/topic-categories',
  '/topic-base',
] as const;

/**
 * Admin-only on-demand purge of footer social-link caches.
 * Layouts use `tags: ['social-links']` + `cache: 'no-store'` on the fetch;
 * path revalidation clears any Full Route Cache wrapping those layouts.
 */
export async function POST() {
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  if (!cookieHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let meRes: Response;
  try {
    meRes = await fetch(`${serverApiBase()}/users/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 502 });
  }

  if (!meRes.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envelope = (await meRes.json()) as {
    success?: boolean;
    data?: { role?: string };
  };
  if (!envelope.success || envelope.data?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  revalidateTag('social-links');
  for (const path of MARKETING_PATHS) {
    revalidatePath(path, 'layout');
    revalidatePath(path, 'page');
  }

  return NextResponse.json({
    revalidated: true,
    tag: 'social-links',
    paths: MARKETING_PATHS,
  });
}
