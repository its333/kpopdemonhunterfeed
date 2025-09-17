import { NextRequest } from 'next/server';
import { cacheFlush } from '@/lib/cache';
import { getServerEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const { cacheRefreshToken } = getServerEnv();  const expected = cacheRefreshToken;
  if (expected && token !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const prefix = searchParams.get('prefix') ?? undefined;
  const result = await cacheFlush(prefix ?? undefined);

  return Response.json({ ok: true, prefix: prefix ?? null, ...result }, { headers: { 'Cache-Control': 'no-store' } });
}

