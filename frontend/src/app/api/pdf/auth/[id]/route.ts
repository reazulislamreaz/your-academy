import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

function apiOrigin(): string {
  return process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:5000';
}

/**
 * Authenticated PDF proxy — forwards cookies so JwtAuthGuard can authorize.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST' } }, { status: 400 });
  }

  try {
    const cookie = req.headers.get('cookie') ?? '';
    const upstream = await fetch(`${apiOrigin()}/api/v1/documents/${id}/file`, {
      headers: {
        Accept: 'application/pdf',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return new NextResponse(text || 'PDF unavailable', {
        status: upstream.status,
        headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'text/plain' },
      });
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/pdf';
    const length = upstream.headers.get('content-length');
    const headers = new Headers({
      'Content-Type': contentType.includes('pdf') ? 'application/pdf' : contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=60, no-transform',
      'X-Content-Type-Options': 'nosniff',
    });
    if (length) headers.set('Content-Length', length);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_FILE_UNAVAILABLE', message: 'PDF timed out' } },
      { status: 504 },
    );
  }
}
