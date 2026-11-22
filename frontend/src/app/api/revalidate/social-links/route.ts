import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { serverApiBase } from '@/lib/api/client';

/**
 * Admin-only on-demand purge of footer social-link Data Cache.
 * Layouts across marketing use `tags: ['social-links']`.
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
  revalidatePath('/', 'layout');

  return NextResponse.json({
    revalidated: true,
    tag: 'social-links',
  });
}
