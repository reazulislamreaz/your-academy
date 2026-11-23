import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { serverApiBase } from '@/lib/api/client';
import { hasPermission } from '@your-academy/shared';

const MODEL_TEST_PATHS = ['/model-test'] as const;

/**
 * Admin-only on-demand purge for Model Test listing guide CMS.
 * Called after Nest guide save so `/model-test` reflects edits immediately.
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
  if (!envelope.success || !hasPermission(envelope.data?.role, 'modelTest')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  revalidateTag('model-test-guide');
  for (const path of MODEL_TEST_PATHS) {
    revalidatePath(path, 'page');
    revalidatePath(path, 'layout');
  }

  return NextResponse.json({
    revalidated: true,
    tag: 'model-test-guide',
    paths: MODEL_TEST_PATHS,
    now: Date.now(),
  });
}
