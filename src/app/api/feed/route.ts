import { NextRequest } from 'next/server';
import { fetchFeed } from '@/lib/providers';
import type { FeedType, SortType } from '@/lib/types';
import { getFeedLimit } from '@/lib/feedLimits';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'all') as FeedType;
    const sort = (searchParams.get('sort') || 'popular') as SortType;
    const requested = Number(searchParams.get('limit') || '0');
    const cursor = searchParams.get('cursor');

    const limitCap = getFeedLimit(type);
    const sanitizedRequest = Number.isFinite(requested) && requested > 0 ? requested : limitCap;
    const effectiveLimit = type === 'all'
      ? limitCap
      : Math.min(limitCap, Math.max(1, sanitizedRequest));

    const result = await fetchFeed({ type, sort, limit: effectiveLimit, cursor });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ items: [], nextCursor: null }, { headers: { 'Cache-Control': 'no-store' }, status: 200 });
  }
}

