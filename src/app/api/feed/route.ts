import { NextRequest } from 'next/server';
import { fetchFeed } from '@/lib/providers';
import type { FeedType, SortType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'all') as FeedType;
    const sort = (searchParams.get('sort') || 'popular') as SortType;
    const requestLimit = Number(searchParams.get('limit') || '10');
    const cursor = searchParams.get('cursor');

    const effectiveLimit =
      type === 'article' ? 50 :
      type === 'product' ? 50 :
      type === 'video' ? 25 :
      type === 'all' ? 125 :
      Math.min(10, Math.max(1, requestLimit));
    const result = await fetchFeed({ type, sort, limit: effectiveLimit, cursor });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ items: [], nextCursor: null }, { headers: { 'Cache-Control': 'no-store' }, status: 200 });
  }
}


