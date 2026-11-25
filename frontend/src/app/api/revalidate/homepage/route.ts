import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { serverApiBase } from '@/lib/api/client';

const HOMEPAGE_PATHS = [
  '/',
  '/question-bank-categories',
  '/topic-categories',
  '/written-question-bank-categories',
  // DEC-069 — pages whose header / footer text lives in the homepage CMS.
  '/preli-question-bank',
  '/written-question-bank',
  '/model-test',
  '/exams',
  '/news',
  '/packages',
] as const;

/**
 * Admin-only on-demand purge of homepage Data Cache + ISR paths.
 * Called after Nest publish so `/` shows the new published payload immediately
 * instead of waiting for the 60s `revalidate` window.
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

  // Expire immediately so the next homepage render blocks on fresh Nest data.
  // (Single-arg form is correct for Next 15.2; later Next versions may take a profile.)
  revalidateTag('homepage');
  for (const path of HOMEPAGE_PATHS) {
    revalidatePath(path, 'page');
    revalidatePath(path, 'layout');
  }

  return NextResponse.json({
    revalidated: true,
    tag: 'homepage',
    paths: HOMEPAGE_PATHS,
    now: Date.now(),
  });
}
